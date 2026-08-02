<?php
/**
 * scan_report_card.php
 * Location: C:\xampp\htdocs\backend-online-enrollment\ocr\scan_report_card.php
 * Uploads image to temp folder, returns filename for OCR processing.
 */

include "../config/cors.php";

header("Content-Type: application/json");

$file = null;
if (!empty($_FILES["report_card"])) {
    $file = $_FILES["report_card"];
} elseif (!empty($_FILES["image"])) {
    $file = $_FILES["image"];
} elseif (!empty($_FILES["file"])) {
    $file = $_FILES["file"];
}

if (!$file || empty($file["tmp_name"])) {
    echo json_encode(["success" => false, "message" => "No image uploaded."]);
    exit;
}

$allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
if (!in_array($file["type"], $allowedTypes, true)) {
    echo json_encode(["success" => false, "message" => "Only JPG and PNG are allowed."]);
    exit;
}

if ($file["size"] > 10 * 1024 * 1024) {
    echo json_encode(["success" => false, "message" => "Image exceeds 10MB."]);
    exit;
}

$uploadFolder = dirname(__DIR__) . "/uploads/temp/";
if (!file_exists($uploadFolder)) {
    mkdir($uploadFolder, 0777, true);
}

$extension = strtolower(pathinfo($file["name"], PATHINFO_EXTENSION));
$fileName = uniqid("report_", true) . "." . $extension;
$destination = $uploadFolder . $fileName;

if (!move_uploaded_file($file["tmp_name"], $destination)) {
    echo json_encode(["success" => false, "message" => "Failed to save image."]);
    exit;
}

echo json_encode([
    "success" => true,
    "message" => "Image uploaded successfully.",
    "filename" => $fileName,
    "file_name" => $fileName
]);
