<?php
    include "db.php";
    session_start();

    if(!isset($_SESSION['student_id'])){
        die("Not logged in.");
    }
    if($_SERVER["REQUEST_METHOD"] == "POST"){
        $student_id = $_SESSION['student_id'];
        $oldPassword = $_POST['old_password'];
        $newPassword = $_POST['new_password'];
        $stmt = $conn->prepare("SELECT password FROM student WHERE student_id=?");
        $stmt->bind_param("i", $student_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result->fetch_assoc();
        
        if(!password_verify($oldPassword, $user['password'])){
            die("Old password incorrect.");
        }
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        $update = $conn->prepare("UPDATE students SET password=? WHERE student_id=?");
        $update->bind_param("si", $hashedPassword, $student_id);
        if($update->execute()){
            echo "Password chsnge successfuly.";
        }else{
            echo "Error updating password.";

        }
        $update->close();
    }
    $conn->close();
?>