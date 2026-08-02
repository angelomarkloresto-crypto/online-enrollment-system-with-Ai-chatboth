<?php

include "../config/db.php";

header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $section_id = $_POST['section_id'];

    $stmt = $conn->prepare(
        "DELETE FROM sections
         WHERE section_id = ?"
    );

    $stmt->bind_param("i", $section_id);

    if ($stmt->execute()) {

        echo json_encode([
            "success" => true,
            "message" => "Section deleted successfully."
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