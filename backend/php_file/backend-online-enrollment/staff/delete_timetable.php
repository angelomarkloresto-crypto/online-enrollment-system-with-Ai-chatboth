<?php

header("Content-Type: application/json");

include "../../config/db.php";

if ($_SERVER["REQUEST_METHOD"] != "POST") {

    echo json_encode([
        "success" => false,
        "message" => "Invalid request."
    ]);

    exit();

}

$section_id = intval($_POST['section_id'] ?? 0);

if ($section_id <= 0) {

    echo json_encode([
        "success" => false,
        "message" => "Invalid section."
    ]);

    exit();

}

/*
|--------------------------------------------------------------------------
| GET TIMETABLE SETTING
|--------------------------------------------------------------------------
*/

$getSetting = $conn->prepare("
SELECT setting_id
FROM timetable_settings
WHERE section_id = ?
LIMIT 1
");

$getSetting->bind_param("i", $section_id);

$getSetting->execute();

$result = $getSetting->get_result();

if ($result->num_rows == 0) {

    echo json_encode([
        "success" => false,
        "message" => "Timetable setting not found."
    ]);

    exit();

}

$setting = $result->fetch_assoc();

$setting_id = $setting['setting_id'];

/*
|--------------------------------------------------------------------------
| DELETE TIMETABLE
|--------------------------------------------------------------------------
*/

$delete = $conn->prepare("
DELETE FROM timetable
WHERE section_id = ?
");

$delete->bind_param("i", $section_id);

$delete->execute();

/*
|--------------------------------------------------------------------------
| UPDATE GENERATED STATUS
|--------------------------------------------------------------------------
*/

$update = $conn->prepare("
UPDATE timetable_settings
SET generated='No'
WHERE setting_id=?
");

$update->bind_param("i", $setting_id);

$update->execute();

/*
|--------------------------------------------------------------------------
| RESPONSE
|--------------------------------------------------------------------------
*/

echo json_encode([

    "success" => true,

    "message" => "Timetable deleted successfully."

]);

$getSetting->close();

$delete->close();

$update->close();

$conn->close();

?>