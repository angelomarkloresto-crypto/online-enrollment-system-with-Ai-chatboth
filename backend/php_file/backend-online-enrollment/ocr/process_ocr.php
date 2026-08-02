<?php
/**
 * process_ocr.php
 * Location: C:\xampp\htdocs\backend-online-enrollment\ocr\process_ocr.php
 */

include "../config/cors.php";

header("Content-Type: application/json");

$input = file_get_contents("php://input");
$data = json_decode($input, true);

$filename = null;
if (is_array($data) && !empty($data["filename"])) {
    $filename = basename((string) $data["filename"]);
} elseif (!empty($_POST["filename"])) {
    $filename = basename((string) $_POST["filename"]);
}

if (!$filename) {
    echo json_encode(["success" => false, "message" => "Filename is required."]);
    exit;
}

$tempDir = realpath(dirname(__DIR__) . "/uploads/temp");
$imagePath = $tempDir ? $tempDir . DIRECTORY_SEPARATOR . $filename : null;

if (!$tempDir || !$imagePath || !file_exists($imagePath)) {
    echo json_encode([
        "success" => false,
        "message" => "Image not found: " . $filename,
        "looked_in" => $imagePath
    ]);
    exit;
}

$python = null;
$pythonCandidates = [
    "C:\\Users\\Gelo\\AppData\\Local\\Microsoft\\WindowsApps\\python.exe",
    "C:\\Users\\Gelo\\AppData\\Local\\Programs\\Python\\Python311\\python.exe",
    "python",
    "python3"
];

foreach ($pythonCandidates as $candidate) {
    if ($candidate === "python" || $candidate === "python3") {
        if (shell_exec("where " . escapeshellarg($candidate) . " 2>nul") !== null) {
            $python = $candidate;
            break;
        }
    } elseif (file_exists($candidate)) {
        $python = $candidate;
        break;
    }
}

if (!$python) {
    echo json_encode(["success" => false, "message" => "Python interpreter not found."]);
    exit;
}

$scriptDir = realpath(__DIR__ . "/python");
$script = $scriptDir ? $scriptDir . DIRECTORY_SEPARATOR . "extract_text.py" : null;

if (!$scriptDir || !$script || !file_exists($script)) {
    echo json_encode([
        "success" => false,
        "message" => "Python script not found.",
        "looked_in" => $script
    ]);
    exit;
}

$command = escapeshellarg($python) . " " . escapeshellarg($script) . " " . escapeshellarg($imagePath) . " 2>&1";
$output = shell_exec($command);

if (!$output || trim($output) === "") {
    echo json_encode([
        "success" => false,
        "message" => "OCR process returned no output. Check Python installation.",
        "command" => $command
    ]);
    exit;
}

$decoded = json_decode(trim($output), true);

if ($decoded === null) {
    echo json_encode([
        "success" => false,
        "message" => "OCR script error. Check Python/Tesseract installation.",
        "raw_output" => $output
    ]);
    exit;
}

echo json_encode($decoded);
