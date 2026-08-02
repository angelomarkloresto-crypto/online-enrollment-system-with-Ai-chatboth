<?php

header("Content-Type: application/json");

include "../config/db.php";

if ($_SERVER["REQUEST_METHOD"] != "POST") {

    echo json_encode([
        "success" => false,
        "message" => "Invalid request."
    ]);

    exit();

}

$setting_id = intval($_POST['setting_id'] ?? 0);

$schedule_type = trim($_POST['schedule_type'] ?? '');

$class_start = trim($_POST['class_start'] ?? '');

$class_end = trim($_POST['class_end'] ?? '');

$break_enabled = trim($_POST['break_enabled'] ?? '');

$break_start = trim($_POST['break_start'] ?? '');

$break_duration = intval($_POST['break_duration'] ?? 0);

$total_subjects = intval($_POST['total_subjects'] ?? 0);

$selected_days = trim($_POST['selected_days'] ?? '');

if (

    $setting_id <= 0 ||

    empty($schedule_type) ||

    empty($class_start) ||

    empty($class_end) ||

    empty($selected_days)

) {

    echo json_encode([

        "success" => false,

        "message" => "Please complete all required fields."

    ]);

    exit();

}

$stmt = $conn->prepare("

UPDATE timetable_settings

SET

schedule_type=?,

class_start=?,

class_end=?,

break_enabled=?,

break_start=?,

break_duration=?,

total_subjects=?,

selected_days=?,

generated='No'

WHERE setting_id=?

");

$stmt->bind_param(

    "sssssissi",

    $schedule_type,

    $class_start,

    $class_end,

    $break_enabled,

    $break_start,

    $break_duration,

    $total_subjects,

    $selected_days,

    $setting_id

);

if($stmt->execute()){

    echo json_encode([

        "success"=>true,

        "message"=>"Timetable settings updated successfully. Please generate timetable again."

    ]);

}else{

    echo json_encode([

        "success"=>false,

        "message"=>"Failed to update timetable settings."

    ]);

}

$stmt->close();

$conn->close();

?>
