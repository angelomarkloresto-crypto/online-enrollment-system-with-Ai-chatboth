<?php
// ✅ Suppress PHP warnings/notices so they don't corrupt JSON output
error_reporting(0);
ini_set('display_errors', 0);

// ✅ CORS must be first
include "../config/cors.php";
require_once "../config/db.php";

$data = json_decode(file_get_contents("php://input"), true);

if (!is_array($data)) {
    echo json_encode(["success" => false, "message" => "Invalid request data."]);
    exit;
}

// Required fields check
$required = ["student_id","student_type","grade_level","average_grade","section_id","section_name","report_card_front","report_card_back"];
foreach ($required as $field) {
    if (!isset($data[$field]) || trim((string)$data[$field]) === "") {
        echo json_encode(["success" => false, "message" => "$field is required."]);
        exit;
    }
}

// Grade 7 extra requirements
if ((string)$data["grade_level"] === "7") {
    if (empty($data["birth_certificate"]) || empty($data["good_moral"])) {
        echo json_encode(["success" => false, "message" => "Birth Certificate and Good Moral are required for Grade 7."]);
        exit;
    }
}

// Cast variables to correct types
$student_id    = intval($data["student_id"]);
$section_id    = intval($data["section_id"]);
$section_name  = trim((string)$data["section_name"]);
$grade_level   = intval($data["grade_level"]);
$average_grade = floatval($data["average_grade"]);
$ocr_average   = floatval($data["average_grade"]);  // separate variable

// level_type
$level_type = ($grade_level >= 11) ? "SHS" : "JHS";

// Map student_type to enum('New','Old')
$student_type = (trim((string)($data["student_type"] ?? "")) === "New Student") ? "New" : "Old";

// strand_id — nullable
$strand_id = (!empty($data["strand_id"]) && intval($data["strand_id"]) > 0)
    ? intval($data["strand_id"]) : null;

// File names
$report_front = basename((string)($data["report_card_front"] ?? ""));
$report_back  = basename((string)($data["report_card_back"]  ?? ""));
$birth_cert   = !empty($data["birth_certificate"]) ? basename((string)$data["birth_certificate"]) : null;
$good_moral   = !empty($data["good_moral"])         ? basename((string)$data["good_moral"])        : null;
$cot          = !empty($data["certificate_of_transfer"]) ? basename((string)$data["certificate_of_transfer"]) : null;

if ($student_id <= 0 || $section_id <= 0) {
    echo json_encode(["success" => false, "message" => "Invalid student or section."]);
    exit;
}

// Check enrollment system open/closed
$sysResult = $conn->query("SELECT enrollment_status FROM system_settings LIMIT 1");
if (!$sysResult) {
    echo json_encode(["success" => false, "message" => "Cannot read system settings: " . $conn->error]);
    exit;
}
$sysRow = $sysResult->fetch_assoc();
if (!$sysRow || $sysRow["enrollment_status"] !== "Open") {
    echo json_encode(["success" => false, "message" => "Enrollment is currently closed."]);
    exit;
}

// Check duplicate
$dup = $conn->prepare("SELECT enrollment_id FROM enrollments WHERE student_id=? AND enrollment_status IN ('Pending','Approved') LIMIT 1");
if (!$dup) {
    echo json_encode(["success" => false, "message" => "DB error: " . $conn->error]);
    exit;
}
$dup->bind_param("i", $student_id);
$dup->execute();
if ($dup->get_result()->num_rows > 0) {
    echo json_encode(["success" => false, "message" => "You already have an active enrollment."]);
    exit;
}
$dup->close();

$conn->begin_transaction();

// INSERT enrollments
$stmt = $conn->prepare("
    INSERT INTO enrollments
    (student_id, student_type, grade_level, strand_id, level_type,
     average_grade, ocr_average, ocr_status, section_assigned,
     enrollment_status, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Completed', ?, 'Pending', NOW())
");
if (!$stmt) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error]);
    exit;
}

// ✅ Handle nullable strand_id — bind differently based on whether strand exists
if (is_null($strand_id)) {
    $null = null;
    $stmt->bind_param("isiisddis",
        $student_id, $student_type, $grade_level, $null, $level_type,
        $average_grade, $ocr_average, $section_name
    );
} else {
    $stmt->bind_param("isiisdds",
        $student_id, $student_type, $grade_level, $strand_id, $level_type,
        $average_grade, $ocr_average, $section_name
    );
}

if (!$stmt->execute()) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => "Insert failed: " . $stmt->error]);
    exit;
}
$enrollment_id = $conn->insert_id;
$stmt->close();

// File handling with DIRECTORY_SEPARATOR for Windows compatibility
$root   = dirname(__DIR__);
$tmpDir = $root . DIRECTORY_SEPARATOR . "uploads" . DIRECTORY_SEPARATOR . "temp" . DIRECTORY_SEPARATOR;
$destDir= $root . DIRECTORY_SEPARATOR . "uploads" . DIRECTORY_SEPARATOR . "enrollments" . DIRECTORY_SEPARATOR . $enrollment_id . DIRECTORY_SEPARATOR;

if (!file_exists($destDir)) mkdir($destDir, 0777, true);

// Move report card front
$fSrc = $tmpDir . $report_front;
$fDst = $destDir . "report_card_front.jpg";
if (!file_exists($fSrc)) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => "Report Card Front missing from temp. Please re-upload."]);
    exit;
}
rename($fSrc, $fDst);

// Move report card back
$bSrc = $tmpDir . $report_back;
$bDst = $destDir . "report_card_back.jpg";
if (!file_exists($bSrc)) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => "Report Card Back missing from temp. Please re-upload."]);
    exit;
}
rename($bSrc, $bDst);

// Move optional files
$birthDst = $gmDst = $cotDst = null;
if ($birth_cert && file_exists($tmpDir . $birth_cert)) {
    $birthDst = $destDir . "birth_certificate.jpg";
    rename($tmpDir . $birth_cert, $birthDst);
}
if ($good_moral && file_exists($tmpDir . $good_moral)) {
    $gmDst = $destDir . "good_moral.jpg";
    rename($tmpDir . $good_moral, $gmDst);
}
if ($cot && file_exists($tmpDir . $cot)) {
    $cotDst = $destDir . "certificate_of_transfer.jpg";
    rename($tmpDir . $cot, $cotDst);
}

// Save requirements
$req = $conn->prepare("INSERT INTO requirements (enrollment_id,report_card_front,report_card_back,psa_birth_certificate,good_moral,certificate_of_transfer) VALUES (?,?,?,?,?,?)");
if ($req) {
    $req->bind_param("isssss", $enrollment_id, $fDst, $bDst, $birthDst, $gmDst, $cotDst);
    $req->execute();
    $req->close();
}

// Update capacity
$cap = $conn->prepare("UPDATE sections SET current_capacity = current_capacity + 1 WHERE section_id = ?");
if ($cap) {
    $cap->bind_param("i", $section_id);
    $cap->execute();
    $cap->close();
}

$conn->commit();
$conn->close();

echo json_encode([
    "success"       => true,
    "message"       => "Enrollment submitted successfully.",
    "enrollment_id" => $enrollment_id
]);