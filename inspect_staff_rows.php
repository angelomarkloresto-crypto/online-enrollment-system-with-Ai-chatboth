<?php
$conn = new mysqli('localhost', 'root', '', 'online_enrollment');
if ($conn->connect_error) {
    die($conn->connect_error);
}
$res = $conn->query("SELECT staff_id, full_name, email, password, status FROM staff ORDER BY staff_id DESC");
while ($row = $res->fetch_assoc()) {
    echo json_encode($row) . PHP_EOL;
}
$conn->close();
