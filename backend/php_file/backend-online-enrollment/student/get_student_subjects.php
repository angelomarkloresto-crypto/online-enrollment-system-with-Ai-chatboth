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
| GET STUDENT SECTION
|--------------------------------------------------------------------------
*/

$sectionQuery = $conn->prepare("

SELECT

section_id

FROM enrollments

WHERE

student_id=?

AND

enrollment_status='Approved'

LIMIT 1

");

$sectionQuery->bind_param("i",$student_id);

$sectionQuery->execute();

$result = $sectionQuery->get_result();

if($result->num_rows==0){

    echo json_encode([

        "success"=>false,

        "message"=>"Student has no approved enrollment."

    ]);

    exit();

}

$section = $result->fetch_assoc();

$section_id = $section['section_id'];

/*
|--------------------------------------------------------------------------
| GET UNIQUE SUBJECTS
|--------------------------------------------------------------------------
*/

$subjectQuery = $conn->prepare("

SELECT DISTINCT

subject_name

FROM timetable

WHERE section_id=?

ORDER BY subject_name ASC

");

$subjectQuery->bind_param("i",$section_id);

$subjectQuery->execute();

$subjectResult = $subjectQuery->get_result();

$subjects=[];

while($row=$subjectResult->fetch_assoc()){

    $subjects[]=$row['subject_name'];

}

/*
|--------------------------------------------------------------------------
| RESPONSE
|--------------------------------------------------------------------------
*/

echo json_encode([

    "success"=>true,

    "total_subjects"=>count($subjects),

    "subjects"=>$subjects

]);

$sectionQuery->close();

$subjectQuery->close();

$conn->close();

?>