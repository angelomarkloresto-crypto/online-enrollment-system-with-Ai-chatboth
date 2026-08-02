<?php
    include "db.php";
    session_start();

    if (!isset($_SESSION['student_id'])){
        die("Unauthorized access.");
    }
    if ($_SERVER["REQUEST_METHOD"] == "POST"){
        $student_id = $_SESSION['student_id'];
        $student_type = $_POST['student_type'];
        $grade_level = $POST['grade_level'];
        $strand_id = !empty($POST['strand_id']) ? $POST['strand_id'] : NULL;

        $average_grade = NULL;
        $ocr_status = "Pending";

        $stmt = $conn->prepare("INSERT INTO enrollments (
        studebt_id, student_type, grade_level, strand_id, average_grade, ocr_status, enrollment_status
        ) VALUES (?,?,?,?,?,?,?) ");
        $stmt->bind_param(
            $student_id, $student_type,$grade_level, $strand_id, $$average_grade, $ocr_status, $enrollment_status
        );
        if($stmt->execute()){
            echo "Enrollment Submitted Successfully";

        }else{
            echo "Error:" .$stmt->error;
        }
        $stmt->close();

    }
    $conn->close();

?>