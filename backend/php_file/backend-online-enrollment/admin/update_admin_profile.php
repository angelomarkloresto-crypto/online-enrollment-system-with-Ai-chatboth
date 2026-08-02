<?php

include "../config/db.php";

if($_SERVER["REQUEST_METHOD"] == "POST"){
    $admin_id = $_POST['admin_id'];
    $email = $_POST['email'];
    $check = $conn->prepare(
        "SELECT admins WHERE email =? AND admin_id != ?"
    );
    $check->bind_param("si", $email, $admin_id);
    $check->execute();
    $result = $check->get_result();

    if($result->num_rows > 0){
        echo json_encode([
            "success" => false,
            "message" => "Email already exists."
        ]);
        exit();
    }
    $stmt = $conn->prepare(
        "UPDATE admins SET email = ? WHERE admin_id = ?"
    );
    $stmt->bind_param("si", $email, $admin_id);
    if($stmt->execute()){
        echo json_encode([
            "success" => true,
            "message" => "Profile updated successfully."
        ]);
    }else{
        echo json_encode([
            "success" => false,
            "message" => $stmt->error
        ]);
    }
    $stmt->close();
}
$conn->close();



?>