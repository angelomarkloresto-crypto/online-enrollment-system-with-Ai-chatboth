<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
include "../config/db.php";

    if($_SERVER["REQUEST_METHOD"] == "POST"){
        $status = $_POST['enrollment_status'] ?? '';
        if(
            $status === "Open" || 
            $status === "Closed"
        ){
            $stmt = $conn->prepare(
                "UPDATE system_settings SET enrollment_status=?"
            );
            $stmt->bind_param("s", $status);
            if($stmt->execute()){
                echo "Enrollment status updated successfully";
            }else{
                echo "Error: " . $stmt->error;
            }
            $stmt->close();
        }
        $conn->close();
    }
?>