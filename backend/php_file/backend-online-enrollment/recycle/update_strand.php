<?php
    include "db.php";

    if($_SERVER["REQUEST_METHOD"] == "POST"){
        $strand_id = $_POST['strand_id'];
        $strand_name = trim($_POST['strand_name']);

        if(empty($strand_name)){
            die("Strand name is required.");
        }
        $stmt = $conn->prepare("UPDATE strands SET strand_name = ? WHERE strand_id = ?");
        $stmt->bind_param("si", $strand_name, $strand_id);

        if($stmt->execute()){
            echo "Strand update successfully!";
        }else{
            echo "Error:" . $stmt->error;
        }
        $stmt->close();
    }
    $conn->close();
?>