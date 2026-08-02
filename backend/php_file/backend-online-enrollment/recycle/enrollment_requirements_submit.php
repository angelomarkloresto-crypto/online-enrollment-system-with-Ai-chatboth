<?php
    include "db.php";

    if($_SERVER["REQUEST_METHOD"] == "POST"){
        $enrollment_id = $_POST['enrollment_id'];
        $upload_dir = "uploads/";

        function uploadFile($file, $upload_dir){
            if($file['error'] == 0){
                $file_name = time() . "_".basename($file['name']);
                $target = $upload_dir . $file_name;
                if(move_uploaded_file($file['tmp_name'], $target)){
                    return $file_name;
                }
            }
            return NULL;
        }
        $report_card_front = uploadFile($_FILES['report_card_upload'],$upload_dir);
        $report_card_back = uploadFile($_FILES['report_card_back'],$upload_dir);
        $psa_birth_certificate = uploadFile($_FILES['psa_birth_certificate'],$uploadFile);
        $good_moral = isset($_FILES['good_moral']) ? uploadFile($_FILES['good_moral'],$upload_dir)  : NULL;
        $certificate_of_transfer = isset($_FILES['$certificate_of_transfer']) ? uploadFile($_FILES['$certificate_of_transfer'], $upload_dir) : NULL;
        
        if(!$report_card_front || !$report_card_back || !$psa_birth_certificate){
            die("Required documents messing.");
        }
        $stmt = $conn->prepare("INSERT INTO enrollment_requirements(
        enrollment_id, report_card_front, report_card_back,psa_birth_certificate, good_moral, certificate_of_transfer) VALUES (?,?,?,?,?,?)
        ");
        $stmt->bind_param("isssss", $enrollment_id,
        $report_card_front,
        $report_card_back,
        $psa_birth_certificate,
        $good_moral,
        $certificate_of_transfer
        );
        if($stmt->execute()){
            echo "Documents uploaded succeefully!";
        }else{
            echo "Error:" . $stmt->error;
        }
        $stmt->close();

    }
    $conn->close();
?>