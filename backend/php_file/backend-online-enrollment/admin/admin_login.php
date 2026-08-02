<?php
   header("Content-Type: application/json");
include "../config/db.php";

    if($_SERVER["REQUEST_METHOD"] == "POST") {
        $data = json_decode(file_get_contents("php://input"), true);
        $data = is_array($data) ? $data : [];

        $email = trim($data['email'] ?? '');
        $password = trim($data['password'] ?? '');

        if(empty($email) || empty($password)){
           
                echo json_encode([
                    "success" => false,
                    "message" => "Email and Password are required."
                ]);
                exit();
                
        }
        $stmt = $conn->prepare("SELECT admin_id, email, password FROM admins WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();
        if($result->num_rows === 0){
            echo json_encode([
                "success" => false,
                "message" => "Invalid email or password."
            ]);
            exit();
        }
        $admin = $result->fetch_assoc();
        if(!password_verify($password, $admin['password'])){
            echo json_encode([
                "success" => false,
                "message" => "Invalid email or password."
            ]);
            exit();
        }

        session_start();

        $_SESSION['admin_id'] = $admin['admin_id'];
        $_SESSION['admin_email'] = $admin['email'];

        echo json_encode([
            "success" => true,
            "message" => "Login successful.",
            "admin_id" => $admin['admin_id']
        ]);
        $stmt->close();

    }

    $conn->close();
?>