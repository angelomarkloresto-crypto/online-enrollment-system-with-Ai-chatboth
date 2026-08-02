<?php

include "../config/db.php";

header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $student_id = $_POST['student_id'];
    $current_password = $_POST['current_password'];
    $new_password = $_POST['new_password'];
    $confirm_password = $_POST['confirm_password'];

    // Check if new password matches confirmation
    if ($new_password !== $confirm_password) {
        echo json_encode([
            "success" => false,
            "message" => "New password and confirm password do not match."
        ]);
        exit();
    }

    // Get current password from database
    $stmt = $conn->prepare("
        SELECT password
        FROM students
        WHERE student_id = ?
    ");

    $stmt->bind_param("i", $student_id);
    $stmt->execute();

    $result = $stmt->get_result();

    if ($result->num_rows == 0) {
        echo json_encode([
            "success" => false,
            "message" => "Student not found."
        ]);
        exit();
    }

    $student = $result->fetch_assoc();

    // Verify current password
    if (!password_verify($current_password, $student['password'])) {
        echo json_encode([
            "success" => false,
            "message" => "Current password is incorrect."
        ]);
        exit();
    }

    // Hash new password
    $hashedPassword = password_hash($new_password, PASSWORD_DEFAULT);

    $update = $conn->prepare("
        UPDATE students
        SET password = ?
        WHERE student_id = ?
    ");

    $update->bind_param("si", $hashedPassword, $student_id);

    if ($update->execute()) {

        echo json_encode([
            "success" => true,
            "message" => "Password changed successfully."
        ]);

    } else {

        echo json_encode([
            "success" => false,
            "message" => $update->error
        ]);

    }

    $stmt->close();
    $update->close();
}

$conn->close();

?>