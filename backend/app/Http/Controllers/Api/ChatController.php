<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class ChatController extends Controller
{
    protected $allowedRooms = ['tourist', 'resort', 'enterprise', 'admin'];
    protected string $groqModel = 'groq/compound-mini';
    
    // Response cache duration (5 minutes)
    protected int $cacheDuration = 300;
    
    // Conversation memory limit
    protected int $memoryLimit = 5;

    public function index(Request $request)
    {
        $room = $request->query('room', 'tourist');
        if (!in_array($room, $this->allowedRooms)) {
            return response()->json(['message' => 'Invalid chat room'], 422);
        }

        $authUser = $request->user();
        $userId = $authUser->id ?? null;

        $history = $this->readHistory($userId, $room);
        $filtered = array_values(array_filter($history, function ($m) use ($room) {
            return ($m['room'] ?? null) === $room;
        }));

        return response()->json(['messages' => $filtered]);
    }

    public function send(Request $request)
    {
        $data = $request->validate([
            'room' => 'required|string|in:tourist,resort,enterprise,admin',
            'message' => 'required|string|max:2000',
            'language' => 'nullable|string|in:filipino,english',
        ]);

        $room = $data['room'];
        $message = $data['message'];
        $language = $data['language'] ?? 'filipino';

        // Get authenticated user
        $authUser = $request->user();
        $userName = $authUser->name ?? null;
        $userId = $authUser->id ?? null;

        $history = $this->readHistory($userId, $room);

        $userMessage = [
            'id' => Str::uuid()->toString(),
            'room' => $room,
            'sender' => 'user',
            'message' => $message,
            'created_at' => now()->toDateTimeString(),
        ];

        $history[] = $userMessage;

        // Track analytics
        $this->trackQuestion($room, $message, $userId);

        $botReplyText = $this->generateReply($message, $room, $userName, $userId, $language);

        $botMessage = [
            'id' => Str::uuid()->toString(),
            'room' => $room,
            'sender' => 'bot',
            'message' => $botReplyText,
            'created_at' => now()->toDateTimeString(),
        ];

        $history[] = $botMessage;

        $this->writeHistory($history, $userId, $room);
        
        // Store in conversation memory
        $this->addToConversationMemory($room, $userId, $message, $botReplyText);

        return response()->json(['reply' => $botMessage, 'user_message' => $userMessage]);
    }
    
    /**
     * Feedback endpoint for thumbs up/down
     */
    public function feedback(Request $request)
    {
        $data = $request->validate([
            'message_id' => 'required|string',
            'rating' => 'required|in:up,down',
            'feedback_text' => 'nullable|string|max:500',
        ]);
        
        // Store feedback in cache or database
        $feedbackKey = "chat_feedback:{$data['message_id']}";
        Cache::put($feedbackKey, [
            'rating' => $data['rating'],
            'feedback_text' => $data['feedback_text'] ?? null,
            'created_at' => now()->toDateTimeString(),
        ], 86400); // 24 hours
        
        Log::info('Chat feedback received', $data);
        
        return response()->json(['message' => 'Salamat sa feedback!']);
    }

    protected function knowledgeBase(): array
    {
        $path = resource_path('faqs.json');
        if (!file_exists($path)) {
            return [];
        }
        $json = file_get_contents($path);
        return json_decode($json, true) ?? [];
    }
    
    protected function generateReply(string $text, string $room, ?string $userName = null, ?int $userId = null, string $language = 'filipino'): string
    {
        // Check response cache first
        $cacheKey = "chat_response:" . md5($room . ':' . $language . ':' . strtolower(trim($text)));
        $cached = Cache::get($cacheKey);
        if ($cached) {
            Log::info('Cache hit for query', ['query' => $text, 'language' => $language]);
            $this->trackCacheHit($room);
            return $cached;
        }
        
        $kb = $this->knowledgeBase();
        $entries = $kb[$room] ?? [];

        if (empty($entries)) {
            return $language === 'filipino' 
                ? "Pasensya na, wala akong sapat na impormasyon para rito. Ipapaabot namin ang iyong tanong sa support."
                : "Sorry, I don't have enough information for this. We'll forward your question to support.";
        }

        // Quick greeting detection
        $clean = $this->normalize($text);
        $cleanWords = preg_split('/\s+/', $clean, -1, PREG_SPLIT_NO_EMPTY);
        
        $greetingsFil = ['kumusta','kamusta','hello','hi','hey','magandang umaga','magandang hapon','magandang gabi','musta','kumusta po','kumusta ka'];
        $greetingsEng = ['hello','hi','hey','good morning','good afternoon','good evening','how are you','what\'s up','sup'];
        $greetings = $language === 'filipino' ? $greetingsFil : array_merge($greetingsFil, $greetingsEng);
        
        if (is_array($cleanWords) && count($cleanWords) <= 3) {
            foreach ($greetings as $g) {
                if (strpos($clean, $this->normalize($g)) !== false) {
                    $name = $userName ? $userName : ($language === 'filipino' ? 'Kaibigan' : 'Friend');
                    $greeting = $this->getTimeBasedGreeting($language);
                    $helpText = $language === 'filipino' ? 'Paano kita matutulungan ngayon?' : 'How can I help you today?';
                    return "{$greeting}, {$name}! {$helpText}";
                }
            }
        }

        // Skip TF-IDF pre-filtering — let Groq AI handle all questions with the full FAQ as context
        $bestAnswer = null; // kept only as last-resort fallback


        // Use Groq AI FIRST — gives most accurate, contextual answers
        $groqKey = env('GROQ_API_KEY') ?: config('services.groq.key');
        $groqModel = env('GROQ_MODEL') ?: config('services.groq.model') ?: 'groq/compound-mini';
        $groqUrl = env('GROQ_API_URL') ?: config('services.groq.url') ?: 'https://api.groq.com';

        if (!empty($groqKey)) {
            try {
                $conversationContext = $this->getConversationContext($room, $userId);
                $ai = $this->callGroq($text, $room, $entries, $groqKey, $groqModel, $groqUrl, $conversationContext, $language);
                if (!empty($ai)) {
                    Cache::put($cacheKey, $ai, $this->cacheDuration);
                    return $ai;
                }
            } catch (\Throwable $ex) {
                Log::warning('Groq call failed: ' . $ex->getMessage());
            }
        }

        // Live Database Query Fallback
        $dbAnswer = $this->generateDatabaseBackedAnswer($text, $language);
        if ($dbAnswer) {
            Cache::put($cacheKey, $dbAnswer, $this->cacheDuration);
            return $dbAnswer;
        }

        return $language === 'filipino'
            ? "Pasensya na, ako ay isang **Mansalay Tourism Assistant** na nakalaan lamang para sa mga tanong tungkol sa Mansalay, Oriental Mindoro—tulad ng aming mga pasyalan, resorts, lokal na produkto, pista, at interactive map. May maitutulong ba ako tungkol sa iyong pagbisita sa Mansalay?"
            : "I apologize, but I am the **Mansalay Tourism Assistant** dedicated specifically to inquiries about Mansalay, Oriental Mindoro—such as our attractions, resorts, local products, events, and interactive map. How may I help you with your Mansalay travel plans?";
    }

    protected function generateDatabaseBackedAnswer(string $text, string $language = 'filipino'): ?string
    {
        $lower = mb_strtolower($text, 'UTF-8');

        // 1. Check for Beach / Attractions
        if (preg_match('/\b(spot|spots|attraction|attractions|pasyalan|beach|dagat|buktot|bundok|mountain|falls|cave|kweba|melzar|mangyan|sanctuary|pgd|ilog|river|cabaglat|lugar)\b/ui', $lower)) {
            try {
                $attractions = \App\Models\Attraction::take(6)->get();
                if ($attractions->count() > 0) {
                    $reply = $language === 'filipino'
                        ? "**🏖️ Mga Sikat na Pasyalan at Tourist Spots sa Mansalay:**\n\n"
                        : "**🏖️ Top Tourist Spots & Attractions in Mansalay:**\n\n";

                    foreach ($attractions as $att) {
                        $desc = mb_substr(trim(strip_tags($att->description ?? '')), 0, 110);
                        $reply .= "• **{$att->name}**" . ($att->category ? " ({$att->category})" : "") . ($desc ? " — {$desc}..." : "") . "\n";
                    }
                    $reply .= $language === 'filipino'
                        ? "\n*Tingnan ang **Attractions** page para sa kumpletong larawan, detalye, at lokasyon sa mapa!*"
                        : "\n*Visit the **Attractions** page for full photos, descriptions, and interactive map locations!*";
                    return $reply;
                }
            } catch (\Throwable $e) {}
        }

        // 2. Check for Resorts / Stays / Accommodations
        if (preg_match('/\b(resort|resorts|hotel|tulugan|stay|stays|matutulugan|room|kwarto|hiraya|glamping|mahalta|presyo ng room|rate|accommodat|tulog)\b/ui', $lower)) {
            try {
                $resorts = \App\Models\Accommodation::take(6)->get();
                if ($resorts->count() > 0) {
                    $reply = $language === 'filipino'
                        ? "**🏨 Mga Matutulugang Resort at Akomodasyon sa Mansalay:**\n\n"
                        : "**🏨 Recommended Resorts & Stays in Mansalay:**\n\n";

                    foreach ($resorts as $r) {
                        $price = $r->price_per_night ? "₱" . number_format($r->price_per_night) . "/night" : "";
                        $desc = mb_substr(trim(strip_tags($r->description ?? '')), 0, 90);
                        $reply .= "• **{$r->name}**" . ($price ? " ({$price})" : "") . ($desc ? " — {$desc}..." : "") . "\n";
                    }
                    $reply .= $language === 'filipino'
                        ? "\n*Pumunta sa **Stays** page upang makita ang availability at direktang tawagan ang may-ari ng resort!*"
                        : "\n*Visit the **Stays** page to check live availability and connect directly with resort hosts!*";
                    return $reply;
                }
            } catch (\Throwable $e) {}
        }

        // 3. Check for Products / Souvenirs / AWATI
        if (preg_match('/\b(product|products|pasalubong|bili|mabili|craft|crafts|souvenir|delicacy|kakanin|honey|pukyutan|awati|basket|sukang tuba|banana chips|paninda)\b/ui', $lower)) {
            try {
                $products = \App\Models\Product::take(6)->get();
                if ($products->count() > 0) {
                    $reply = $language === 'filipino'
                        ? "**🎁 Mga Lokal na Produkto at Pasalubong sa Mansalay:**\n\n"
                        : "**🎁 Local Products & Pasalubong in Mansalay:**\n\n";

                    foreach ($products as $p) {
                        $price = $p->price ? "₱" . number_format($p->price) : "";
                        $reply .= "• **{$p->name}**" . ($price ? " — {$price}" : "") . ($p->category ? " ({$p->category})" : "") . "\n";
                    }
                    $reply .= $language === 'filipino'
                        ? "\n*Bisitahin ang **Products** page para makipag-ugnayan sa mga lokal na tindahan at sa AWATI Mangyan Artisans!*"
                        : "\n*Visit the **Products** page to contact local stores and AWATI Mangyan Artisans directly!*";
                    return $reply;
                }
            } catch (\Throwable $e) {}
        }

        // 4. Commute / Directions
        if (preg_match('/\b(paano pumunta|sakay|byahe|biyahe|direksyon|commute|how to get|bus|van|roro|barko|calapan|batangas|roxas)\b/ui', $lower)) {
            return $language === 'filipino'
                ? "**🚌 Gabay sa Pagpunta sa Mansalay, Oriental Mindoro:**\n\n" .
                  "1. **Mula Maynila / Batangas Port:**\n" .
                  "   • Sumakay ng bus patungong Batangas Port (PITX/Buendia/Cubao).\n" .
                  "   • Sumakay ng FastCat o RORO papuntang Calapan Port (approx. 2 oras).\n" .
                  "   • Mula Calapan, sumakay ng Van o Bus (ALPS / Ceres) patungong Mansalay (approx. 3 - 3.5 oras).\n\n" .
                  "2. **Via Roxas Dangay Port:**\n" .
                  "   • Kung galing Caticlan/Panay o Romblon via RORO papuntang Roxas, 15-20 minuto na lang ang layo papuntang Mansalay.\n\n" .
                  "3. **Via San Jose Airport:**\n" .
                  "   • Flight papuntang San Jose Airport, pagkatapos ay van patungong Mansalay (approx. 1.5 - 2 oras)."
                : "**🚌 How to Get to Mansalay, Oriental Mindoro:**\n\n" .
                  "1. **From Manila / Batangas:**\n" .
                  "   • Take a bus to Batangas Port from PITX, Buendia, or Cubao.\n" .
                  "   • Board a RORO or FastCat to Calapan Port (~2 hours).\n" .
                  "   • From Calapan, take a southward Van or Bus directly to Mansalay (~3 - 3.5 hours).\n\n" .
                  "2. **Via Roxas Dangay Port:**\n" .
                  "   • If arriving from Panay/Caticlan or Romblon to Roxas, Mansalay is just a 15-20 minute ride away.\n\n" .
                  "3. **Via San Jose Airport:**\n" .
                  "   • Commercial flight to San Jose Airport, followed by a 1.5 - 2 hr van ride to Mansalay.";
        }

        return null;
    }

    protected function callGroq(string $text, string $room, array $entries, string $apiKey, string $modelId = 'groq/compound-mini', string $apiUrl = 'https://api.groq.com', array $conversationContext = [], string $language = 'filipino'): ?string
    {
        // Build knowledge base context
        $kbText = $this->buildKnowledgeBaseContext($entries);
        
        // Enrich with database data
        $kbText .= $this->enrichWithDatabaseData();
        
        // Build system prompt
        $systemPrompt = $this->buildSystemPrompt($kbText, $room, $language);
        
        // Build messages with conversation context
        $messages = [
            ['role' => 'system', 'content' => $systemPrompt]
        ];
        
        // Add conversation history
        foreach ($conversationContext as $ctx) {
            $messages[] = ['role' => 'user', 'content' => $ctx['user']];
            $messages[] = ['role' => 'assistant', 'content' => $ctx['bot']];
        }
        
        // Add current question
        $messages[] = ['role' => 'user', 'content' => $text];
        
        $endpoint = rtrim($apiUrl, '/') . '/openai/v1/chat/completions';
        
        $modelsToTry = array_unique([$modelId, 'groq/compound-mini', 'openai/gpt-oss-20b', 'qwen/qwen3.6-27b']);
        
        foreach ($modelsToTry as $currentModel) {
            $payload = [
                'model' => $currentModel,
                'messages' => $messages,
                'temperature' => 0.2,
                'max_tokens' => 550,
                'top_p' => 0.9
            ];
            
            try {
                $startTime = microtime(true);
                
                $response = Http::withHeaders([
                    'Authorization' => "Bearer {$apiKey}",
                    'Content-Type' => 'application/json',
                ])->timeout(25)->post($endpoint, $payload);
                
                $responseTime = (microtime(true) - $startTime) * 1000;
                $this->trackResponseTime($room, $responseTime);
                
                if ($response->successful()) {
                    $json = $response->json();
                    if (!empty($json['choices'][0]['message']['content'])) {
                        $content = trim($json['choices'][0]['message']['content']);
                        
                        // Strip reasoning/think tags if present
                        if (stripos($content, '</think>') !== false) {
                            $parts = explode('</think>', $content);
                            $clean = trim(end($parts));
                        } elseif (stripos($content, '<think>') !== false) {
                            // Incomplete think tag - discard the think block
                            $clean = '';
                        } else {
                            $clean = $content;
                        }
                        
                        if (!empty($clean)) {
                            return $clean;
                        }
                    }
                }
                
                Log::warning("Groq attempt with {$currentModel} failed (status {$response->status()}), trying next model...");
                usleep(250000); // 250ms before trying next model
                
            } catch (\Throwable $ex) {
                Log::error("Groq error with {$currentModel}: " . $ex->getMessage());
            }
        }
        
        return null;
    }

    protected function buildKnowledgeBaseContext(array $entries): string
    {
        $context = "# Knowledge Base FAQs:\n";
        
        foreach (array_slice($entries, 0, 15) as $e) {
            $q = $e['question'] ?? '';
            $a = $e['answer'] ?? '';
            if ($q && $a) {
                $context .= "Q: {$q}\nA: {$a}\n\n";
            }
        }
        
        return $context;
    }

    protected function enrichWithDatabaseData(): string
    {
        $context = "";
        
        try {
            // Attractions
            if (class_exists(\App\Models\Attraction::class)) {
                $attractions = \App\Models\Attraction::select('name', 'location', 'category', 'description')
                    ->whereNotNull('name')
                    ->take(10)
                    ->get();
                
                if ($attractions->count() > 0) {
                    $context .= "## Mansalay Tourist Attractions & Destinations\n\n";
                    foreach ($attractions as $item) {
                        $name = $item->name ?? '';
                        $desc = trim(strip_tags($item->description ?? ''));
                        $loc = $item->location ?? '';
                        $cat = $item->category ?? '';
                        $context .= "• **{$name}**" . ($cat ? " ({$cat})" : "") . "\n";
                        if ($loc) $context .= "  Location: {$loc}\n";
                        if ($desc) $context .= "  Details: " . mb_substr($desc, 0, 120) . "...\n";
                        $context .= "\n";
                    }
                }
            }
        } catch (\Throwable $ex) {
            Log::debug('Attractions enrichment skipped: ' . $ex->getMessage());
        }
        
        try {
            // Accommodations / Stays
            if (class_exists(\App\Models\Accommodation::class)) {
                $accommodations = \App\Models\Accommodation::select('name', 'location', 'category', 'type', 'description', 'price_per_night', 'contact_number')
                    ->whereNotNull('name')
                    ->take(10)
                    ->get();
                
                if ($accommodations->count() > 0) {
                    $context .= "## Mansalay Accommodations & Stays\n\n";
                    foreach ($accommodations as $item) {
                        $name = $item->name ?? '';
                        $loc = $item->location ?? '';
                        $price = $item->price_per_night ?? '';
                        $contact = $item->contact_number ?? '';
                        $type = $item->type ?? $item->category ?? '';
                        $context .= "• **{$name}**" . ($type ? " ({$type})" : "") . "\n";
                        if ($loc) $context .= "  Location: {$loc}\n";
                        if ($price) $context .= "  Rate: ₱" . number_format((float)$price, 2) . "/night\n";
                        if ($contact) $context .= "  Contact: {$contact}\n";
                        $context .= "\n";
                    }
                }
            }
        } catch (\Throwable $ex) {
            Log::debug('Accommodations enrichment skipped: ' . $ex->getMessage());
        }
        
        try {
            // Products
            if (class_exists(\App\Models\Product::class)) {
                $products = \App\Models\Product::select('name', 'category', 'description', 'price')
                    ->whereNotNull('name')
                    ->take(10)
                    ->get();
                
                if ($products->count() > 0) {
                    $context .= "## Mansalay Products & Souvenirs\n\n";
                    foreach ($products as $item) {
                        $name = $item->name ?? '';
                        $price = $item->price ?? '';
                        $cat = $item->category ?? '';
                        $context .= "• **{$name}**" . ($cat ? " [{$cat}]" : "") . " — ₱" . number_format((float)$price, 2) . "\n";
                    }
                    $context .= "\n";
                }
            }
        } catch (\Throwable $ex) {
            Log::debug('Products enrichment skipped: ' . $ex->getMessage());
        }
        
        try {
            // Events
            if (class_exists(\App\Models\Event::class)) {
                $events = \App\Models\Event::select('name', 'location', 'category', 'date', 'description')
                    ->whereNotNull('name')
                    ->take(10)
                    ->get();
                
                if ($events->count() > 0) {
                    $context .= "## Mansalay Events & Festivals\n\n";
                    foreach ($events as $item) {
                        $name = $item->name ?? '';
                        $date = $item->date ? (is_string($item->date) ? $item->date : $item->date->format('Y-m-d')) : '';
                        $loc = $item->location ?? '';
                        $context .= "• **{$name}**" . ($date ? " (Date: {$date})" : "") . ($loc ? " at {$loc}" : "") . "\n";
                    }
                    $context .= "\n";
                }
            }
        } catch (\Throwable $ex) {
            Log::debug('Events enrichment skipped: ' . $ex->getMessage());
        }

        // Platform & Map Navigation Context
        $context .= "## Interactive Map & Platform Pages Guide\n\n";
        $context .= "• **Interactive Map Explore Page:** Matatagpuan sa 'Map' o 'Explore Map' tab. Dito makikita ang interactive map ng Mansalay na may pins para sa Beaches (Buktot, PGD Sanctuary), Mountains/Trails (Melzar Mountain), Cultural Sites (Mangyan Village, Burial Cave), Resorts, at Restaurants. Pwedeng i-filter ayon sa kategorya at pindutin ang pin para makita ang direksyon at detalye.\n";
        $context .= "• **Attractions Page:** Kumpletong gallery at profile ng bawat pasyalan sa Mansalay.\n";
        $context .= "• **Stays Page:** Listahan ng mga resort at matutulugan na may direct contact number, room photos, at pricing.\n";
        $context .= "• **Products Page:** Katutubong produkto ng AWATI, wild honey, banana chips, at souvenirs mula sa mga lokal na kooperatiba.\n";
        $context .= "• **Events Page:** Kalendaryo ng mga piyesta, kite flying festival, at cultural celebrations.\n";
        $context .= "• **Wishlist:** Pindutin ang Heart icon sa anumang listing para i-save sa personal wishlist.\n\n";
        
        return $context;
    }

    protected function buildSystemPrompt(string $kbText, string $room, string $language = 'filipino'): string
    {
        $roleContextFil = [
            'tourist' => 'Ikaw ang opisyal na Mansalay Tourism AI Assistant. Ang layunin mo ay tulungan ang mga turista sa pagtuklas ng Mansalay, Oriental Mindoro—kabilang ang mga tourist attractions, resorts/stays, katutubong produkto, mga pista/events, at ang interactive map.',
            'resort' => 'Ikaw ay tumutulong sa mga resort owners sa Mansalay para pamahalaan ang kanilang rooms, bookings, subscription, at profile sa Discover Mansalay platform.',
            'enterprise' => 'Ikaw ay tumutulong sa mga lokal na enterprise at artisans ng Mansalay sa pamamahala ng kanilang mga produkto, orders, at profile sa Discover Mansalay platform.',
            'admin' => 'Ikaw ay tumutulong sa Tourism Admin ng Mansalay sa pamamahala ng users, listings, subscriptions, at platform analytics.'
        ];
        
        $roleContextEng = [
            'tourist' => 'You are the official Mansalay Tourism AI Assistant. Your goal is to guide visitors exploring Mansalay, Oriental Mindoro—including tourist attractions, resorts/stays, local products, events/festivals, and the interactive map.',
            'resort' => 'You assist resort owners in Mansalay with managing their listings, rooms, bookings, and subscriptions on the Discover Mansalay platform.',
            'enterprise' => 'You assist local enterprises and artisans in Mansalay with managing their products, orders, and listings on the Discover Mansalay platform.',
            'admin' => 'You assist the Mansalay Tourism Admin in managing users, listings, subscriptions, and platform analytics.'
        ];
        
        $roleContext = $language === 'filipino' ? $roleContextFil : $roleContextEng;
        $context = $roleContext[$room] ?? $roleContext['tourist'];
        
        $greeting = $this->getTimeBasedGreeting($language);
        
        if ($language === 'filipino') {
            return <<<PROMPT
{$greeting}! Ikaw ang opisyal at maaasahang **Mansalay Tourism AI Assistant** para sa bayan ng **Mansalay, Oriental Mindoro**.

{$context}

🎯 MGA MAHAHALAGANG TUNTUNIN SA PAGSAGOT:
1. 🏖️ **MANSALAY FOCUS ONLY:** Sumagot LAMANG sa mga tanong na may kinalaman sa Mansalay (Attractions, Resorts/Stays, Products, Events, Interactive Map, Biyahe/Pamasahe, Kultura ng Mangyan, at paggamit ng platform).
2. 🛑 **OUT-OF-SCOPE QUESTIONS:** Kung ang tanong ng user ay WALANG kinalaman sa Mansalay o turismo (halimbawa: math, programming, pulitika sa labas ng Mansalay, ibang bansa, o general facts), magalang na ipaliwanag:
   "Pasensya na, ako ay isang **Mansalay Tourism Assistant** na nakalaan lamang para sa mga tanong tungkol sa Mansalay, Oriental Mindoro—tulad ng aming mga pasyalan, resorts, lokal na produkto, pista, at mapa. May maitutulong ba ako tungkol sa iyong pagbisita sa Mansalay?"
3. 🗺️ **MAP & NAVIGATION:** Kapag nagtanong tungkol sa lokasyon o mapa, ipaliwanag kung paano gamitin ang **Interactive Map** page kung saan makikita ang mga pin, kategorya, at direksyon.
4. 💯 **ACCURACY:** Maging tumpak sa presyo (₱), lokasyon (Barangay sa Mansalay), mga tampok na produkto (AWATI baskets, wild honey, banana chips, sukang tuba), at resorts (MB Hiraya, Mahalta Glamping, RC Farm, Nature's Gift).
5. 🇵🇭 **LANGUAGE:** Sumagot sa malinaw at natural na FILIPINO (Tagalog) maliban kung nag-English ang user.
6. ✨ **FORMATTING:** Gumamit ng bullet points (•), bold (**teksto**), at maayos na spacing para madaling basahin.

{$kbText}

Sumagot nang may kabaitan, katumpakan, at sigla para sa turismo ng Mansalay!
PROMPT;
        } else {
            return <<<PROMPT
{$greeting}! You are the official **Mansalay Tourism AI Assistant** for the municipality of **Mansalay, Oriental Mindoro**.

{$context}

🎯 IMPORTANT RESPONSE RULES:
1. 🏖️ **MANSALAY FOCUS ONLY:** Strictly answer questions related to Mansalay, Oriental Mindoro (Attractions, Resorts/Stays, Local Products, Events/Festivals, Interactive Map, Travel/Fares, Mangyan Culture, and platform guide).
2. 🛑 **OUT-OF-SCOPE QUESTIONS:** If the user asks about unrelated topics (e.g. math problems, coding, other countries, politics outside Mansalay, or generic homework), politely respond:
   "I apologize, but I am the **Mansalay Tourism Assistant** dedicated specifically to inquiries about Mansalay, Oriental Mindoro—such as our attractions, resorts, local products, events, and interactive map. How may I help you with your Mansalay travel plans?"
3. 🗺️ **MAP & NAVIGATION:** When asked about locations or maps, guide the user on how to use the **Interactive Map** page to view pins, filter categories, and get directions.
4. 💯 **ACCURACY:** Provide accurate prices (₱), barangay locations in Mansalay, highlighted products (AWATI woven crafts, pure wild honey, banana chips, spiced tuba vinegar), and resorts (MB Hiraya, Mahalta Glamping, RC Farm, Nature's Gift).
5. 🇺🇸 **LANGUAGE:** Respond in clear, welcoming English.
6. ✨ **FORMATTING:** Use bullet points (•), bold (**text**), and clean line breaks for readability.

{$kbText}

Respond with hospitality, accuracy, and enthusiasm for Mansalay tourism!
PROMPT;
        }
    }

    // Helper methods
    
    protected function getTimeBasedGreeting(string $language = 'filipino'): string
    {
        $hour = (int) date('H');
        
        if ($language === 'filipino') {
            if ($hour >= 5 && $hour < 12) {
                return 'Magandang umaga';
            } elseif ($hour >= 12 && $hour < 18) {
                return 'Magandang hapon';
            } else {
                return 'Magandang gabi';
            }
        } else {
            if ($hour >= 5 && $hour < 12) {
                return 'Good morning';
            } elseif ($hour >= 12 && $hour < 18) {
                return 'Good afternoon';
            } else {
                return 'Good evening';
            }
        }
    }
    
    protected function getConversationContext(string $room, ?int $userId): array
    {
        $key = "chat_memory:{$room}:" . ($userId ?? 'guest');
        return Cache::get($key, []);
    }
    
    protected function addToConversationMemory(string $room, ?int $userId, string $userMsg, string $botMsg): void
    {
        $key = "chat_memory:{$room}:" . ($userId ?? 'guest');
        $memory = Cache::get($key, []);
        
        $memory[] = [
            'user' => $userMsg,
            'bot' => $botMsg,
            'timestamp' => now()->toDateTimeString()
        ];
        
        // Keep only last N messages
        if (count($memory) > $this->memoryLimit) {
            $memory = array_slice($memory, -$this->memoryLimit);
        }
        
        Cache::put($key, $memory, 3600); // 1 hour
    }
    
    protected function trackQuestion(string $room, string $question, ?int $userId): void
    {
        $key = "chat_analytics:questions:{$room}:" . date('Y-m-d');
        $questions = Cache::get($key, []);
        
        $questions[] = [
            'question' => $question,
            'user_id' => $userId,
            'timestamp' => now()->toDateTimeString()
        ];
        
        Cache::put($key, $questions, 86400); // 24 hours
    }
    
    protected function trackCacheHit(string $room): void
    {
        $key = "chat_analytics:cache_hits:{$room}:" . date('Y-m-d');
        Cache::increment($key, 1);
        Cache::put($key . ':ttl', true, 86400); // 24 hours
    }
    
    protected function trackResponseTime(string $room, float $timeMs): void
    {
        $key = "chat_analytics:response_times:{$room}:" . date('Y-m-d');
        $times = Cache::get($key, []);
        
        $times[] = $timeMs;
        
        Cache::put($key, $times, 86400); // 24 hours
    }

    protected function buildIndex(array $entries): array
    {
        $docCount = count($entries);
        $termDocCounts = [];
        $entriesData = [];

        foreach ($entries as $idx => $e) {
            $question = $e['question'] ?? '';
            $tokens = $this->tokenize($question);
            $tf = [];
            foreach ($tokens as $t) {
                $tf[$t] = ($tf[$t] ?? 0) + 1;
            }
            foreach (array_keys($tf) as $t) {
                $termDocCounts[$t] = ($termDocCounts[$t] ?? 0) + 1;
            }

            $entriesData[$idx] = [
                'question' => $question,
                'answer' => $e['answer'] ?? '',
                'tf' => $tf,
            ];
        }

        $idf = [];
        foreach ($termDocCounts as $t => $dc) {
            $idf[$t] = log(($docCount + 1) / ($dc + 1)) + 1;
        }

        foreach ($entriesData as $idx => &$d) {
            $weights = [];
            foreach ($d['tf'] as $t => $c) {
                $weights[$t] = $c * ($idf[$t] ?? 1);
            }
            $norm = sqrt(array_sum(array_map(function ($v) { return $v * $v; }, $weights)));
            $d['weights'] = $weights;
            $d['norm'] = $norm;
            unset($d['tf']);
        }
        unset($d);

        return ['entries' => $entriesData, 'idf' => $idf];
    }

    protected function tokenize(string $s): array
    {
        $s = $this->normalize($s);
        $tokens = preg_split('/\s+/', $s, -1, PREG_SPLIT_NO_EMPTY);
        $tokens = array_map('trim', $tokens);
        $tokens = array_filter($tokens, function ($t) {
            return mb_strlen($t) > 1;
        });

        $stopwords = [
            'ang','sa','ng','mga','ito','iyon','ano','alin','saan','kailan','paano','sino','ako','mo','siya','kami','namin','amin',
            'the','is','in','at','which','on','and','a','an','to','for','of','with','by','our','your','how','what','where','when','why','can','i','we','you','me','my','it','this','that','are','was','be','from','has','have'
        ];

        $filtered = [];
        foreach ($tokens as $t) {
            if (in_array($t, $stopwords)) continue;
            $filtered[] = $t;
        }

        return array_values($filtered);
    }

    protected function normalize(string $s): string
    {
        $s = mb_strtolower($s, 'UTF-8');
        $s = preg_replace('/[^\p{L}\p{N}\s]+/u', ' ', $s);
        $s = preg_replace('/\s+/', ' ', $s);
        return trim($s);
    }

    protected function readHistory(?int $userId = null, ?string $room = null): array
    {
        $fileKey = $userId ? "chat_history_user_{$userId}.json" : ($room ? "chat_history_{$room}.json" : "chat_history.json");
        $path = storage_path("app/{$fileKey}");
        if (!file_exists($path)) {
            return [];
        }
        $json = @file_get_contents($path);
        $arr = json_decode($json, true);
        return is_array($arr) ? $arr : [];
    }

    protected function writeHistory(array $history, ?int $userId = null, ?string $room = null): void
    {
        $fileKey = $userId ? "chat_history_user_{$userId}.json" : ($room ? "chat_history_{$room}.json" : "chat_history.json");
        $path = storage_path("app/{$fileKey}");
        @file_put_contents($path, json_encode(array_slice($history, -50), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
}
