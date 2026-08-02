<?php
header("Content-Type: application/json");

include "../config/db.php"; // Adjust path if needed

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode([
        "success" => false,
        "message" => "Invalid request method."
    ]);
    exit;
}

// Get setting ID
$setting_id = $_POST['setting_id'] ?? null;

// Subjects should be sent as an array
$subjects = $_POST['subjects'] ?? [];

if (empty($setting_id) || empty($subjects)) {
    echo json_encode([
        "success" => false,
        "message" => "Please provide timetable subjects."
    ]);
    exit;
}

// Delete existing subjects if any
$delete = $conn->prepare("
DELETE FROM timetable_subjects
WHERE setting_id = ?
");
$delete->bind_param("i", $setting_id);
$delete->execute();

// Insert subjects
$stmt = $conn->prepare("
INSERT INTO timetable_subjects
(
setting_id,
subject_name,
display_order
)
VALUES
(
?,
?,
?
)
");

$order = 1;

foreach ($subjects as $subject) {

    $subject = trim($subject);

    if ($subject == "") {
        continue;
    }

    $stmt->bind_param(
        "isi",
        $setting_id,
        $subject,
        $order
    );

    $stmt->execute();

    $order++;

}

echo json_encode([
    "success" => true,
    "message" => "Subjects saved successfully."
]);

$stmt->close();
$conn->close();

?>
