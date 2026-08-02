<?php

include "../config/db.php";

header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $strand_id = $_POST['strand_id'];

    $stmt = $conn->prepare(
        "DELETE FROM strands
         WHERE strand_id = ?"
    );

    $stmt->bind_param("i", $strand_id);

    if ($stmt->execute()) {

        echo json_encode([
            "success" => true,
            "message" => "Strand deleted successfully."
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