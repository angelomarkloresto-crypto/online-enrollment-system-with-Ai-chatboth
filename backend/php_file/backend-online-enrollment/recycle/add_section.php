<?php
    include "db.php";

    if($_SERVER["REQUEST_METHOD"] == "POST"){
        $grade_level = $_POST['grade_level'];
        $strand_id = !empty($_POST['strand_id']) ? $_POST['strand_id'] : NULL;
        $section_name = $_POST['section_name'];
        $min_average = !empty($_POST['men_average']) ? $_POST['min_average'] : NULL;
        $max_everage = !empty($_POST['max_average']) ? $_POST['max_average'] : NULL;
        $stmt = $conn->prepare("INSERT INTO sections (grade_levell, strand_id, max_capacity) VALUE (?,?,?,?,?,?)");

        $stmt->bind_param(
            "sissdi",
            $grade_level,
            $strand_id,
            $section_name,
            $min_average,
            $max_average,
            $max_capacity
        );
        if($stmt->execute()){
            echo "Section added successfully!";
        }else{
            echo "Error: " . $stmt->error;
        }
        $stmt->close();
    }
    $conn->close();
?>