<?php

header("Content-Type: application/json");

include "../config/db.php";

if ($_SERVER["REQUEST_METHOD"] != "GET") {

    echo json_encode([
        "success" => false,
        "message" => "Invalid request."
    ]);

    exit();

}

/*
|--------------------------------------------------------------------------
| GET ALL SECTIONS WITH GENERATED TIMETABLE
|--------------------------------------------------------------------------
*/

$sql = "

SELECT

s.section_id,

s.grade_level,

s.section_name,

st.strand_name,

COUNT(t.timetable_id) AS total_schedule

FROM sections s

LEFT JOIN strands st
ON s.strand_id = st.strand_id

LEFT JOIN timetable t
ON s.section_id = t.section_id

GROUP BY

s.section_id

ORDER BY

CAST(s.grade_level AS UNSIGNED),

s.section_name ASC

";

$result = $conn->query($sql);

$data = [];

while ($row = $result->fetch_assoc()) {

    $data[] = [

        "section_id" => $row['section_id'],

        "grade_level" => $row['grade_level'],

        "section_name" => $row['section_name'],

        "strand_name" => $row['strand_name'],

        "total_schedule" => $row['total_schedule'],

        "generated" => ($row['total_schedule'] > 0)

    ];

}

echo json_encode([

    "success" => true,

    "total_sections" => count($data),

    "sections" => $data

]);

$conn->close();

?>