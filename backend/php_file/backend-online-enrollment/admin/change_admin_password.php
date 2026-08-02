<?php
include "../config/db.php";

header("Content-Type: application/json");

if($_SERVER["REQUEST_METHOD"] == "POST"){
    $smin_id = $_POST['admin_id'];
    $current_password = $_POST['current_password'];
    $new_password = $_POST['new_password'];
    $stmt = $conn->prepare("SELECT password FROM admins WHERE admin_id = ?");

    $stmt->bind_param("i", $admin_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if($result->num_rows == 0){
        echo json_encode([
            "success" => false,
            "message" => "Admin not found."
        ]);
        exit();
    }
    $admin = $result->fetch_assoc();
    if(!password_verify($current_password, $admin['password'])){
        echo json_encode([
            "success" => false,
            "message" => "Current password is incorrect."
        ]);
        $hashed_password = password_hash(
            $new_password,
            PASSWORD_DEFAULT
        );
        $update = $conn->prepare(
            "UPDATE admins SET password = ? WHERE admin_id = ?"
        );
        $update->bind_param(
            "si", $hashed_password,
            $admin_id
        );
        if($update->execute()){
            echo json_encode([
                "success" => true,
                "message" => "Password changed successfully."
            ]);
        }else{
            echo json_encode([
                "success" => false,
                "message" => $update->error
            ]);
        }
        $update->close();
        $stmt->close();

    }
    $conn->close();
}
?>