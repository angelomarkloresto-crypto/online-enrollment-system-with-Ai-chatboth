<?php
error_reporting(0);
ini_set("display_errors", 0);
include "../config/cors.php";
include "../config/db.php";

header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] == "GET") {

    $enrollment_id = $_GET['enrollment_id'];

    $stmt = $conn->prepare("
        SELECT
            s.*,
            e.enrollment_id,
            e.student_type,
            e.grade_level,
            e.average_grade,
            e.ocr_average,
            e.ocr_status,
            e.enrollment_status,
            e.level_type,
            e.section_assigned,

            r.report_card_front,
            r.report_card_back,
            r.psa_birth_certificate,
            r.good_moral,
            r.certificate_of_transfer

        FROM enrollments e

        INNER JOIN students s
            ON e.student_id = s.student_id

        LEFT JOIN requirements r
            ON e.enrollment_id = r.enrollment_id

        WHERE e.enrollment_id = ?
    ");

    $stmt->bind_param("i", $enrollment_id);
    $stmt->execute();

    $result = $stmt->get_result();

    if ($result->num_rows > 0) {

        echo json_encode([
            "success" => true,
            "student" => $result->fetch_assoc()
        ]);

    } else {

        echo json_encode([
            "success" => false,
            "message" => "Student not found."
        ]);
    }

    $stmt->close();
}

$conn->close();

?>