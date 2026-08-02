<?php

include "../config/db.php";

header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $section_name = trim($_POST['section_name']);
    $grade_level = $_POST['grade_level'];
    $strand_id = !empty($_POST['strand_id']) ? $_POST['strand_id'] : NULL;
    $max_capacity = $_POST['max_capacity'];
    $min_average = $_POST['min_average'];
    $max_average = $_POST['max_average'];

    $check = $conn->prepare(
        "SELECT section_id
         FROM sections
         WHERE section_name = ?
         AND grade_level = ?"
    );

    $check->bind_param("ss", $section_name, $grade_level);
    $check->execute();

    if ($check->get_result()->num_rows > 0) {

        echo json_encode([
            "success" => false,
            "message" => "Section already exists."
        ]);

        exit();
    }

  $stmt = $conn->prepare("
INSERT INTO sections
(
    section_name,
    grade_level,
    strand_id,
    min_average,
    max_average,
    max_capacity,
    current_capacity
)
VALUES (?, ?, ?, ?, ?, ?, 0)
");

$stmt->bind_param(
    "ssiddi",
    $section_name,
    $grade_level,
    $strand_id,
    $min_average,
    $max_average,
    $max_capacity
);

    if ($stmt->execute()) {

        echo json_encode([
            "success" => true,
            "message" => "Section created successfully."
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