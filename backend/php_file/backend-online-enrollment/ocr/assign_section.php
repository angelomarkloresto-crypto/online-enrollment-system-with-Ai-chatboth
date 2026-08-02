<?php
/**
 * assign_section.php
 * Location: C:\xampp\htdocs\backend-online-enrollment\ocr\assign_section.php
 *
 * Finds an available section based on grade_level and average grade.
 * sections table: grade_level int(11), min_average decimal(5,2), max_average decimal(5,2)
 */

// ✅ cors.php MUST be first — before db.php and any output
include "../config/cors.php";
require_once "../config/db.php";

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data["grade_level"]) || !isset($data["average"])) {
    echo json_encode([
        "success" => false,
        "message" => "Missing required data."
    ]);
    exit;
}

// ✅ Cast to correct types matching the DB schema
// grade_level → int(11)
// min_average / max_average → decimal(5,2) → use float/double
$gradeLevel = intval($data["grade_level"]);
$average    = floatval($data["average"]);

$sql = "
    SELECT section_id, section_name, grade_level, strand_id,
           min_average, max_average, current_capacity, max_capacity
    FROM sections
    WHERE grade_level = ?
    AND min_average <= ?
    AND max_average >= ?
    AND current_capacity < max_capacity
    ORDER BY current_capacity ASC
    LIMIT 1
";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode([
        "success" => false,
        "message" => "Query prepare failed: " . $conn->error
    ]);
    exit;
}

// ✅ Fixed types: i (int) for grade_level, d (double) for both average params
$stmt->bind_param("idd", $gradeLevel, $average, $average);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows == 0) {
    echo json_encode([
        "success" => false,
        "message" => "No available section found for Grade $gradeLevel with an average of $average. Please contact the school office."
    ]);
    exit;
}

$section = $result->fetch_assoc();

echo json_encode([
    "success"      => true,
    "section_id"   => $section["section_id"],
    "section_name" => $section["section_name"]
]);

$stmt->close();
$conn->close();
?>