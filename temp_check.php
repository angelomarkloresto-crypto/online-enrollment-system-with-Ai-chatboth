<?php
include 'backend/php_file/backend-online-enrollment/config/db.php';
$res = $conn->query("SELECT staff_id, full_name, email, password, status FROM staff ORDER BY staff_id DESC LIMIT 10");
while ($row = $res->fetch_assoc()) {
    echo $row['staff_id'] . '|' . $row['email'] . '|' . $row['password'] . '|' . $row['status'] . PHP_EOL;
}
$conn->close();
