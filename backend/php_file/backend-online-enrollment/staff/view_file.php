<?php
/**
 * view_file.php
 * Location: C:\xampp\htdocs\backend-online-enrollment\staff\view_file.php
 *
 * Serves student uploaded images directly via PHP.
 * Does NOT include cors.php — this is for direct browser navigation (new tab),
 * not AJAX fetch, so CORS headers are not needed and would interfere.
 *
 * Usage: GET /staff/view_file.php?enrollment_id=1&file=report_card_front
 */

// Suppress errors so they don't corrupt the image output
error_reporting(0);
ini_set('display_errors', 0);

$enrollment_id = intval($_GET['enrollment_id'] ?? 0);
$fileType      = trim($_GET['file'] ?? '');

// Whitelist of allowed file names
$allowedFiles = [
    'report_card_front'       => 'report_card_front.jpg',
    'report_card_back'        => 'report_card_back.jpg',
    'birth_certificate'       => 'birth_certificate.jpg',
    'good_moral'              => 'good_moral.jpg',
    'certificate_of_transfer' => 'certificate_of_transfer.jpg',
];

if ($enrollment_id <= 0 || !array_key_exists($fileType, $allowedFiles)) {
    http_response_code(400);
    header('Content-Type: text/plain');
    echo "Invalid request. enrollment_id=$enrollment_id, file=$fileType";
    exit;
}

$filename = $allowedFiles[$fileType];

// Build path — view_file.php is in staff/, uploads are in backend root
// dirname(__DIR__) goes up one level from staff/ to backend-online-enrollment/
$filePath = dirname(__DIR__)
    . DIRECTORY_SEPARATOR . 'uploads'
    . DIRECTORY_SEPARATOR . 'enrollments'
    . DIRECTORY_SEPARATOR . $enrollment_id
    . DIRECTORY_SEPARATOR . $filename;

// Debug: uncomment this line temporarily if file still not found
// die("Looking for: " . $filePath . " | Exists: " . (file_exists($filePath) ? 'YES' : 'NO'));

if (!file_exists($filePath)) {
    http_response_code(404);
    header('Content-Type: text/plain');
    echo "File not found: $filename for enrollment #$enrollment_id";
    exit;
}

// Detect MIME type from actual file content (more reliable than extension)
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime  = finfo_file($finfo, $filePath);
finfo_close($finfo);

// Fallback if finfo returns empty
if (!$mime || $mime === 'application/octet-stream') {
    $ext     = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
    $mimeMap = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'pdf' => 'application/pdf'];
    $mime    = $mimeMap[$ext] ?? 'image/jpeg';
}

// Serve the file
header('Content-Type: ' . $mime);
header('Content-Length: ' . filesize($filePath));
header('Content-Disposition: inline; filename="' . $filename . '"');
header('Cache-Control: max-age=3600');
header('X-Content-Type-Options: nosniff');

readfile($filePath);
exit;
?>