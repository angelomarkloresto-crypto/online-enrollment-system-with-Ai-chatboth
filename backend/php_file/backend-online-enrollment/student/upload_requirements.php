<?php

include "../config/db.php";

header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $enrollment_id = $_POST['enrollment_id'];

    // Upload folders
    $reportCardFolder = "../uploads/report_card/";
    $psaFolder = "../uploads/psa/";
    $goodMoralFolder = "../uploads/good_moral/";
    $transferFolder = "../uploads/transfer_certificate/";

    // Generate unique filenames
    $reportFront = time() . "_front_" . basename($_FILES["report_card_front"]["name"]);
    $reportBack = time() . "_back_" . basename($_FILES["report_card_back"]["name"]);
    $psa = time() . "_psa_" . basename($_FILES["psa_birth_certificate"]["name"]);
    $goodMoral = time() . "_goodmoral_" . basename($_FILES["good_moral"]["name"]);

    $transfer = "";

    if (!empty($_FILES["certificate_of_transfer"]["name"])) {
        $transfer = time() . "_transfer_" . basename($_FILES["certificate_of_transfer"]["name"]);
    }

    // Upload files
    move_uploaded_file(
        $_FILES["report_card_front"]["tmp_name"],
        $reportCardFolder . $reportFront
    );

    move_uploaded_file(
        $_FILES["report_card_back"]["tmp_name"],
        $reportCardFolder . $reportBack
    );

    move_uploaded_file(
        $_FILES["psa_birth_certificate"]["tmp_name"],
        $psaFolder . $psa
    );

    move_uploaded_file(
        $_FILES["good_moral"]["tmp_name"],
        $goodMoralFolder . $goodMoral
    );

    if ($transfer != "") {

        move_uploaded_file(
            $_FILES["certificate_of_transfer"]["tmp_name"],
            $transferFolder . $transfer
        );

    }

    // Save to database
    $stmt = $conn->prepare("
        INSERT INTO requirements
        (
            enrollment_id,
            report_card_front,
            report_card_back,
            psa_birth_certificate,
            good_moral,
            certificate_of_transfer
        )
        VALUES
        (?, ?, ?, ?, ?, ?)
    ");

    $stmt->bind_param(
        "isssss",
        $enrollment_id,
        $reportFront,
        $reportBack,
        $psa,
        $goodMoral,
        $transfer
    );

    if ($stmt->execute()) {

        echo json_encode([
            "success" => true,
            "message" => "Requirements uploaded successfully."
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