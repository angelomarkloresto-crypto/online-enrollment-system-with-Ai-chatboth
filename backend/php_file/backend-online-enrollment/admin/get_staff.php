<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
include "../config/db.php";

header("Content-Type: application/json");

$sql = "SELECT staff_id, full_name, email, status FROM staff ORDER BY staff_id DESC";

$result = $conn->query($sql);
$staffs = [];

while($row = $result->fetch_assoc()){
    $staffs[] = $row;
}
echo json_encode([
    "success" => true,
    "message" => $staffs
]);
$conn->close();

?>