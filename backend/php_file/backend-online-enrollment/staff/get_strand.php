<?php
include "../config/db.php";
header("Content-Type: application/json");

$result = $conn->query(
    "SELECT strand_id, strand_name, created_at FROM strands ORDER BY strand_name ASC"
);

$strands = [];
while ($row = $result->fetch_assoc()) {
    $strands[] = $row;
}

echo json_encode([
    "success" => true,
    "strands" => $strands
]);

$conn->close();
?>