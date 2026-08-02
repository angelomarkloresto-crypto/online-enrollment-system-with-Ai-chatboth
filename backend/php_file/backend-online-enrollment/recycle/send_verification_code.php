<?php
require 'PHPMailer-master/src/Exception.php';
require 'PHPMailer-master/src/PHPMailer.php';
require 'PHPMailer-master/src/SMT.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'vendor/autoload.php';
include 'db.php';

header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"),true);

$email = trim($data['email'] ?? '');
if(empty($email)){
    echo json_encode([
        "success" => false,
        "message" => "Email is required."
    ]);
    exit();
}
// Generate 6 digit code
$verification_code = rand(100000, 999999);
//Expiration 5 minutes
$expires_at = date('Y-m-d H:i:s', strtotime('+5minutes'));

mysqli_query($conn, "DELETE FROM email_verifications WHERE email='$email'");

$stmt = $conn->prepare("
    INSERT INTO email_verifications
    (email, verification_code, expires_at)
    VALUES (?, ?, ?)");

$stmt->bind_param(
    "sss",
    $email,
    $verification_code,
    $expires_at
);
$stmt->execute();
$mail = new PHPMailer(true);
try{
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'geloloresto@gmail.com';
    $mail->Password = 'Popy12345678';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;
    $mail->setFrom(
        'yourgmail@gmail.com',
        'Online Enrollment System'
    );
    $mail->addAddress($email);
    $mail->isHTML(true);
    $mail->Subject = 'Admin Verification Code';
    $mail->Body = "
    <h3>Admin Registration Verification</h3>
    <p>Your verification code is:</p>
    <h2> $verification_code </h2>
    <p>This code will expire in 5 minutes.</p>
    ";

    $mail->send();
     echo json_encode([
        "success" => true,
        "message" => "Verification code sent successfully."
     ]);

}
catch (Exception $e){
    echo json_encode([
        "success" => false,
        "message" => $mail->ErrorInfo
    ]);
}


?>