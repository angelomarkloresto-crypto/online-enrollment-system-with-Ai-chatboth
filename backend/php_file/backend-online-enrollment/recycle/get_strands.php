<?php
    include "db.php";

    $result = $conn->query("SELECT * FROM strands ORDER BY created_at DESC");
    
    $strands = [];
    while($row = $result->fetch_assoc()){
        $strands[] = $row;
    }
    echo json_encode($strands); 
    $conn->close();

?>