<?php
// Enable detailed error reporting for debugging 500 errors (remove in production)
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/php-error.log');

// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Headers: Content-Type");
// header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Origin: http://localhost:5173");

// Allow session cookies to be sent/received (needed for PHP sessions)
header("Access-Control-Allow-Credentials: true");

// Allowed methods
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

// Allow Content-Type header (needed when sending JSON body)
header("Access-Control-Allow-Headers: Content-Type");

// Always send JSON unless the file overrides it
header("Content-Type: application/json");

// Handle OPTIONS preflight request — browsers send this before POST with JSON body
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}


    $host = "localhost";
    $user = "root";
    $pass = "";
    $db = "online_enrollment";

    $conn = new mysqli($host, $user, $pass, $db);
    if($conn->connect_error){
        die("connection failed: " .
        $conn->connect_error);
    }


?>