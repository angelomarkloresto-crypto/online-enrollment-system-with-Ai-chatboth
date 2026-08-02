<?php

header("Content-Type: application/json");

require_once("../config/db.php");

// =======================================
// Validate Request
// =======================================
if (!isset($_GET["student_id"])) {

    echo json_encode([
        "success" => false,
        "message" => "Student ID is required."
    ]);

    exit;
}

$student_id = intval($_GET["student_id"]);

// =======================================
// Get Student Section and QR Code
// =======================================
$sql = "
SELECT

    e.enrollment_status,

    s.section_id,

    s.section_name,

    s.grade_level,

    s.adviser_name,

    s.adviser_qr,

    s.qr_updated_at

FROM enrollment e

INNER JOIN sections s

ON e.section_id = s.section_id

WHERE e.student_id = ?

ORDER BY e.enrollment_id DESC

LIMIT 1
";

$stmt = $conn->prepare($sql);

$stmt->bind_param("i", $student_id);

$stmt->execute();

$result = $stmt->get_result();

if ($result->num_rows == 0) {

    echo json_encode([
        "success" => false,
        "message" => "No enrollment record found."
    ]);

    exit;
}

$data = $result->fetch_assoc();

// =======================================
// Check Enrollment Status
// =======================================
if ($data["enrollment_status"] != "Approved") {

    echo json_encode([
        "success" => false,
        "message" => "Your enrollment has not been approved yet."
    ]);

    exit;
}

// =======================================
// Check QR Code
// =======================================
if (empty($data["adviser_qr"])) {

    echo json_encode([
        "success" => false,
        "message" => "No donation QR code has been uploaded for your section yet."
    ]);

    exit;
}

// =======================================
// Success
// =======================================
echo json_encode([

    "success" => true,

    "data" => [

        "section_id" => $data["section_id"],

        "section_name" => $data["section_name"],

        "grade_level" => $data["grade_level"],

        "adviser_name" => $data["adviser_name"],

        "qr_code" => $data["adviser_qr"],

        "updated_at" => $data["qr_updated_at"]

    ]

]);