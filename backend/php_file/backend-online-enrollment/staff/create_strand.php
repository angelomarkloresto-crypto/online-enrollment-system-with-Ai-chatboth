<?php
include "../config/db.php";
header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $strand_name = trim($_POST['strand_name'] ?? '');

    if ($strand_name === '') {
        echo json_encode([
            "success" => false,
            "message" => "Strand name is required."
        ]);
        exit();
    }

    $check = $conn->prepare(
        "SELECT strand_id FROM strands WHERE strand_name = ?"
    );
    $check->bind_param("s", $strand_name);
    $check->execute();
    $result = $check->get_result();

    if ($result->num_rows > 0) {
        echo json_encode([
            "success" => false,
            "message" => "Strand already exists."
        ]);
        exit();
    }

    $stmt = $conn->prepare(
        "INSERT INTO strands (strand_name) VALUES (?)"
    );
    $stmt->bind_param("s", $strand_name);

    if ($stmt->execute()) {
        echo json_encode([
            "success" => true,
            "message" => "Strand created successfully."
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "message" => $stmt->error
        ]);
    }

    $stmt->close();
    $conn->close();
}
?>