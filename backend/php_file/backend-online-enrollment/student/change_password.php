<?php

header("Content-Type: application/json");

include "../config/db.php";

if ($_SERVER["REQUEST_METHOD"] != "POST") {

    echo json_encode([
        "success" => false,
        "message" => "Invalid request."
    ]);

    exit();

}

$student_id = intval($_POST['student_id'] ?? 0);

$current_password = trim($_POST['current_password'] ?? '');

$new_password = trim($_POST['new_password'] ?? '');

$confirm_password = trim($_POST['confirm_password'] ?? '');

/*
|--------------------------------------------------------------------------
| VALIDATION
|--------------------------------------------------------------------------
*/

if (

    $student_id <= 0 ||

    empty($current_password) ||

    empty($new_password) ||

    empty($confirm_password)

){

    echo json_encode([

        "success"=>false,

        "message"=>"Please complete all fields."

    ]);

    exit();

}

if($new_password != $confirm_password){

    echo json_encode([

        "success"=>false,

        "message"=>"Password confirmation does not match."

    ]);

    exit();

}

if(strlen($new_password) < 8){

    echo json_encode([

        "success"=>false,

        "message"=>"Password must be at least 8 characters."

    ]);

    exit();

}

/*
|--------------------------------------------------------------------------
| GET CURRENT PASSWORD
|--------------------------------------------------------------------------
*/

$stmt = $conn->prepare("

SELECT password

FROM students

WHERE student_id=?

LIMIT 1

");

$stmt->bind_param("i",$student_id);

$stmt->execute();

$result = $stmt->get_result();

if($result->num_rows==0){

    echo json_encode([

        "success"=>false,

        "message"=>"Student not found."

    ]);

    exit();

}

$user = $result->fetch_assoc();

/*
|--------------------------------------------------------------------------
| VERIFY PASSWORD
|--------------------------------------------------------------------------
*/

if(!password_verify($current_password,$user['password'])){

    echo json_encode([

        "success"=>false,

        "message"=>"Current password is incorrect."

    ]);

    exit();

}

/*
|--------------------------------------------------------------------------
| UPDATE PASSWORD
|--------------------------------------------------------------------------
*/

$newHash = password_hash(

    $new_password,

    PASSWORD_DEFAULT

);

$update = $conn->prepare("

UPDATE students

SET password=?

WHERE student_id=?

");

$update->bind_param(

    "si",

    $newHash,

    $student_id

);

if($update->execute()){

    echo json_encode([

        "success"=>true,

        "message"=>"Password changed successfully."

    ]);

}else{

    echo json_encode([

        "success"=>false,

        "message"=>"Failed to change password."

    ]);

}

$stmt->close();

$update->close();

$conn->close();

?>