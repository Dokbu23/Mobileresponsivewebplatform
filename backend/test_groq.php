<?php
// Groq test script — reads GROQ_API_KEY, GROQ_MODEL, GROQ_API_URL from backend/.env
// and attempts common endpoint shapes until one responds.

$envFile = __DIR__ . '/.env';
$envContents = '';
$apiKey = null;
$model = 'llama-3.1-8b-instant';
$apiUrl = 'https://api.groq.com';

if (file_exists($envFile)) {
    $envContents = file_get_contents($envFile);
    if (preg_match('/^GROQ_API_KEY=(?:"|\')?(.+?)(?:"|\')?$/m', $envContents, $m)) {
        $apiKey = trim($m[1]);
    }
    if (preg_match('/^GROQ_MODEL=(?:"|\')?(.+?)(?:"|\')?$/m', $envContents, $m2)) {
        $model = trim($m2[1]);
    }
    if (preg_match('/^GROQ_API_URL=(?:"|\')?(.+?)(?:"|\')?$/m', $envContents, $m3)) {
        $apiUrl = rtrim(trim($m3[1]), '/');
    }
}

if (empty($apiKey)) {
    echo "GROQ_API_KEY not found in backend/.env\n";
    exit(2);
}

$faqsFile = __DIR__ . '/resources/faqs.json';
$kbText = '';
if (file_exists($faqsFile)) {
    $faqs = json_decode(file_get_contents($faqsFile), true);
    $entries = $faqs['tourist'] ?? [];
    foreach ($entries as $e) {
        $q = $e['question'] ?? '';
        $a = $e['answer'] ?? '';
        $kbText .= "Q: {$q}\nA: {$a}\n\n";
        if (strlen($kbText) > 3000) break;
    }
}

$system = "You are an assistant for the DISC Mansalay platform. Use the knowledge base below and answer ONLY from it. Reply in Filipino.\n\nKnowledge base:\n" . $kbText;
$question = $argv[1] ?? 'Paano ako makakapag-book ng accommodation?';
$prompt = $system . "\nUser question: {$question}";

$endpoints = [
    $apiUrl . '/openai/v1/chat/completions',
    $apiUrl . '/v1/models/' . $model . '/outputs',
    $apiUrl . '/v1/models/' . $model . '/generate',
    $apiUrl . '/v1/models/' . $model . '/invoke',
    $apiUrl . '/models/' . $model . '/outputs',
    $apiUrl . '/models/' . $model . '/generate',
    $apiUrl . '/v1/chat/completions',
    $apiUrl . '/v1/completions',
    'https://api.groq.com/openai/v1/chat/completions',
];

$payloads = [
    ['type' => 'openai_chat', 'body' => ['model' => $model, 'messages' => [['role' => 'system', 'content' => $system], ['role' => 'user', 'content' => $question]], 'temperature' => 0.0, 'max_tokens' => 300]],
    ['type' => 'inputs', 'body' => ['inputs' => $prompt, 'parameters' => ['max_new_tokens' => 300, 'temperature' => 0.0]]],
    ['type' => 'prompt', 'body' => ['prompt' => $prompt, 'max_tokens' => 300, 'temperature' => 0.0]],
    ['type' => 'simple', 'body' => ['input' => $prompt, 'max_tokens' => 300]],
];

foreach ($endpoints as $endpoint) {
    foreach ($payloads as $p) {
        $body = json_encode($p['body']);
        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json',
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        curl_setopt($ch, CURLOPT_TIMEOUT, 60);

        $res = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($res === false) {
            echo "Tried {$endpoint} ({$p['type']}) -> CURL error: " . curl_error($ch) . "\n";
            curl_close($ch);
            continue;
        }

        echo "Tried {$endpoint} ({$p['type']}) -> HTTP {$code}\n";
        echo $res . "\n\n";

        curl_close($ch);

        if ($code >= 200 && $code < 300) {
            exit(0);
        }
    }
}

echo "No working Groq endpoint found with provided API key/model.\n";
exit(1);
