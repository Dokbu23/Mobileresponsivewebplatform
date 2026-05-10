<?php
// Bootstrap Laravel and call ChatController->send() to test the chat flow using configured LLM provider.

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Http\Request;
use App\Http\Controllers\Api\ChatController;

$question = $argv[1] ?? 'Paano ako makakapag-book ng accommodation?';

$request = Request::create('/api/chat/send', 'POST', [
    'room' => 'tourist',
    'message' => $question,
]);

$controller = new ChatController();
try {
    $response = $controller->send($request);
    // send() returns a JsonResponse
    echo $response->getContent() . PHP_EOL;
    exit(0);
} catch (Throwable $ex) {
    echo "Error invoking ChatController: " . $ex->getMessage() . PHP_EOL;
    echo $ex->getTraceAsString() . PHP_EOL;
    exit(1);
}
