<?php

include "../config/db.php";

header("Content-Type: application/json");

$sql = "
  SELECT
s.section_id,
s.section_name,
s.grade_level,
s.min_average,
s.max_average,
s.max_capacity,
s.current_capacity,
st.strand_name
FROM sections s
LEFT JOIN strands st
ON s.strand_id = st.strand_id
ORDER BY s.grade_level ASC
";

$result = $conn->query($sql);

$sections = [];

while ($row = $result->fetch_assoc()) {
    $sections[] = $row;
}

echo json_encode([
    "success" => true,
    "sections" => $sections
]);

$conn->close();

?>