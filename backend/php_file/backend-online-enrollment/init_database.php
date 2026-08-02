<?php
/**
 * Database Initialization Script
 * Run this once to create all necessary tables
 * Access via: http://localhost/backend-online-enrollment/init_database.php
 */

include "config/db.php";

$tables = [
    "admins" => "
        CREATE TABLE IF NOT EXISTS admins (
            admin_id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
    
    "staff" => "
        CREATE TABLE IF NOT EXISTS staff (
            staff_id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            full_name VARCHAR(255),
            status ENUM('active', 'inactive') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
    
    "students" => "
        CREATE TABLE IF NOT EXISTS students (
            student_id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            first_name VARCHAR(255),
            last_name VARCHAR(255),
            middle_name VARCHAR(255),
            contact_number VARCHAR(20),
            status ENUM('active', 'inactive') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
    
    "strands" => "
        CREATE TABLE IF NOT EXISTS strands (
            strand_id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            status ENUM('active', 'inactive') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
    
    "sections" => "
        CREATE TABLE IF NOT EXISTS sections (
            section_id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            strand_id INT,
            staff_id INT,
            capacity INT DEFAULT 50,
            status ENUM('active', 'inactive') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (strand_id) REFERENCES strands(strand_id),
            FOREIGN KEY (staff_id) REFERENCES staff(staff_id)
        )",
    
    "enrollments" => "
        CREATE TABLE IF NOT EXISTS enrollments (
            enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            section_id INT NOT NULL,
            strand_id INT NOT NULL,
            status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(student_id),
            FOREIGN KEY (section_id) REFERENCES sections(section_id),
            FOREIGN KEY (strand_id) REFERENCES strands(strand_id)
        )",
    
    "requirements" => "
        CREATE TABLE IF NOT EXISTS requirements (
            requirement_id INT AUTO_INCREMENT PRIMARY KEY,
            enrollment_id INT NOT NULL,
            requirement_name VARCHAR(255),
            file_path VARCHAR(500),
            status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (enrollment_id) REFERENCES enrollments(enrollment_id)
        )"
];

$created = [];
$errors = [];

foreach ($tables as $tableName => $sql) {
    if ($conn->query($sql)) {
        $created[] = $tableName;
    } else {
        $errors[] = [
            "table" => $tableName,
            "error" => $conn->error
        ];
    }
}

$conn->close();

header('Content-Type: application/json');
echo json_encode([
    "success" => count($errors) === 0,
    "created_tables" => $created,
    "errors" => $errors,
    "message" => count($created) . " table(s) created successfully."
], JSON_PRETTY_PRINT);
?>
