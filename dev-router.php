<?php
declare(strict_types=1);

$root = __DIR__;
$requestPath = rawurldecode((string)(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/'));

if (strpos($requestPath, '/.fantasy-db') === 0 || strpos($requestPath, '/.git') === 0) {
    http_response_code(403);
    echo 'Forbidden';
    return true;
}

if ($requestPath === '/api' || strpos($requestPath, '/api/') === 0) {
    require $root . DIRECTORY_SEPARATOR . 'api' . DIRECTORY_SEPARATOR . 'index.php';
    return true;
}

$candidate = realpath($root . DIRECTORY_SEPARATOR . ltrim(str_replace('/', DIRECTORY_SEPARATOR, $requestPath), DIRECTORY_SEPARATOR));
if ($candidate !== false && strpos($candidate, $root) === 0 && is_file($candidate)) {
    return false;
}

if ($requestPath === '/' || $requestPath === '') {
    readfile($root . DIRECTORY_SEPARATOR . 'index.html');
    return true;
}

http_response_code(404);
echo 'Not found';
return true;
