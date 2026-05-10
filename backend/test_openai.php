<?php
// Quick OpenAI test script — reads OPENAI_API_KEY from backend/.env and calls the Chat Completions API.

$envFile = __DIR__ . '/.env';
$apiKey = null;
$envContents = '';
if (file_exists($envFile)) {
    $envContents = file_get_contents($envFile);
    if (preg_match('/^OPENAI_API_KEY=(?:"|\')?(.+?)(?:"|\')?$/m', $envContents, $m)) {
        $apiKey = trim($m[1]);
    }
}

if (empty($apiKey)) {
    echo "OPENAI_API_KEY not found in backend/.env\n";
    exit(2);
}

$model = 'gpt-4o-mini';
if (preg_match('/^OPENAI_MODEL=(?:"|\')?(.+?)(?:"|\')?$/m', $envContents, $m2)) {
    $model = trim($m2[1]);
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

$system = "You are an assistant for the DISC Mansalay platform. A knowledge base follows for the requested user room. Answer the user's question ONLY using information from the knowledge base below. Do NOT invent facts. If the answer is not present in the knowledge base, reply exactly with: 'Pasensya na, hindi ako sigurado. Ipapaabot namin ang iyong tanong sa support.' Keep responses concise and in Filipino.\n\nKnowledge base:\n" . $kbText;

$question = $argv[1] ?? 'Paano ako makakakuha ng refund para sa booking?';

$payload = json_encode([
    'model' => $model,
    'messages' => [
        ['role' => 'system', 'content' => $system],
        ['role' => 'user', 'content' => "User question: {$question}"],
    ],
    'max_tokens' => 300,
    'temperature' => 0.0,
]);

$ch = curl_init('https://api.openai.com/v1/chat/completions');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $apiKey,
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_TIMEOUT, 60);

$res = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
if ($res === false) {
    echo "CURL error: " . curl_error($ch) . "\n";
    curl_close($ch);
    exit(1);
}
curl_close($ch);

echo "HTTP_STATUS: {$httpCode}\n";
echo $res . "\n";
