<?php
$conn = new mysqli('localhost', 'root', '', 'online_enrollment');
if ($conn->connect_error) {
    die($conn->connect_error);
}

$email = 'angelomarkloresto@gmail.com';
$password = '12345678';
$hash = password_hash($password, PASSWORD_DEFAULT);
$status = 'Active';

$stmt = $conn->prepare('UPDATE staff SET password = ?, status = ? WHERE email = ?');
$stmt->bind_param('sss', $hash, $status, $email);
$stmt->execute();
echo 'updated=' . $stmt->affected_rows . PHP_EOL;
$stmt->close();
$conn->close();
