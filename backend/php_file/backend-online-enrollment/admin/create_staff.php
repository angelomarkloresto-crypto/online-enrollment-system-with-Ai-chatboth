<?php
include "../config/db.php";
header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $full_name = isset($_POST['full_name']) ? trim($_POST['full_name']) : '';
    $email = isset($_POST['email']) ? trim($_POST['email']) : '';
    $password = isset($_POST['password']) ? $_POST['password'] : '';

    if (empty($full_name) || empty($email) || empty($password)) {
        echo json_encode(["success" => false, "message" => "Full name, email, and password are required."]);
        exit();
    }

    $check = $conn->prepare("SELECT staff_id FROM staff WHERE LOWER(email) = LOWER(?)");
    $check->bind_param("s", $email);
    $check->execute();
    $result = $check->get_result();

    if ($result->num_rows > 0) {
        echo json_encode(["success" => false, "message" => "Email already exists"]);
        $check->close();
        $conn->close();
        exit();
    }
    $check->close();

    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    $status = 'Active';

    $stmt = $conn->prepare("INSERT INTO staff (full_name, email, password, status) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("ssss", $full_name, $email, $hashed_password, $status);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Staff account created successfully!"]);
    } else {
        echo json_encode(["success" => false, "message" => "Error: " . $stmt->error]);
    }

    $stmt->close();
}

$conn->close();
?>