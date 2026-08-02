<?php
$conn = new mysqli('localhost', 'root', '', 'online_enrollment');
if ($conn->connect_error) {
    die($conn->connect_error);
}
$res = $conn->query('SHOW COLUMNS FROM staff');
while ($row = $res->fetch_assoc()) {
    echo $row['Field'] . PHP_EOL;
}
$conn->close();
