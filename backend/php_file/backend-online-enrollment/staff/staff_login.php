<?php 
include "../config/db.php";
session_start();
header("Content-Type: application/json");

function is_valid_staff_password($input_password, $stored_password) {
    if ($stored_password === null || $stored_password === '') {
        return false;
    }

    if (password_verify($input_password, $stored_password)) {
        return true;
    }

    if ($stored_password === $input_password) {
        return true;
    }

    if (md5($input_password) === $stored_password) {
        return true;
    }

    if (sha1($input_password) === $stored_password) {
        return true;
    }

    return false;
}
 
if($_SERVER["REQUEST_METHOD"] == "POST"){
    $email = isset($_POST['email']) ? trim($_POST['email']) : '';
    $password = isset($_POST['password']) ? $_POST['password'] : '';
    $debug = (isset($_GET['debug']) && $_GET['debug'] == '1');

    $stmt = $conn->prepare("SELECT staff_id, full_name, email, password, status FROM staff WHERE LOWER(email) = LOWER(?)");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if($result->num_rows == 0){
        $resp = [ "success" => false, "message" => "Invalid email or password" ];
        if($debug) $resp['debug'] = 'no_user_found';
        echo json_encode($resp);
        exit();
    }
    $staff = $result->fetch_assoc();
    $status = strtolower(trim((string)$staff['status']));
    if($status !== 'active'){
        $resp = [ "success" => false, "message" => "Your account is inactive." ];
        if($debug) $resp['debug'] = 'status_not_active';
        echo json_encode($resp);
        exit();
    }
    if(is_valid_staff_password($password, $staff['password'])){
        if (password_get_info($staff['password'])['algo'] === 0) {
            $new_hash = password_hash($password, PASSWORD_DEFAULT);
            $update_stmt = $conn->prepare("UPDATE staff SET password = ? WHERE staff_id = ?");
            $update_stmt->bind_param("si", $new_hash, $staff['staff_id']);
            $update_stmt->execute();
            $update_stmt->close();
        }

        $_SESSION['staff_id'] = $staff['staff_id'];
        $_SESSION['staff_email'] = $staff['email'];
        $_SESSION['staff_name'] = $staff['full_name'];

        echo json_encode([
            "success" => true, 
            "message" => "Login successful.",
            "staff_id" => $staff['staff_id'],
            "full_name" => $staff['full_name'],
            "email" => $staff['email']
        ]);

    }else{
        $resp = [ "success" => false, "message" => "Invalid email or password" ];
        if($debug) $resp['debug'] = 'wrong_password';
        echo json_encode($resp);
    }
    $stmt->close(); 
}
$conn->close();
?>