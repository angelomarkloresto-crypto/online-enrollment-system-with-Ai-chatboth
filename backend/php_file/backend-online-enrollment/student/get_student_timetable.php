<?php

header("Content-Type: application/json");

include "../config/cors.php";
include "../config/db.php";

if ($_SERVER["REQUEST_METHOD"] != "GET") {

    echo json_encode([
        "success" => false,
        "message" => "Invalid request."
    ]);

    exit();
}

$student_id = intval($_GET['student_id'] ?? 0);

if ($student_id <= 0) {

    echo json_encode([
        "success" => false,
        "message" => "Invalid student."
    ]);

    exit();
}

/*
|--------------------------------------------------------------------------
| GET STUDENT ENROLLMENT
|--------------------------------------------------------------------------
*/

$enrollment = $conn->prepare("

SELECT

e.section_id,
e.grade_level,
e.enrollment_status,

s.section_name,

st.strand_name

FROM enrollments e

INNER JOIN sections s
ON e.section_id=s.section_id

LEFT JOIN strands st
ON s.strand_id=st.strand_id

WHERE

e.student_id=?

AND

e.enrollment_status='Approved'

LIMIT 1

");

$enrollment->bind_param("i",$student_id);

$enrollment->execute();

$result = $enrollment->get_result();

if($result->num_rows==0){

    echo json_encode([

        "success"=>false,

        "message"=>"You are not yet approved."

    ]);

    exit();

}

$student=$result->fetch_assoc();

$section_id=$student['section_id'];

/*
|--------------------------------------------------------------------------
| GET TIMETABLE
|--------------------------------------------------------------------------
*/

$timetable = $conn->prepare("

SELECT

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

$timetable->bind_param("i",$section_id);

$timetable->execute();

$timetableResult=$timetable->get_result();

$schedule=[];

while($row=$timetableResult->fetch_assoc()){

    $schedule[]=$row;

}

/*
|--------------------------------------------------------------------------
| RESPONSE
|--------------------------------------------------------------------------
*/

echo json_encode([

    "success"=>true,

    "grade_level"=>$student['grade_level'],

    "strand"=>$student['strand_name'],

    "section"=>$student['section_name'],

    "total_subjects"=>count($schedule),

    "timetable"=>$schedule

]);

$enrollment->close();

$timetable->close();

$conn->close();

?>