<?php
/**
 * cors.php
 * Place this in: backend-online-enrollment/config/cors.php
 * Include at the top of EVERY PHP endpoint file.
 *
 * Usage:
 *   include "../config/cors.php";   // from admin/ or staff/ or student/
 *   include "../../config/cors.php"; // if deeper nested
 */

// Allow requests from your React dev server
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
