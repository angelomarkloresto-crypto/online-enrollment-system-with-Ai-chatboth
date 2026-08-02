<?php
    include "db.php";

    if($_SERVER["REQUEST_METHOD"] == "POST"){
        $chechStatus = $conn->query("SELECT enrollment_status FROM system_settings LIMIT 1");
        $statusRow = $checkStatus->fetch_assoc();

        if($statusRow['enrollment_status'] === 'Closed'){
            die("Enrollment id currently close.");
        }
        $student_id = $_POST['student_id'];
        $strand_id = $_POST['strand_id'];
        $grade_level = $_POST['grade_level'];
        $check = $conn->prepare("SELECT enrollment_id FROM enrollments WHERE student_id=?");
        $check->execute();
        $result = $check->get_result();

        if($result->num_rows > 0){
            die("Student already enrolled.");
        }
        $check->close();
        $stmt = $conn->prepare("INSERT INTO enrollments (student_id, strand_id, grade_level, status) VALUE (?,?,?, 'pending')");
        $stmt->bind_param("iii", $student_id, $strand_id, $grade_level);
        if($stmt->execute()){
            echo "Error: " . $stmt->error;
        }
        $stmt->close();
    }
    $conn->close();
?>