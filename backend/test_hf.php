<?php
// Quick Hugging Face test script — reads HUGGINGFACE_API_KEY from backend/.env
// and calls the Hugging Face Inference API for a given model.

$envFile = __DIR__ . '/.env';
$apiKey = null;
$envContents = '';
if (file_exists($envFile)) {
    $envContents = file_get_contents($envFile);
    if (preg_match('/^HUGGINGFACE_API_KEY=(?:"|\')?(.+?)(?:"|\')?$/m', $envContents, $m)) {
        $apiKey = trim($m[1]);
    }
}

if (empty($apiKey)) {
    echo "HUGGINGFACE_API_KEY not found in backend/.env\n";
    exit(2);
}

$model = 'meta-llama/Llama-2-7b-chat-hf';
if (preg_match('/^HUGGINGFACE_MODEL=(?:"|\')?(.+?)(?:"|\')?$/m', $envContents, $m2)) {
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

$system = "You are an assistant for the DISC Mansalay platform. Use the knowledge base below and answer ONLY from it. Reply in Filipino.\n\nKnowledge base:\n" . $kbText;

$question = $argv[1] ?? 'Paano ako makakapag-book ng accommodation?';

$prompt = $system . "\nUser question: {$question}";

$payload = json_encode([
    'inputs' => $prompt,
    'parameters' => [
        'max_new_tokens' => 300,
        'temperature' => 0.0,
        'return_full_text' => false,
    ],
]);

$url = 'https://api-inference.huggingface.co/pipeline/text-generation/' . $model;

$ch = curl_init($url);
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
