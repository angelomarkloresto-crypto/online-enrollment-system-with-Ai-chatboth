<?php
    include "db.php";
    session_start();
    if($_SERVER["REQUEST_METHOD"] == "POST"){
        $email = $_POST['email'];
        $password = $_POST['password'];
        $stmt = $conn->prepare("SELECT * FROM students WHERE email=?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();

        if($result->num_rows === 1){
            $students = $result->fetch_assoc();
            if(password_verify($password, $student['password'])){
                $_SESSION['student_id'] = $student['student_id'];
                $_SESSION['student_name'] = $student['first_name'];

                echo json_encode([
                    "status" => "success",
                    "message" => "Login successfull"
                ]);
            }else{
                echo json_encode([
                    "status" => "error",
                    "message" => "Invalid password"
                ]);
            }
        
        }else{
            echo json_encode([
                "status" => "error",
                "message" => "Email not found"
            ]);
        }
            $stmt->close();

        }
        $conn->close();
?>