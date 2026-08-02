<?php
include "../config/db.php";

    $checkAdmin = mysqli_query($conn, "SELECT * FROM admins LIMIT 1");
    if(mysqli_num_rows($checkAdmin) > 0){
        echo json_encode([
            "success" => false,
            "mesage" => "Admin account already exists."
        ]);
        exit();
    }

    $check = $conn->query("SELECT COUNT(*) as total FROM admins");
    $row = $check->fetch_assoc();

    if($row['total'] > 0){
        die("Amin registration is disabled.");

    }
    if($_SERVER["REQUEST_METHOD"] == "POST"){
        $email = $_POST['email'];
        $password = password_hash($_POST['password'],PASSWORD_DEFAULT);
        $stmt = $conn->prepare("INSERT INTO admins (email, password) VALUES (?,?)");
        $stmt->bind_param("ss", $email, $password);
        if($stmt->execute()){
            echo "Admin accounts created successfully!";
        } else{
            echo "Error:" > $stmt->error;

        }
        $stmt->close();

    }
    $conn->close();
    


?>