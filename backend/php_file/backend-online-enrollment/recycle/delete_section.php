<?php
    include "db.php";

    if($_SERVER["REQUEST_METHOD"] == "POST"){
        $section_id = $_POST['section_id'];
        $stmt = $conn->prepare("DELETE FROM sections WHERE section_id = ?");
        $stmt->bind_param("i", $section_id);

        if($stmt->execute()){
            echo "Section delete successfully!";
        }else{
            echo "Error: " . $stmt->error;
        }
        $stmt-closedir();
    }
    $conn->close();
?>