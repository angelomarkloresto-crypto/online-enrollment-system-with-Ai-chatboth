<?php

include "../config/db.php";

if($_SERVER["REQUEST_METHOD"] == "POST"){

    $staff_id = $_POST['staff_id'];
    $full_name = $_POST['full_name'];
    $email = $_POST['email'];

    $stmt = $conn->prepare(
        "UPDATE staff SET full_name=?, email=? WHERE staff_id=?"
    );

    $stmt->bind_param(
        "ssi",
        $full_name,
        $email,
        $staff_id
    );

    if($stmt->execute()){

        echo "Staff updated successfully!";

    }else{

        echo "Error: " . $stmt->error;

    }

    $stmt->close();
}

$conn->close();

?>