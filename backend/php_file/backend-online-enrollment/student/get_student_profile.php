<?php
// ✅ cors.php FIRST before any output
include "../config/cors.php";
include "../config/db.php";

// ✅ Changed from POST to GET - frontend calls this with GET ?student_id=X
if ($_SERVER["REQUEST_METHOD"] === "GET") {
    $student_id = intval($_GET['student_id'] ?? 0);

    if ($student_id <= 0) {
        echo json_encode(["success" => false, "message" => "Invalid student ID."]);
        exit();
    }

    $stmt = $conn->prepare("
        SELECT
            student_id, first_name, last_name, middle_name, suffix,
            lrn, contact_no, gmail, date_of_birth, age, nationality,
            province, city_municipality, barangay, street_house_no,
            guardian_fullname, guardian_relationship, guardian_contact_no
        FROM students
        WHERE student_id = ?
    ");

    $stmt->bind_param("i", $student_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        echo json_encode(["success" => true, "student" => $result->fetch_assoc()]);
    } else {
        echo json_encode(["success" => false, "message" => "Student not found."]);
    }
    $stmt->close();
}
$conn->close();
?>
