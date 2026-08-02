<?php
 header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
 header("Content-Type: application/json");

include "../config/db.php";
 $result = $conn->query("SELECT enrollment_status FROM system_settings LIMIT 1");
 $row = $result->fetch_assoc();
  
 echo json_encode([
    "success" => true,
    "enrollment_status" => $row['enrollment_status']
 ]);
 $conn->close();
?>