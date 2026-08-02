<?php
/**
 * cors.php
 * Location: backend-online-enrollment/config/cors.php
 *
 * Include this at the very top of every PHP endpoint file.
 * It handles CORS headers + JSON content type in one place.
 *
 * Usage:
 *   include "../config/cors.php";   <- from admin/ or staff/ or student/
 *   include "../../config/cors.php"; <- from subfolders like student/timetable/
 */

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Handle browser preflight request
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}