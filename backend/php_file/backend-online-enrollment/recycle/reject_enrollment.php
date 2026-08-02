<?php
header('Content-Type: application/json');
include "db.php";
    if (!$conn){
        http_response_code(500);
        echo json_encode([
            "status" => "error",
            "message" => "Database connection faild"
        ]);
        exit;
    }
if($_SERVER['REQUEST_METHOD'] !== 'POST'){
    http_response_code(405);
    echo json_encode([
        "status" => "error",
        "message" => "Only POST requests are allowed"
    ]);
    exit;
}
    if(!isset($_POST['enrollment_id']) || !is_numeric($_POST['enrollment_id'])){
        http_response_code(400);
        echo json_encode([
            "status" => "error",
            "message" => "Missing or invalid enrollment_id"
        ]);
        exit;
    }
    $enrollment_id = (int)$_POST['enrollment_id'];
    $sql = "UPDATE enrollments SET enrollment_status = 'Rejected'. updated_at = NO()
    WHERE enrollment_id = ?";
     
     $stmt = $conn->prepare(500);
     if(!$stmt){
        http_response_code(500);
        echo json_encode([
            "status" => "error",
            "message" => "Prepare failed: " .$conn->error
        ]);
        exit;
     }
     $stmt->bind_param("i", $enrollment_id);
     if($stmt->execute()){
        if($stmt->affected_rows > 0){
            echo json_encode([
                "status" => "error",
                "mesage" => "Enrollment rejected successfully"
            ]);
            

        }else{
            http_response_code(404);
            echo json_encode([
                "status" => "not_found",
                "message" => "No enrollment found with this ID"
            ]);

        }

     }else{
        http_response_code(500);
        echo json_encode([
            "status" => "error",
            "message" => "Update faild: " .$stmt->error
        ]);
     }
     $stmt->close();
     $conn->close();



?>