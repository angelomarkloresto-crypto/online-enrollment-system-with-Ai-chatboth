<?php
include "db.php";
    $sql = "SELECT
            e.enrollment_id,
            s.student_id,
            s.first_name,
            s.last_name,
            s.lrn,
            e.grade_level,
            e.student_type,
            e.enrollment_status,
            e.submitted_at FROM enrollments e JOIN students s ON e.student_id = s.student_id WHERE e.enrollment_status = 'Pending' ORDER BY e.submitted_at DESC";
            $result = $conn->query($sql);
            $enrollments = [];
            while($row = $result->fetch_assoc()){
                $enrollments[] = $row;
            }
            echo json_encode($enrollments);
            $conn->close();

?>