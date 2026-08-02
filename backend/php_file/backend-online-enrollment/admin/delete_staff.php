<?php
include "../config/db.php";

    if($_SERVER["REQUEST_METHOD"] == "POST"){
        $staff_id = $_POST['staff_id'];
        $stmt = $conn->prepare("DELETE FROM staff WHERE staff_id=?");
        $stmt->bind_param("i", $staff_id);

            if($stmt->execute()){
                echo "Staff deleted!";
            }else{
               
                    echo "Error: " . $stmt->error;        
            }
             $stmt->close();
    } 
    $conn->close(); 
?>