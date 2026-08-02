<?php
error_reporting(0);
ini_set("display_errors", 0);
include "../config/cors.php";
include "../config/db.php";

header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Method not allowed."
    ]);
    exit();
}

$enrollment_id = isset($_POST["enrollment_id"]) ? (int)$_POST["enrollment_id"] : 0;

if ($enrollment_id <= 0) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Enrollment ID is required."
    ]);
    exit();
}

$stmt = $conn->prepare(
    "SELECT grade_level, strand_id, ocr_average FROM enrollments WHERE enrollment_id = ?"
);
$stmt->bind_param("i", $enrollment_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode([
        "success" => false,
        "message" => "Enrollment not found."
    ]);
    $stmt->close();
    $conn->close();
    exit();
}

$enrollment = $result->fetch_assoc();
$stmt->close();

$grade_level = (int)$enrollment["grade_level"];
$strand_id = $enrollment["strand_id"];
$average = (float)$enrollment["ocr_average"];

if ($grade_level >= 11) {
    if ($strand_id === null || $strand_id === "") {
        $sectionQuery = $conn->prepare(
            "SELECT section_id, section_name
             FROM sections
             WHERE grade_level = ?
               AND ? BETWEEN min_average AND max_average
               AND current_capacity < max_capacity
             ORDER BY section_name ASC
             LIMIT 1"
        );
        $sectionQuery->bind_param("id", $grade_level, $average);
    } else {
        $sectionQuery = $conn->prepare(
            "SELECT section_id, section_name
             FROM sections
             WHERE grade_level = ?
               AND strand_id = ?
               AND ? BETWEEN min_average AND max_average
               AND current_capacity < max_capacity
             ORDER BY section_name ASC
             LIMIT 1"
        );
        $sectionQuery->bind_param("iid", $grade_level, $strand_id, $average);
    }
} else {
    $sectionQuery = $conn->prepare(
        "SELECT section_id, section_name
         FROM sections
         WHERE grade_level = ?
           AND ? BETWEEN min_average AND max_average
           AND current_capacity < max_capacity
         ORDER BY section_name ASC
         LIMIT 1"
    );
    $sectionQuery->bind_param("id", $grade_level, $average);
}

$sectionQuery->execute();
$sectionResult = $sectionQuery->get_result();

if ($sectionResult->num_rows === 0) {
    echo json_encode([
        "success" => false,
        "message" => "No available section for this student's average."
    ]);
    $sectionQuery->close();
    $conn->close();
    exit();
}

$section = $sectionResult->fetch_assoc();
$sectionQuery->close();

$approve = $conn->prepare(
    "UPDATE enrollments
     SET enrollment_status = 'Approved', section_assigned = ?
     WHERE enrollment_id = ?"
);
$approve->bind_param("si", $section["section_name"], $enrollment_id);

if (!$approve->execute()) {
    echo json_encode([
        "success" => false,
        "message" => $approve->error
    ]);
    $approve->close();
    $conn->close();
    exit();
}

$updateCapacity = $conn->prepare(
    "UPDATE sections
     SET current_capacity = current_capacity + 1
     WHERE section_id = ?"
);
$updateCapacity->bind_param("i", $section["section_id"]);
$updateCapacity->execute();
$updateCapacity->close();
$approve->close();

echo json_encode([
    "success" => true,
    "message" => "Enrollment approved successfully."
]);

$conn->close();
?>