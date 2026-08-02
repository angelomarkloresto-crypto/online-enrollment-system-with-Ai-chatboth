<?php

header("Content-Type: application/json");

require_once __DIR__ . "/../../config/db.php";
require_once __DIR__ . "/../../config/cors.php";

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    echo json_encode([
        "success" => false,
        "message" => "Invalid request."
    ]);
    exit();
}

$student_id = intval($_GET['student_id'] ?? 0);

if ($student_id <= 0) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid student."
    ]);
    exit();
}

$notifications = [];

$enrollment = $conn->prepare("
SELECT enrollment_status
FROM enrollments
WHERE student_id = ?
ORDER BY enrollment_id DESC
LIMIT 1
");

if ($enrollment) {
    $enrollment->bind_param("i", $student_id);
    $enrollment->execute();

    $result = $enrollment->get_result();

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();

        switch ($row['enrollment_status']) {
            case 'Pending':
                $notifications[] = [
                    "type" => "info",
                    "title" => "Enrollment Pending",
                    "message" => "Your enrollment is currently under review."
                ];
                break;

            case 'Approved':
                $notifications[] = [
                    "type" => "success",
                    "title" => "Enrollment Approved",
                    "message" => "Congratulations! Your enrollment has been approved."
                ];
                break;

            case 'Rejected':
                $notifications[] = [
                    "type" => "error",
                    "title" => "Enrollment Rejected",
                    "message" => "Your enrollment was rejected. Please contact the school."
                ];
                break;
        }
    }

    $enrollment->close();
}

$system = $conn->query("SELECT enrollment_status FROM system_settings LIMIT 1");
if ($system && $system->num_rows > 0) {
    $status = $system->fetch_assoc();

    if ($status['enrollment_status'] == "Open") {
        $notifications[] = [
            "type" => "success",
            "title" => "Enrollment Open",
            "message" => "Online enrollment is currently open."
        ];
    } else {
        $notifications[] = [
            "type" => "warning",
            "title" => "Enrollment Closed",
            "message" => "Online enrollment is currently closed."
        ];
    }
}

$timetable = $conn->prepare("
SELECT COUNT(*) AS total
FROM timetable t
INNER JOIN enrollments e
ON t.section_id = e.section_id
WHERE e.student_id = ?
AND e.enrollment_status = 'Approved'
");

if ($timetable) {
    $timetable->bind_param("i", $student_id);
    $timetable->execute();

    $timetableResult = $timetable->get_result();
    $timetableRow = $timetableResult->fetch_assoc();

    if ($timetableRow['total'] > 0) {
        $notifications[] = [
            "type" => "info",
            "title" => "Timetable Ready",
            "message" => "Your class timetable is now available."
        ];
    }

    $timetable->close();
}

echo json_encode([
    "success" => true,
    "total_notifications" => count($notifications),
    "notifications" => $notifications
]);

$conn->close();
?>
