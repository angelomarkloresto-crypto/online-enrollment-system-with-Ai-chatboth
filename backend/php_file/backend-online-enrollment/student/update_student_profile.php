<?php
// ✅ cors.php FIRST before db.php
include "../config/cors.php";
include "../config/db.php";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $student_id            = intval($_POST['student_id']            ?? 0);
    $first_name            = trim($_POST['first_name']              ?? '');
    $last_name             = trim($_POST['last_name']               ?? '');
    $middle_name           = trim($_POST['middle_name']             ?? '');
    $suffix                = trim($_POST['suffix']                  ?? '');
    $contact_no            = trim($_POST['contact_no']              ?? '');
    $date_of_birth         = trim($_POST['date_of_birth']           ?? '');
    $age                   = intval($_POST['age']                   ?? 0);
    $nationality           = trim($_POST['nationality']             ?? '');
    $province              = trim($_POST['province']                ?? '');
    $city_municipality     = trim($_POST['city_municipality']       ?? '');
    $barangay              = trim($_POST['barangay']                ?? '');
    $street_house_no       = trim($_POST['street_house_no']         ?? '');
    $guardian_fullname     = trim($_POST['guardian_fullname']       ?? '');
    $guardian_relationship = trim($_POST['guardian_relationship']   ?? '');
    $guardian_contact_no   = trim($_POST['guardian_contact_no']     ?? '');

    if ($student_id <= 0) {
        echo json_encode(["success" => false, "message" => "Invalid student ID."]);
        exit();
    }

    $stmt = $conn->prepare("
        UPDATE students SET
            first_name            = ?,
            last_name             = ?,
            middle_name           = ?,
            suffix                = ?,
            contact_no            = ?,
            date_of_birth         = ?,
            age                   = ?,
            nationality           = ?,
            province              = ?,
            city_municipality     = ?,
            barangay              = ?,
            street_house_no       = ?,
            guardian_fullname     = ?,
            guardian_relationship = ?,
            guardian_contact_no   = ?
        WHERE student_id = ?
    ");

    if (!$stmt) {
        echo json_encode(["success" => false, "message" => $conn->error]);
        exit();
    }

    // Types: 15 strings/int params + 1 int for WHERE
    // s  first_name
    // s  last_name
    // s  middle_name
    // s  suffix
    // s  contact_no
    // s  date_of_birth
    // i  age
    // s  nationality
    // s  province
    // s  city_municipality
    // s  barangay
    // s  street_house_no
    // s  guardian_fullname
    // s  guardian_relationship
    // s  guardian_contact_no
    // i  student_id (WHERE)
    $stmt->bind_param(
        "ssssssissssssssi",
        $first_name, $last_name, $middle_name, $suffix,
        $contact_no, $date_of_birth, $age,
        $nationality, $province, $city_municipality,
        $barangay, $street_house_no,
        $guardian_fullname, $guardian_relationship, $guardian_contact_no,
        $student_id
    );

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Profile updated successfully."]);
    } else {
        echo json_encode(["success" => false, "message" => $stmt->error]);
    }
    $stmt->close();
}
$conn->close();
?>
