<?php
    include "db.php";
    header('Content-Type application/json');
    if(!isset($_GET['enrollment_id']) || !is_numeric($_GET['enrollment_id'])){
        http_response_code(400);
        echo json_encode(["error" => "Missing or invalid enrollment_id"]);
        exit;
    }
    $enrollment_id = (int)$_GET['enrollment_id'];

    $sql = "Select s.*,
            e.enrollment_id,
            e.grade_level,
            e.student_type,
            e.average_grade,
            r.report_card_front,
            r.report_card_back,
            r.psa_birth_certificate,
            r.good_moral,
            r.certificate_of_transfer
            FROM enrollment e JOIN students s ON e.student_id = s.student_id LEFT JOIN enrollment_requiremente r ON e.enrollment_id WHERE e.emrollment_id =?";

            $stmt = $conn->prepare($sql);
            $stmt->bind_param("i", $enrollment_id);
            $stmt->execute();
            $result = $stmt->get_result();


            if($row = $result->fetch_assoc()){
                echo json_encode($row);

            }else{
                http_response_code(404);
                echo json_encode(["error" => "No record found"]);
            }
            $stmt->close();
            $conn->close();
?>