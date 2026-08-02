<?php
    include "db.php";

    if($_SERVER["REQUEST_METHOD"] == "POST"){
        $email = $_POST['email'];
        $checkStudent = $conn->prepare("SELECT email FROM students WHERE email=?");
        $checkStudent->bind_param("s", $email);
        $checkStudent->execute();
        $studentResult = $checkStudent->get_result();

        $checkStaff = $conn->prepare("SELECT email FROM staff WHERE email=?");
        $checkStaff->bind_param("s", $email);
        $checkStaff->execute();
        $staffResult = $checkStaff->get_result();

        $checkAdmin = $conn->prepare("SELECT email FROM admins WHERE email=?");
        $checkAdmin->bind_param("s", $email);
        $checkAdmin->execute();
        $adminResult = $checkAdmin->get_result();

        if($studentResult->num_rows == 0 &&
           $staffResult->num_rows == 0 && 
           $adminResult->num_rows == 0){
            die("Email not fund.");

            $token = bin2hex(random_bytes(32));
            $expires = date("Y-m-d H:i:s", strtotime("+1hour"));
            $stmt = $conn->prepare("INSERT INTO password_resets (email, token, expires_at) VALUES (?,?,?)");
            $stmt->bind_param("sss", $email, $token, $expires);
            $stmt-> execute();
            //change the domain 
            $resetLink = "http://http://localhost/backend-online-enrollmen/reset_password.php?token=" . $token;
                echo "Password reset link: " . $$resetLink;
                $stmt->close();
         }
    $conn->close();
    }
?>