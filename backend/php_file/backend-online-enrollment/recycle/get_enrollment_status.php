<?php
include "db.php";

$result = $conn->query("SELECT enrollment_status FROM system_settings LIMIT 1");

$row = $result->fetch_assoc();

echo json_encode($row);

$conn->close();

?>