<?php
include "../config/cors.php"; // handles CORS + Content-Type: application/json
include "../config/db.php";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $first_name            = trim($_POST['first_name']            ?? '');
    $last_name             = trim($_POST['last_name']             ?? '');
    $middle_name           = trim($_POST['middle_name']           ?? '');
    $suffix                = trim($_POST['suffix']                ?? '');
    $lrn                   = trim($_POST['lrn']                   ?? '');
    $contact_no            = trim($_POST['contact_no']            ?? '');
    $gmail                 = trim($_POST['gmail']                 ?? '');
    $date_of_birth         = trim($_POST['date_of_birth']         ?? '');
    $age                   = (int) trim($_POST['age']             ?? 0);
    $nationality           = trim($_POST['nationality']           ?? '');
    $province              = trim($_POST['province']              ?? '');
    $city_municipality     = trim($_POST['city_municipality']     ?? '');
    $barangay              = trim($_POST['barangay']              ?? '');
    $street_house_no       = trim($_POST['street_house_no']       ?? '');
    $guardian_fullname     = trim($_POST['guardian_fullname']     ?? '');
    $guardian_relationship = trim($_POST['guardian_relationship'] ?? '');
    $guardian_contact_no   = trim($_POST['guardian_contact_no']   ?? '');
    $password              = password_hash($_POST['password']     ?? '', PASSWORD_DEFAULT);

    // Check duplicate gmail or LRN
    $check = $conn->prepare("SELECT student_id FROM students WHERE gmail = ? OR lrn = ?");
    $check->bind_param("ss", $gmail, $lrn);
    $check->execute();
    if ($check->get_result()->num_rows > 0) {
        echo json_encode([
            "success" => false,
            "message" => "Gmail or LRN already registered."
        ]);
        $check->close();
        $conn->close();
        exit();
    }
    $check->close();

    // COUNT: 18 params → 'ssssssssisssssssss'
    // s  first_name
    // s  last_name
    // s  middle_name
    // s  suffix
    // s  lrn
    // s  contact_no
    // s  gmail
    // s  date_of_birth
    // i  age              ← integer
    // s  nationality
    // s  province
    // s  city_municipality
    // s  barangay
    // s  street_house_no
    // s  guardian_fullname
    // s  guardian_relationship
    // s  guardian_contact_no
    // s  password
    $stmt = $conn->prepare("
        INSERT INTO students (
            first_name, last_name, middle_name, suffix,
            lrn, contact_no, gmail, date_of_birth, age,
            nationality, province, city_municipality, barangay, street_house_no,
            guardian_fullname, guardian_relationship, guardian_contact_no,
            password, status
        ) VALUES (
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, 'active'
        )
    ");

    $stmt->bind_param(
        'ssssssssisssssssss', // 8s + i + 9s = 18 total
        $first_name, $last_name, $middle_name, $suffix,
        $lrn, $contact_no, $gmail, $date_of_birth, $age,
        $nationality, $province, $city_municipality, $barangay, $street_house_no,
        $guardian_fullname, $guardian_relationship, $guardian_contact_no,
        $password
    );

    if ($stmt->execute()) {
        echo json_encode([
            "success" => true,
            "message" => "Student registered successfully."
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "message" => $stmt->error
        ]);
    }

    $stmt->close();
}

$conn->close();
?>
