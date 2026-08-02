<?php

include "../config/db.php";

header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $strand_id = $_POST['strand_id'];
    $strand_name = trim($_POST['strand_name']);


    $check = $conn->prepare(
        "SELECT strand_id
         FROM strands
         WHERE strand_name = ?
         AND strand_id != ?"
    );

    $check->bind_param("si", $strand_name, $strand_id);
    $check->execute();

    $result = $check->get_result();

    if ($result->num_rows > 0) {

        echo json_encode([
            "success" => false,
            "message" => "Strand name already exists."
        ]);

        exit();
    }

    $stmt = $conn->prepare(
        "UPDATE strands
         SET strand_name = ?
         WHERE strand_id = ?"
    );

    $stmt->bind_param("si", $strand_name, $strand_id);

    if ($stmt->execute()) {

        echo json_encode([
            "success" => true,
            "message" => "Strand updated successfully."
        ]);

    } else {

        echo json_encode([
            "success" => false,
            "message" => $stmt->error
        ]);

    }

    $stmt->close();
}

$conn->close();

?>