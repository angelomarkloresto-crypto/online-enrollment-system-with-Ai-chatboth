<?php

header("Content-Type: application/json");

require_once("../config/db.php");

// ===================================
// Validate Request
// ===================================
if (!isset($_GET["section_id"])) {

    echo json_encode([
        "success" => false,
        "message" => "Section ID is required."
    ]);

    exit;
}

$section_id = intval($_GET["section_id"]);

// ===================================
// Get Section QR
// ===================================
$sql = "
SELECT
    section_id,
    grade_level,
    strand_id,
    section_name,
    adviser_name,
    adviser_qr,
    qr_updated_at
FROM sections
WHERE section_id = ?
LIMIT 1
";

$stmt = $conn->prepare($sql);

$stmt->bind_param("i", $section_id);

$stmt->execute();

$result = $stmt->get_result();

if ($result->num_rows == 0) {

    echo json_encode([
        "success" => false,
        "message" => "Section not found."
    ]);

    exit;
}

$section = $result->fetch_assoc();

// ===================================
// Check QR
// ===================================
if (empty($section["adviser_qr"])) {

    echo json_encode([
        "success" => false,
        "message" => "No QR Code uploaded for this section."
    ]);

    exit;
}

// ===================================
// Success
// ===================================
echo json_encode([

    "success" => true,

    "data" => [

        "section_id" => $section["section_id"],

        "grade_level" => $section["grade_level"],

        "strand_id" => $section["strand_id"],

        "section_name" => $section["section_name"],

        "adviser_name" => $section["adviser_name"],

        "qr_code" => $section["adviser_qr"],

        "updated_at" => $section["qr_updated_at"]

    ]

]);