<?php

header("Content-Type: application/json");
include "../config/db.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {

    echo json_encode([
        "success" => false,
        "message" => "Invalid request method."
    ]);

    exit();
}

$setting_id = isset($_POST['setting_id']) ? intval($_POST['setting_id']) : 0;

if ($setting_id <= 0) {

    echo json_encode([
        "success" => false,
        "message" => "Invalid timetable setting."
    ]);

    exit();
}

/*
|--------------------------------------------------------------------------
| GET TIMETABLE SETTINGS
|--------------------------------------------------------------------------
*/

$stmt = $conn->prepare("
SELECT *
FROM timetable_settings
WHERE setting_id = ?
LIMIT 1
");

$stmt->bind_param("i", $setting_id);
$stmt->execute();

$result = $stmt->get_result();

if ($result->num_rows == 0) {

    echo json_encode([
        "success" => false,
        "message" => "Timetable setting not found."
    ]);

    exit();
}

$setting = $result->fetch_assoc();

$section_id = $setting['section_id'];

$schedule_type = $setting['schedule_type'];

$class_start = $setting['class_start'];

$class_end = $setting['class_end'];

$break_enabled = $setting['break_enabled'];

$break_start = $setting['break_start'];

$break_duration = intval($setting['break_duration']);

$total_subjects = intval($setting['total_subjects']);

$selected_days = explode(",", $setting['selected_days']);

/*
|--------------------------------------------------------------------------
| GET SUBJECTS
|--------------------------------------------------------------------------
*/

$subjectStmt = $conn->prepare("
SELECT subject_name
FROM timetable_subjects
WHERE setting_id = ?
ORDER BY display_order ASC
");

$subjectStmt->bind_param("i", $setting_id);

$subjectStmt->execute();

$subjectResult = $subjectStmt->get_result();

$subjects = [];

while ($row = $subjectResult->fetch_assoc()) {

    $subjects[] = $row['subject_name'];

}

if (count($subjects) == 0) {

    echo json_encode([
        "success" => false,
        "message" => "No subjects found."
    ]);

    exit();
}

/*
|--------------------------------------------------------------------------
| GET CURRENT SECTION
|--------------------------------------------------------------------------
*/

$sectionStmt = $conn->prepare("
SELECT
section_id,
grade_level,
strand_id
FROM sections
WHERE section_id = ?
LIMIT 1
");

$sectionStmt->bind_param("i", $section_id);

$sectionStmt->execute();

$sectionResult = $sectionStmt->get_result();

if ($sectionResult->num_rows == 0) {

    echo json_encode([
        "success" => false,
        "message" => "Section not found."
    ]);

    exit();
}

$currentSection = $sectionResult->fetch_assoc();

$grade_level = $currentSection['grade_level'];

$strand_id = $currentSection['strand_id'];

/*
|--------------------------------------------------------------------------
| GET RELATED SECTIONS
|--------------------------------------------------------------------------
|
| JHS
| Grade 7
| Grade 8
|
| SHS
| Grade 11 STEM
| Grade 11 HUMSS
|
*/

if (is_null($strand_id)) {

    $relatedStmt = $conn->prepare("
    SELECT *
    FROM sections
    WHERE grade_level = ?
    ORDER BY section_id ASC
    ");

    $relatedStmt->bind_param("s", $grade_level);

} else {

    $relatedStmt = $conn->prepare("
    SELECT *
    FROM sections
    WHERE grade_level = ?
    AND strand_id = ?
    ORDER BY section_id ASC
    ");

    $relatedStmt->bind_param(
        "si",
        $grade_level,
        $strand_id
    );

}

$relatedStmt->execute();

$relatedResult = $relatedStmt->get_result();

$sections = [];

while ($row = $relatedResult->fetch_assoc()) {

    $sections[] = $row;

}

if (count($sections) == 0) {

    echo json_encode([
        "success" => false,
        "message" => "No sections found."
    ]);

    exit();
}

/*
|--------------------------------------------------------------------------
| DELETE OLD TIMETABLE
|--------------------------------------------------------------------------
*/

$deleteStmt = $conn->prepare("
DELETE FROM timetable
WHERE section_id = ?
");

foreach ($sections as $section) {

    $deleteStmt->bind_param(
        "i",
        $section['section_id']
    );

    $deleteStmt->execute();

}

/*
|--------------------------------------------------------------------------
| PREPARE VARIABLES
|--------------------------------------------------------------------------
*/

$classStartTimestamp = strtotime($class_start);

$classEndTimestamp = strtotime($class_end);

$totalMinutes = ($classEndTimestamp - $classStartTimestamp) / 60;

$schedules = [];

/*
|--------------------------------------------------------------------------
| END OF PART 1
|--------------------------------------------------------------------------
|
| Next Part:
| - Calculate Subject Duration
| - Half Day / Whole Day
| - Break Handling
| - Rotation Algorithm
| - Build Schedule Array
|
*/

/*
|--------------------------------------------------------------------------
| CALCULATE TEACHING MINUTES
|--------------------------------------------------------------------------
*/

if ($break_enabled == "Yes") {

    $teachingMinutes = $totalMinutes - $break_duration;

} else {

    $teachingMinutes = $totalMinutes;

}

$minutesPerSubject = floor($teachingMinutes / $total_subjects);

if ($minutesPerSubject <= 0) {

    echo json_encode([
        "success" => false,
        "message" => "Invalid class schedule."
    ]);

    exit();

}

/*
|--------------------------------------------------------------------------
| GENERATE TIMETABLE
|--------------------------------------------------------------------------
*/

foreach ($sections as $sectionIndex => $section) {

    /*
    -------------------------------------------------------
    ROTATE SUBJECTS

    Section 1
    Math
    English
    Science

    Section 2
    English
    Science
    Math

    -------------------------------------------------------
    */

    $rotation = $sectionIndex % count($subjects);

    $rotatedSubjects = array_merge(

        array_slice($subjects, $rotation),

        array_slice($subjects, 0, $rotation)

    );

    /*
    -------------------------------------------------------
    LOOP DAYS
    -------------------------------------------------------
    */

    foreach ($selected_days as $day) {

        $currentTime = strtotime($class_start);

        $breakApplied = false;

        /*
        ---------------------------------------------------
        LOOP SUBJECTS
        ---------------------------------------------------
        */

        foreach ($rotatedSubjects as $subject) {

            /*
            -----------------------------------------------
            BREAK
            -----------------------------------------------
            */

            if (

                $break_enabled == "Yes"

                &&

                !$breakApplied

                &&

                $break_start != NULL

                &&

                date("H:i:s", $currentTime) >= $break_start

            ) {

                $currentTime = strtotime(

                    "+" . $break_duration . " minutes",

                    $currentTime

                );

                $breakApplied = true;

            }

            /*
            -----------------------------------------------
            SUBJECT START
            -----------------------------------------------
            */

            $subjectStart = $currentTime;

            /*
            -----------------------------------------------
            SUBJECT END
            -----------------------------------------------
            */

            $subjectEnd = strtotime(

                "+" . $minutesPerSubject . " minutes",

                $subjectStart

            );

            /*
            -----------------------------------------------
            STORE
            -----------------------------------------------
            */

            $schedules[] = [

                "section_id" => $section['section_id'],

                "day" => trim($day),

                "subject_name" => $subject,

                "start_time" => date("H:i:s", $subjectStart),

                "end_time" => date("H:i:s", $subjectEnd)

            ];

            /*
            -----------------------------------------------
            MOVE TO NEXT SUBJECT
            -----------------------------------------------
            */

            $currentTime = $subjectEnd;

        }

    }

}

/*
|--------------------------------------------------------------------------
| END PART 2
|--------------------------------------------------------------------------
|
| Result:
|
| $schedules[]
|
| Contains all generated schedules
|
*/
/*
|--------------------------------------------------------------------------
| SAVE GENERATED TIMETABLE
|--------------------------------------------------------------------------
*/

$insertStmt = $conn->prepare("
INSERT INTO timetable
(
    section_id,
    day,
    subject_name,
    start_time,
    end_time
)
VALUES
(
    ?, ?, ?, ?, ?
)
");

if (!$insertStmt) {

    echo json_encode([
        "success" => false,
        "message" => "Failed to prepare timetable insertion."
    ]);

    exit();

}

foreach ($schedules as $schedule) {

    $insertStmt->bind_param(

        "issss",

        $schedule['section_id'],

        $schedule['day'],

        $schedule['subject_name'],

        $schedule['start_time'],

        $schedule['end_time']

    );

    $insertStmt->execute();

}

/*
|--------------------------------------------------------------------------
| UPDATE TIMETABLE STATUS
|--------------------------------------------------------------------------
*/

$updateStmt = $conn->prepare("
UPDATE timetable_settings
SET generated='Yes'
WHERE setting_id=?
");

$updateStmt->bind_param("i",$setting_id);

$updateStmt->execute();

/*
|--------------------------------------------------------------------------
| COUNT GENERATED RECORDS
|--------------------------------------------------------------------------
*/

$totalGenerated = count($schedules);

/*
|--------------------------------------------------------------------------
| SUCCESS RESPONSE
|--------------------------------------------------------------------------
*/

echo json_encode([

    "success" => true,

    "message" => "Timetable generated successfully.",

    "setting_id" => $setting_id,

    "grade_level" => $grade_level,

    "sections_generated" => count($sections),

    "subjects_generated" => count($subjects),

    "days_generated" => count($selected_days),

    "total_schedule_created" => $totalGenerated

]);

/*
|--------------------------------------------------------------------------
| CLOSE CONNECTIONS
|--------------------------------------------------------------------------
*/

$stmt->close();

$subjectStmt->close();

$sectionStmt->close();

$relatedStmt->close();

$deleteStmt->close();

$insertStmt->close();

$updateStmt->close();

$conn->close();

?>