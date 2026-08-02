<?php
    include "db.php";

    if(!isset($_GET['token'])){
        die("Invalid request.");
    }

    $token = $_GET['token'];
    $stmt = $conn->prepare("SELECT email, expires_at FROM password_reset WHERE token=?");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();

    if($result->num_rows == 0){
        die("Invalid token.");
    }
    $row = $result->fetch_assoc();
    if(strtotime($row['expires_at']) < time()){
        die("Token expired.");
    }
    $email = $row['email'];
    if($_SERVER["REQUEST_METHOD"] == "POST"){
        $newPassword = password_hash($_POST['password'], PASSWORD_DEFAULT);

        $conn->query("UPDATE students SET password='$newPassword' WHERE email= '$email'");
        $conn->query("UPDATE staff SET password='$newPassword' WHERE email= '$email'");
        $conn->query("UPDATE admins SET password='$newPassword' WHERE email= '$email'");
        $conn->query("DELETE FROM password_ressets WHERE token='token'");

        echo "Password updated successfully!";

    }
$conn->close();
?>