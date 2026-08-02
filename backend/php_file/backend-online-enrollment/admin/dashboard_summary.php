<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json");
include "../config/db.php";

$totalStudents = $conn->query(
    "SELECT COUNT(*) AS total FROM students"
)->fetch_assoc()['total'];
$pendingEnrollments = $conn->query("SELECT COUNT(*) AS total FROM enrollments WHERE enrollment_status='Pending'")->fetch_assoc()['total'];
$approvedEnrollments = $conn->query("SELECT COUNT(*) AS total FROM enrollments WHERE enrollment_status='Approved'")->fetch_assoc()['total'];
$rejectedEnrollments = $conn->query("SELECT COUNT(*) AS total FROM enrollments WHERE enrollment_status='Rejected'")->fetch_assoc()['total'];

echo json_encode([
    "success" => true,
    "total_students" => $totalStudents,
    "pending_enrollments" => $pendingEnrollments,
    "approved_enrollment" => $approvedEnrollments,
    "rejected_enrollments" => $rejectedEnrollments
]);

?>