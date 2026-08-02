<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
include "../config/db.php";

    if($_SERVER["REQUEST_METHOD"] == 'POST'){
        $staff_id = $_POST['staff_id'];
        $status = $_POST['status'];

        $stmt = $conn->prepare("UPDATE STAFF SET status=? WHERE staff_id=?");
        $stmt->bind_param("si", $status, $staff_id);

        if($stmt->execute()){
            echo "Status update!";
        }else{
            echo "Error: " . $stmt->error;
        }
        $stmt->close();
    }
    $conn->close();
?>