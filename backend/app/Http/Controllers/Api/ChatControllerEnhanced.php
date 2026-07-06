<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class ChatControllerEnhanced extends Controller
{
    protected $allowedRooms = ['tourist', 'resort', 'enterprise', 'admin'];
    protected string $openaiModel = 'gpt-4o-mini';
    
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

        $history = $this->readHistory();
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
        ]);

        $room = $data['room'];
        $message = $data['message'];

        $history = $this->readHistory();

        // Get authenticated user
        $authUser = $request->user();
        $userName = $authUser->name ?? null;
        $userId = $authUser->id ?? null;

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

        $botReplyText = $this->generateReply($message, $room, $userName, $userId);

        $botMessage = [
            'id' => Str::uuid()->toString(),
            'room' => $room,
            'sender' => 'bot',
            'message' => $botReplyText,
            'created_at' => now()->toDateTimeString(),
        ];

        $history[] = $botMessage;

        $this->writeHistory($history);
        
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
    
    protected function generateReply(string $text, string $room, ?string $userName = null, ?int $userId = null): string
    {
        // Check response cache first
        $cacheKey = "chat_response:" . md5($room . ':' . strtolower(trim($text)));
        $cached = Cache::get($cacheKey);
        if ($cached) {
            Log::info('Cache hit for query', ['query' => $text]);
            $this->trackCacheHit($room);
            return $cached;
        }
        
        $kb = $this->knowledgeBase();
        $entries = $kb[$room] ?? [];

        if (empty($entries)) {
            return "Pasensya na, wala akong sapat na impormasyon para rito. Ipapaabot namin ang iyong tanong sa support.";
        }

        // Quick greeting detection
        $clean = $this->normalize($text);
        $cleanWords = preg_split('/\s+/', $clean, -1, PREG_SPLIT_NO_EMPTY);
        $greetings = ['kumusta','kamusta','hello','hi','hey','magandang umaga','magandang hapon','magandang gabi','musta','kumusta po','kumusta ka','good morning','good afternoon','good evening'];
        if (is_array($cleanWords) && count($cleanWords) <= 3) {
            foreach ($greetings as $g) {
                if (strpos($clean, $this->normalize($g)) !== false) {
                    $name = $userName ? $userName : 'Kaibigan';
                    $greeting = $this->getTimeBasedGreeting();
                    return "{$greeting}, {$name}! Paano kita matutulungan ngayon?";
                }
            }
        }

        // Build TF-IDF index
        static $indexCache = [];
        $entriesKey = md5(json_encode($entries));
        if (!isset($indexCache[$entriesKey])) {
            $indexCache[$entriesKey] = $this->buildIndex($entries);
        }
        $index = $indexCache[$entriesKey];

        $queryTokens = $this->tokenize($text);
        if (empty($queryTokens)) {
            return "Pasensya na, hindi ko maintindihan ang tanong. Maaari mo ba itong ipaliwanag nang mas malinaw?";
        }

        // Query TF
        $queryTf = [];
        foreach ($queryTokens as $t) {
            $queryTf[$t] = ($queryTf[$t] ?? 0) + 1;
        }

        // Query TF-IDF weights
        $queryWeights = [];
        foreach ($queryTf as $t => $c) {
            $idf = $index['idf'][$t] ?? (log((count($entries) + 1) / 1) + 1);
            $queryWeights[$t] = $c * $idf;
        }

        $queryNorm = sqrt(array_sum(array_map(function ($v) { return $v * $v; }, $queryWeights)));

        $bestScore = 0;
        $bestAnswer = null;

        foreach ($index['entries'] as $entry) {
            $dot = 0.0;
            foreach ($queryWeights as $t => $qW) {
                $eW = $entry['weights'][$t] ?? 0;
                $dot += $qW * $eW;
            }

            $cos = ($queryNorm > 0 && $entry['norm'] > 0) ? ($dot / ($queryNorm * $entry['norm'])) : 0;

            $percent = 0;
            similar_text($text, $entry['question'], $percent);

            $score = ($cos * 0.85) + ($percent / 100 * 0.15);

            if ($score > $bestScore) {
                $bestScore = $score;
                $bestAnswer = $entry['answer'];
            }
        }

        // Threshold
        if ($bestScore > 0.18) {
            // Cache the response
            Cache::put($cacheKey, $bestAnswer, $this->cacheDuration);
            return $bestAnswer;
        }

        // Use Groq with conversation context
        $groqKey = env('GROQ_API_KEY') ?: config('services.groq.key');
        $groqModel = env('GROQ_MODEL') ?: config('services.groq.model') ?: 'llama-3.1-8b-instant';
        $groqUrl = env('GROQ_API_URL') ?: config('services.groq.url') ?: 'https://api.groq.com';

        if (!empty($groqKey)) {
            try {
                $conversationContext = $this->getConversationContext($room, $userId);
                $ai = $this->callGroq($text, $room, $entries, $groqKey, $groqModel, $groqUrl, $conversationContext);
                if (!empty($ai)) {
                    // Cache the response
                    Cache::put($cacheKey, $ai, $this->cacheDuration);
                    return $ai;
                }
            } catch (\Throwable $ex) {
                Log::warning('Groq fallback failed: ' . $ex->getMessage());
            }
        }

        return "Pasensya na, hindi ako sigurado. Ipapaabot namin ang iyong tanong sa support. Para sa agarang tulong, kontakin ang admin o tumawag sa support number.";
    }

    protected function callGroq(string $text, string $room, array $entries, string $apiKey, string $modelId = 'llama-3.1-8b-instant', string $apiUrl = 'https://api.groq.com', array $conversationContext = []): ?string
    {
        // Build knowledge base context
        $kbText = $this->buildKnowledgeBaseContext($entries);
        
        // Enrich with database data
        $kbText .= $this->enrichWithDatabaseData();
        
        // Build system prompt
        $systemPrompt = $this->buildSystemPrompt($kbText, $room);
        
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
        
        $payload = [
            'model' => $modelId,
            'messages' => $messages,
            'temperature' => 0.3,
            'max_tokens' => 500,
            'top_p' => 0.9
        ];
        
        try {
            $startTime = microtime(true);
            
            $response = Http::withHeaders([
                'Authorization' => "Bearer {$apiKey}",
                'Content-Type' => 'application/json',
            ])->timeout(30)->post($endpoint, $payload);
            
            $responseTime = (microtime(true) - $startTime) * 1000; // ms
            $this->trackResponseTime($room, $responseTime);
            
            if (!$response->successful()) {
                Log::warning('Groq API failed', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return null;
            }
            
            $json = $response->json();
            
            if (isset($json['choices'][0]['message']['content'])) {
                return trim($json['choices'][0]['message']['content']);
            }
            
            Log::warning('Unexpected Groq response format', ['response' => $json]);
            return null;
            
        } catch (\Throwable $ex) {
            Log::error('Groq API error', [
                'error' => $ex->getMessage()
            ]);
            return null;
        }
    }

    protected function buildKnowledgeBaseContext(array $entries): string
    {
        $context = "# Knowledge Base\n\n## Frequently Asked Questions\n\n";
        
        foreach (array_slice($entries, 0, 20) as $e) {
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
                $attractions = \App\Models\Attraction::select('name', 'description', 'address', 'category')
                    ->whereNotNull('name')
                    ->take(30)
                    ->get();
                
                if ($attractions->count() > 0) {
                    $context .= "## Tourist Attractions\n\n";
                    foreach ($attractions as $item) {
                        $name = $item->name ?? '';
                        $desc = trim(strip_tags($item->description ?? ''));
                        $addr = $item->address ?? '';
                        $cat = $item->category ?? '';
                        $context .= "**{$name}**\n";
                        if ($cat) $context .= "Category: {$cat}\n";
                        if ($desc) $context .= "Description: {$desc}\n";
                        if ($addr) $context .= "Location: {$addr}\n";
                        $context .= "\n";
                    }
                }
            }
        } catch (\Throwable $ex) {
            Log::debug('Attractions enrichment skipped: ' . $ex->getMessage());
        }
        
        try {
            // Accommodations
            if (class_exists(\App\Models\Accommodation::class)) {
                $accommodations = \App\Models\Accommodation::select('name', 'description', 'address', 'price_per_night', 'amenities')
                    ->whereNotNull('name')
                    ->take(30)
                    ->get();
                
                if ($accommodations->count() > 0) {
                    $context .= "## Accommodations\n\n";
                    foreach ($accommodations as $item) {
                        $name = $item->name ?? '';
                        $desc = trim(strip_tags($item->description ?? ''));
                        $addr = $item->address ?? '';
                        $price = $item->price_per_night ?? '';
                        $amenities = $item->amenities ?? '';
                        $context .= "**{$name}**\n";
                        if ($desc) $context .= "Description: {$desc}\n";
                        if ($addr) $context .= "Location: {$addr}\n";
                        if ($price) $context .= "Price: ₱{$price} per night\n";
                        if ($amenities) $context .= "Amenities: {$amenities}\n";
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
                $products = \App\Models\Product::select('name', 'description', 'price', 'category')
                    ->whereNotNull('name')
                    ->take(30)
                    ->get();
                
                if ($products->count() > 0) {
                    $context .= "## Local Products\n\n";
                    foreach ($products as $item) {
                        $name = $item->name ?? '';
                        $desc = trim(strip_tags($item->description ?? ''));
                        $price = $item->price ?? '';
                        $cat = $item->category ?? '';
                        $context .= "**{$name}**\n";
                        if ($cat) $context .= "Category: {$cat}\n";
                        if ($desc) $context .= "Description: {$desc}\n";
                        if ($price) $context .= "Price: ₱{$price}\n";
                        $context .= "\n";
                    }
                }
            }
        } catch (\Throwable $ex) {
            Log::debug('Products enrichment skipped: ' . $ex->getMessage());
        }
        
        try {
            // Events
            if (class_exists(\App\Models\Event::class)) {
                $events = \App\Models\Event::select('title', 'description', 'start_date', 'end_date', 'location')
                    ->whereNotNull('title')
                    ->where('start_date', '>=', now())
                    ->take(20)
                    ->get();
                
                if ($events->count() > 0) {
                    $context .= "## Upcoming Events\n\n";
                    foreach ($events as $item) {
                        $title = $item->title ?? '';
                        $desc = trim(strip_tags($item->description ?? ''));
                        $start = $item->start_date ?? '';
                        $end = $item->end_date ?? '';
                        $loc = $item->location ?? '';
                        $context .= "**{$title}**\n";
                        if ($start) $context .= "Date: {$start}";
                        if ($end && $end != $start) $context .= " to {$end}";
                        $context .= "\n";
                        if ($loc) $context .= "Location: {$loc}\n";
                        if ($desc) $context .= "Description: {$desc}\n";
                        $context .= "\n";
                    }
                }
            }
        } catch (\Throwable $ex) {
            Log::debug('Events enrichment skipped: ' . $ex->getMessage());
        }
        
        try {
            // Recent Bookings (for resort/enterprise rooms)
            if (class_exists(\App\Models\Booking::class)) {
                $bookings = \App\Models\Booking::select('id', 'status', 'check_in', 'check_out', 'total_price')
                    ->whereIn('status', ['pending', 'confirmed'])
                    ->orderBy('created_at', 'desc')
                    ->take(10)
                    ->get();
                
                if ($bookings->count() > 0) {
                    $context .= "## Recent Bookings\n\n";
                    $context .= "Total pending/confirmed bookings: {$bookings->count()}\n";
                    $context .= "Status breakdown:\n";
                    $pending = $bookings->where('status', 'pending')->count();
                    $confirmed = $bookings->where('status', 'confirmed')->count();
                    $context .= "- Pending: {$pending}\n";
                    $context .= "- Confirmed: {$confirmed}\n\n";
                }
            }
        } catch (\Throwable $ex) {
            Log::debug('Bookings enrichment skipped: ' . $ex->getMessage());
        }
        
        return $context;
    }

    protected function buildSystemPrompt(string $kbText, string $room): string
    {
        $roleContext = [
            'tourist' => 'Ikaw ay tumutulong sa mga turista na bumisita sa Mansalay. Tulungan sila na makahanap ng attractions, accommodations, at local products. Magbigay ng detalyadong impormasyon tungkol sa presyo, lokasyon, at kung paano mag-book.',
            'resort' => 'Ikaw ay tumutulong sa mga resort owners na pamahalaan ang kanilang negosyo. Sagutin ang kanilang mga tanong tungkol sa bookings, payments, profile management, at platform features. Magbigay ng step-by-step instructions kung kinakailangan.',
            'enterprise' => 'Ikaw ay tumutulong sa mga enterprise owners na pamahalaan ang kanilang produkto at orders. Sagutin ang kanilang mga tanong tungkol sa inventory, sales, product management, at platform features. Magbigay ng konkretong solusyon.',
            'admin' => 'Ikaw ay tumutulong sa admin na pamahalaan ang platform. Sagutin ang kanilang mga tanong tungkol sa user management, listings approval, payment verification, at system operations. Magbigay ng technical guidance kung kinakailangan.'
        ];
        
        $context = $roleContext[$room] ?? $roleContext['tourist'];
        
        $greeting = $this->getTimeBasedGreeting();
        
        return <<<PROMPT
{$greeting}! Ikaw ay isang helpful at friendly assistant para sa DISC Mansalay tourism platform.

{$context}

MAHALAGANG PANUNTUNAN:
1. ✅ Sumagot LAMANG base sa knowledge base at database information na ibinigay sa ibaba
2. ❌ Kung walang impormasyon sa knowledge base, sabihin na "Pasensya na, wala akong impormasyon tungkol diyan. Maaari mong kontakin ang support para sa tulong."
3. 🇵🇭 Sumagot sa FILIPINO (Tagalog) language - natural at conversational
4. 😊 Maging friendly, helpful, at approachable
5. 💯 Kung may tanong tungkol sa presyo, location, o detalye, ibigay ang EXACT information mula sa database
6. 🚫 Huwag mag-imbento ng impormasyon - accuracy is critical
7. 📋 Kung may multiple options, ilista lahat ng available choices
8. 🎯 Magbigay ng konkretong sagot, hindi generic responses
9. 🔢 Kung may numbers (presyo, bilang), i-format ng maayos (₱1,000 instead of 1000)
10. 📍 Kung may location, ibigay ang complete address kung available

FORMATTING GUIDELINES:
- Use bullet points (•) para sa lists
- Use bold (**text**) para sa important information
- Use line breaks para sa readability
- Keep responses concise pero complete

{$kbText}

Sumagot ngayon base sa knowledge base sa itaas. Maging accurate, helpful, at friendly!
PROMPT;
    }

    // Helper methods
    
    protected function getTimeBasedGreeting(): string
    {
        $hour = (int) date('H');
        
        if ($hour >= 5 && $hour < 12) {
            return 'Magandang umaga';
        } elseif ($hour >= 12 && $hour < 18) {
            return 'Magandang hapon';
        } else {
            return 'Magandang gabi';
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

    protected function readHistory(): array
    {
        $path = storage_path('app/chat_history.json');
        if (!file_exists($path)) {
            return [];
        }
        $json = file_get_contents($path);
        $arr = json_decode($json, true);
        return is_array($arr) ? $arr : [];
    }

    protected function writeHistory(array $history): void
    {
        $path = storage_path('app/chat_history.json');
        file_put_contents($path, json_encode($history, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
}
