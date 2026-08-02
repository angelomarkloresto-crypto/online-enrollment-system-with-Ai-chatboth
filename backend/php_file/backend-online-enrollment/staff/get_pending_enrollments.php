<?php

error_reporting(0);
ini_set("display_errors", 0);
include "../config/cors.php";
include "../config/db.php";

header("Content-Type: application/json");

$sql = "
SELECT
    enrollment_id,
    student_id,
    student_type,
    grade_level,
    average_grade,
    ocr_average,
    ocr_status,
    enrollment_status,
    submitted_at,
    level_type
FROM enrollments
WHERE enrollment_status = 'Pending'
ORDER BY submitted_at DESC
";

$result = $conn->query($sql);

$enrollments = [];

while($row = $result->fetch_assoc()){
    $enrollments[] = $row;
}

echo json_encode([
    "success" => true,
    "enrollments" => $enrollments
]);

$conn->close();

?>