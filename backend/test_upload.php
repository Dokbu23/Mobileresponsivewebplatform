<?php
// Simple test script to verify FormData handling

header('Content-Type: application/json');

// Log incoming request details
$log = [
    'method' => $_SERVER['REQUEST_METHOD'],
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
    'all_post' => $_POST,
    'all_files' => $_FILES,
    'all_server_keys' => array_filter(array_keys($_SERVER), function($k) {
        return strpos($k, 'HTTP_') === 0 || strpos($k, 'CONTENT_') === 0;
    }),
];

// Log to file
file_put_contents(__DIR__ . '/storage/logs/test_upload.log', 
    date('Y-m-d H:i:s') . ' - ' . json_encode($log) . PHP_EOL, 
    FILE_APPEND
);

echo json_encode([
    'status' => 'ok',
    'received' => $log,
]);
?>
