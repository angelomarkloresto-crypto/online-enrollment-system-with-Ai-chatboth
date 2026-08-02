<?php
header("Content-Type: application/json");

include "../config/db.php"; // I-adjust ang path kung iba ang folder structure

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode([
        "success" => false,
        "message" => "Invalid request method."
    ]);
    exit;
}

// Receive data
$section_id = $_POST['section_id'] ?? '';
$schedule_type = $_POST['schedule_type'] ?? '';
$class_start = $_POST['class_start'] ?? '';
$class_end = $_POST['class_end'] ?? '';
$break_enabled = $_POST['break_enabled'] ?? 'Yes';
$break_start = $_POST['break_start'] ?? null;
$break_duration = $_POST['break_duration'] ?? 20;
$total_subjects = $_POST['total_subjects'] ?? '';
$selected_days = $_POST['selected_days'] ?? '';

// Validation
if (
    empty($section_id) ||
    empty($schedule_type) ||
    empty($class_start) ||
    empty($class_end) ||
    empty($total_subjects) ||
    empty($selected_days)
) {
    echo json_encode([
        "success" => false,
        "message" => "Please complete all required fields."
    ]);
    exit;
}

// Check if timetable settings already exist
$check = $conn->prepare("
    SELECT setting_id
    FROM timetable_settings
    WHERE section_id = ?
");
$check->bind_param("i", $section_id);
$check->execute();
$result = $check->get_result();

if ($result->num_rows > 0) {
    echo json_encode([
        "success" => false,
        "message" => "Timetable settings already exist for this section."
    ]);
    exit;
}

// Insert
$stmt = $conn->prepare("
INSERT INTO timetable_settings
(
section_id,
schedule_type,
class_start,
class_end,
break_enabled,
break_start,
break_duration,
total_subjects,
selected_days
)
VALUES
(?,?,?,?,?,?,?,?,?)
");

$stmt->bind_param(
    "isssssiis",
    $section_id,
    $schedule_type,
    $class_start,
    $class_end,
    $break_enabled,
    $break_start,
    $break_duration,
    $total_subjects,
    $selected_days
);

if ($stmt->execute()) {

    echo json_encode([
        "success" => true,
        "message" => "Timetable settings saved successfully.",
        "setting_id" => $conn->insert_id
    ]);

} else {

    echo json_encode([
        "success" => false,
        "message" => "Failed to save timetable settings."
    ]);

}

$stmt->close();
$conn->close();
?>