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

$stmt = $conn->prepare("UPDATE enrollments SET enrollment_status = 'Rejected' WHERE enrollment_id = ?");
$stmt->bind_param("i", $enrollment_id);

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        echo json_encode([
            "success" => true,
            "message" => "Enrollment rejected successfully."
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "message" => "Enrollment not found."
        ]);
    }
} else {
    echo json_encode([
        "success" => false,
        "message" => $stmt->error
    ]);
}

$stmt->close();
$conn->close();
?>