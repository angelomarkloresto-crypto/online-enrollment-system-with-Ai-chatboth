<?php
    include "db.php";

    if($_SERVER["REQUEST_METHOD"] == "POST"){
        $section_id = $_POST['section_id'];
        $section_name = $_POST['section_name'];
        $min_average = $_POST['min_average'];
        $max_average = $_POST['max_average'];
        $max_capacity = $_POST['max_capacity'];

        $stmt = $conn->prepare("UPDATE sections SET section_name=?, min_average=?, max_average=?, max_capacity=? WHERE section_id=?");

        $stmt->bind_param(
            "sddii",
            $section_name,
            $min_everage,
            $max_everage,
            $max_capacity,
            $section_id
        );
        if($stmt->execute()){
            echo "Section update successfully!";
        }else{
            echo "Error: " . $stmt->error;
        }
        $stmt->close();
    }
    $conn->close();
?>