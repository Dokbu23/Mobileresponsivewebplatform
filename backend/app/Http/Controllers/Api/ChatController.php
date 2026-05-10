<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ChatController extends Controller
{
    protected $allowedRooms = ['tourist', 'resort', 'enterprise', 'admin'];
    // Optional OpenAI model name to use when local KB can't answer.
    protected string $openaiModel = 'gpt-4o-mini';

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

        // Attempt to get authenticated user's name (may be null for unauthenticated requests)
        $authUser = $request->user();
        $userName = $authUser->name ?? null;

        $userMessage = [
            'id' => Str::uuid()->toString(),
            'room' => $room,
            'sender' => 'user',
            'message' => $message,
            'created_at' => now()->toDateTimeString(),
        ];

        $history[] = $userMessage;

        $botReplyText = $this->generateReply($message, $room, $userName);

        $botMessage = [
            'id' => Str::uuid()->toString(),
            'room' => $room,
            'sender' => 'bot',
            'message' => $botReplyText,
            'created_at' => now()->toDateTimeString(),
        ];

        $history[] = $botMessage;

        $this->writeHistory($history);

        return response()->json(['reply' => $botMessage, 'user_message' => $userMessage]);
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
    protected function generateReply(string $text, string $room, ?string $userName = null): string
    {
        $kb = $this->knowledgeBase();
        $entries = $kb[$room] ?? [];

        if (empty($entries)) {
            return "Pasensya na, wala akong sapat na impormasyon para rito. Ipapaabot namin ang iyong tanong sa support.";
        }

        // Quick greeting detection: if user sends a short greeting, reply with a personalized greeting.
        $clean = $this->normalize($text);
        $cleanWords = preg_split('/\s+/', $clean, -1, PREG_SPLIT_NO_EMPTY);
        $greetings = ['kumusta','kamusta','hello','hi','hey','magandang umaga','magandang hapon','magandang gabi','musta','kumusta po','kumusta ka'];
        if (is_array($cleanWords) && count($cleanWords) <= 3) {
            foreach ($greetings as $g) {
                if (strpos($clean, $this->normalize($g)) !== false) {
                    $name = $userName ? $userName : 'Kaibigan';
                    return "Kumusta, {$name}! Paano kita matutulungan ngayon?";
                }
            }
        }

        // Build a lightweight TF-IDF index (cached in-process)
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

            // Combine cosine similarity and surface similarity
            $score = ($cos * 0.85) + ($percent / 100 * 0.15);

            if ($score > $bestScore) {
                $bestScore = $score;
                $bestAnswer = $entry['answer'];
            }
        }

        // Threshold tuned for short FAQ-style KB
        if ($bestScore > 0.18) {
            return $bestAnswer;
        }

        // Use Groq only as the LLM fallback per request.
        $groqKey = env('GROQ_API_KEY') ?: config('services.groq.key');
        $groqModel = env('GROQ_MODEL') ?: config('services.groq.model') ?: 'groq-1';
        $groqUrl = env('GROQ_API_URL') ?: config('services.groq.url') ?: 'https://api.groq.ai';

        if (!empty($groqKey)) {
            try {
                $ai = $this->callGroq($text, $room, $entries, $groqKey, $groqModel, $groqUrl);
                if (!empty($ai)) return $ai;
            } catch (\Throwable $ex) {
                Log::warning('Groq fallback failed: ' . $ex->getMessage());
            }
        }

        return "Pasensya na, hindi ako sigurado. Ipapaabot namin ang iyong tanong sa support. Para sa agarang tulong, kontakin ang admin o tumawag sa support number.";
    }

    // Hugging Face fallback removed — Groq-only deployment in use.

    /**
     * Call Groq / Groq Cloud LLM via configurable endpoints. This method will
     * attempt several common LLM endpoint shapes until one responds.
     */
    protected function callGroq(string $text, string $room, array $entries, string $apiKey, string $modelId = 'groq-1', string $apiUrl = 'https://api.groq.ai'): ?string
    {
        $kbText = '';
        foreach ($entries as $e) {
            $q = $e['question'] ?? '';
            $a = $e['answer'] ?? '';
            $kbText .= "Q: {$q}\nA: {$a}\n\n";
            if (strlen($kbText) > 3000) break;
        }

        $system = "You are an assistant for the DISC Mansalay platform. Use the knowledge base below and answer ONLY from it. Reply in Filipino.\n\nKnowledge base:\n" . $kbText;
        $prompt = $system . "\nUser question: {$text}";

        $endpoints = [
            rtrim($apiUrl, '/') . "/v1/models/{$modelId}/outputs",
            rtrim($apiUrl, '/') . "/models/{$modelId}/outputs",
            rtrim($apiUrl, '/') . "/v1/models/{$modelId}/generate",
            rtrim($apiUrl, '/') . "/models/{$modelId}/generate",
            rtrim($apiUrl, '/') . "/v1/models/{$modelId}/invoke",
            rtrim($apiUrl, '/') . "/models/{$modelId}/invoke",
            rtrim($apiUrl, '/') . "/v1/chat/completions",
            rtrim($apiUrl, '/') . "/v1/completions",
        ];

        $payloadVariants = [
            ['inputs' => $prompt, 'parameters' => ['max_new_tokens' => 300, 'temperature' => 0.0]],
            ['input' => $prompt, 'max_tokens' => 300, 'temperature' => 0.0],
            ['messages' => [['role' => 'system', 'content' => $system], ['role' => 'user', 'content' => $text]], 'max_tokens' => 300],
            ['prompt' => $prompt, 'max_tokens' => 300, 'temperature' => 0.0],
        ];

        foreach ($endpoints as $endpoint) {
            foreach ($payloadVariants as $payload) {
                try {
                    $res = Http::withHeaders([
                        'Authorization' => "Bearer {$apiKey}",
                        'Content-Type' => 'application/json',
                    ])->timeout(60)->post($endpoint, $payload);

                    if (!$res->successful()) {
                        Log::info('Groq attempt failed', ['endpoint' => $endpoint, 'status' => $res->status()]);
                        continue;
                    }

                    $json = $res->json();

                    // Try to find likely text fields
                    if (is_array($json)) {
                        // common fields: generated_text, output, result, choices
                        if (isset($json[0]['generated_text'])) return trim($json[0]['generated_text']);
                        if (isset($json['generated_text'])) return trim($json['generated_text']);
                        if (isset($json['output']) && is_string($json['output'])) return trim($json['output']);
                        if (isset($json['result']) && is_string($json['result'])) return trim($json['result']);
                        if (isset($json['choices'][0]['text'])) return trim($json['choices'][0]['text']);
                        if (isset($json['choices'][0]['message']['content'])) return trim($json['choices'][0]['message']['content']);

                        // Fallback: walk and concat strings
                        $out = '';
                        array_walk_recursive($json, function ($v) use (&$out) { if (is_string($v)) $out .= $v . " "; });
                        $out = trim($out);
                        if (!empty($out)) return $out;
                    } elseif (is_string($json)) {
                        return trim($json);
                    }
                } catch (\Throwable $ex) {
                    Log::warning('Groq request error', ['endpoint' => $endpoint, 'error' => $ex->getMessage()]);
                    continue;
                }
            }
        }

        return null;
    }

    // OpenAI fallback removed — Groq-only deployment in use.

    protected function buildIndex(array $entries): array
    {
        $docCount = count($entries);
        $termDocCounts = [];
        $entriesData = [];

        foreach ($entries as $idx => $e) {
            $question = $e['question'] ?? '';
            // Index primarily on the question text to keep answers precise to system KB
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

    protected function wordOverlap(string $a, string $b): int
    {
        $wa = array_unique(array_filter(explode(' ', $a)));
        $wb = array_unique(array_filter(explode(' ', $b)));
        if (count($wa) === 0 || count($wb) === 0) return 0;
        $common = array_intersect($wa, $wb);
        return count($common);
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
