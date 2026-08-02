<?php

include "../config/db.php";

header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $gmail = trim($_POST['gmail']);
    $password = $_POST['password'];

    $stmt = $conn->prepare("
        SELECT
            student_id,
            first_name,
            last_name,
            gmail,
            password,
            status
        FROM students
        WHERE gmail = ?
    ");

    $stmt->bind_param("s", $gmail);
    $stmt->execute();

    $result = $stmt->get_result();

    if ($result->num_rows == 0) {
        echo json_encode([
            "success" => false,
            "message" => "Invalid Gmail or Password."
        ]);
        exit();
    }

    $student = $result->fetch_assoc();

    // Check account status
    if (strtolower($student['status']) != "active") {
        echo json_encode([
            "success" => false,
            "message" => "Your account is inactive."
        ]);
        exit();
    }

    // Verify password
    if (password_verify($password, $student['password'])) {

        echo json_encode([
            "success" => true,
            "message" => "Login successful.",
            "student" => [
                "student_id" => $student['student_id'],
                "first_name" => $student['first_name'],
                "last_name" => $student['last_name'],
                "gmail" => $student['gmail']
            ]
        ]);

    } else {

        echo json_encode([
            "success" => false,
            "message" => "Invalid Gmail or Password."
        ]);

    }

    $stmt->close();
}

$conn->close();

?>