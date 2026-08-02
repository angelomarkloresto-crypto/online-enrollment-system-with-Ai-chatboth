<?php
include "../config/db.php";
header("Content-Type: application/json");

if($_SERVER["REQUEST_METHOD"] == "GET"){
    $admin_id = $_GET['admin_id'];
    $stmt = $conn->prepare(
        "SELECT admin_id,email, created_at FROM admins WHERE admin_id = ?"
    );
    $stmt->bind_param("i", $admin_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if($result->num_rows > 0){
        $admin = $result->fetch_assoc();
        echo json_encode([
            "success" => true, 
            "admin" => $admin
        ]);
    }else{
        echo json_encode([
            "success" => false,
            "message" => "Admin not found."
        ]);
    }
    $stmt->close();
}
$conn->close();

?>