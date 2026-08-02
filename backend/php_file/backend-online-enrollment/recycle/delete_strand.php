<?php
    include "db.php";

    if($_SERVER["REQUEST_METHOD"] == "POST"){
        $stmt = $conn->prepare("DELETE FROM  strands WHERE strand_id = ?");;
        $stmt->bind_param(
            "i",$strand_id
        );
        if($stmt->execute()){
            echo "Strand deleted successfully!";
        }else{
            echo "Error: " . $stmt->error;
        }
        $stmt->close();
    }
    $conn->close();
?>