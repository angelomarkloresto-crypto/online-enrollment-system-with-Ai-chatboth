<?php 
include "db.php";

if ($_SERVER["REQUEST_METHOD"] == "POST"){

    $first_name = $_POST['first_name'];
    $middle_name = $_POST['middle_name'];
    $last_name = $_POST['last_name'];
    $suffix = $_POST['suffix'];

    $lrn = $_POST['lrn'];
    $contact_no = $_POST['contact_no'];
    $email = $_POST['email'];

    $gender = $_POST['gender'];
    $date_of_birth = $_POST['date_of_birth'];
    $age = $_POST['age'];
    $nationality = $_POST['nationality'];


    $province = $_POST['province'];
    $city = $_POST['city'];
    $barangay = $_POST['barangay'];
    $street = $_POST['street'];

    $guardian_name = $_POST['gardian_name'];
    $guardian_relationship = $_POST['guardian_relationship'];
    $guardian_contact = $_POST['guardian_contact'];
    
    $password = password_hash($lrn, PASSWORD_DEFAULT);
    $check = $conn->prepare("SELECT * FROM students WHERE email = ? OR lrn = ?");
    $check->bind_param("ss", $email, $lrn);
    $check->execute();
    $result = $check->get_result();

    if ($result->num_rows > 0){
        echo "Email or LRN already exists";
        exit();

    }
    $stmt = $conn->prepare("INSERT INTO students(
        first_name, middle_name, last_name, suffix, lrn, contact_no, email, gender, date_of_birth, age,
        nationality, guardian_name, guardian_relationship,guardian_contact, password
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
    $stmt->bind_param(
        "sssssssssssssssssss", $first_name, $middle_name, $last_name, $suffix, $lrn, $contact_no, $email, $gender, $date_of_birth, $age, $nationality,
        $province, $city, $barangay, $street, $guardian_name, $guardian_relationship, $guardian_contact, $password

    );
    if ($stmt->execute()){
        echo "Registration Successfull!";
    }else{
        echo "Error: " . $stmt->error;
    }
    $stmt->close();
}
$conn->close();


?>