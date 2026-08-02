<?php

include "../config/db.php";

$sql = "SELECT COUNT(*) AS total_admins From admins";
$result = mysqli_query($conn, $sql);
$row = mysqli_fetch_assoc($result);

if($row['total_admins'] > 0) {
    echo json_encode([
        "exist" => true,
        "message" => "Admin account already exists."
    ]);
}else{
    echo json_encode([
        "exists" => false,
        "message" => "No Admin account found."
    ]);
}
?>