<?php

header("Content-Type: applicatiion/json");
include 'db.php';

$data = json_decode(file_get_contents("php://input"), true);

$email = trim($data['email'] ?? '');
$verification_code = trim($data['verification_code'] ?? '');

if(empty($email) || empty($verification_coce)) {
    echo json_encode([
        "success" => false,
        "message" => "Email and verification code are required."
    ]);
    $stmt = $conn->prepare("
    SELECT * FROM email_verifications WHERE email =? AND verification_code = ? LIMIT 1");
    
    $stmt->bind_param(
        "ss",
        $email,
        $verification_code
    );
    $stmt->execute();
    $result = $stmt->get_result();
    if($result->num_rows === 0){
        echo json_encode([
            "success" =>false,
            "message" => "Invalid verification code."
        ]);
        exit();
    }
$row = $result->fetch_assoc();
$current_time = date('Y-m-d H:i:s');
if($current_time > $row['expires_at']){
    echo json_encode([
        "success" => false,
        "message" => "Verification code has expired."
    ]);
    exit();
}
echo json_encode([
    "success" => false,
    "message" => "Verifiction code has expired."
]);
echo json_encode([
     "success" => true,
     "message" => "Verification successful."
 ]);
}
?>