<?php
    include "db.php";

    $sql = "SELECT sections.*, strands.strand_name FROM sections LEFT JOIN strands ON sections.strand_id = strands.strand_id ORDER BY grade_level";
    $result = $conn->query($sql);
    $data = [];
    while($row = $result->fetch_assoc()){
        $data[] = $row;
    }
    echo json_encode($data);
    $conn->close();
?>