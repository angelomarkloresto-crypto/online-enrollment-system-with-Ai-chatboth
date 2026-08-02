<?php
    include "db.php";

    if($_SERVER["REQUEST_METHOD"] == "POST"){
        $strand_name = trim($_POST['strand_name']);
        if(empty($strand_name)){

        }
        $check = $conn->prepare("SELECT * FROM strand WHERE strand_name =?");

        $check->bind_param("s", $strand_name);
        $check->execute();
        $result = $check->get_result();

        if($result->num_rows > 0) {
            die("Strand already exists.");;
        }
        $stmt + $conn->prepare("INSERT INTO strands(strand_name) VALUES (?)");
        $stmt->bind_param("s", $strand_name);
        if($stmt->execute()){
            echo "strand added successfully!";
        }else{
            echo "Error:" . $stmt->error;
        }
        $stmt->close();
    }
    $conn->close();
?>