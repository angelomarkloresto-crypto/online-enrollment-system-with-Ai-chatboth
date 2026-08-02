<?php

header("Content-Type: application/json");

include "../../config/db.php";

if ($_SERVER["REQUEST_METHOD"] != "GET") {

    echo json_encode([
        "success"=>false,
        "message"=>"Invalid request."
    ]);

    exit();

}

$section_id = isset($_GET['section_id']) ? intval($_GET['section_id']) : 0;

if($section_id<=0){

    echo json_encode([
        "success"=>false,
        "message"=>"Invalid section."
    ]);

    exit();

}

$stmt = $conn->prepare("

SELECT

timetable_id,

day,

subject_name,

start_time,

end_time

FROM timetable

WHERE section_id=?

ORDER BY

FIELD(
day,
'Monday',
'Tuesday',
'Wednesday',
'Thursday',
'Friday',
'Saturday'
),

start_time ASC

");

$stmt->bind_param("i",$section_id);

$stmt->execute();

$result = $stmt->get_result();

$data=[];

while($row=$result->fetch_assoc()){

    $data[]=$row;

}

echo json_encode([

    "success"=>true,

    "total"=>count($data),

    "timetable"=>$data

]);

$stmt->close();

$conn->close();

?>