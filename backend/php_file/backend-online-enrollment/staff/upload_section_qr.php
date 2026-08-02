<?php

header("Content-Type: application/json");

require_once("../config/db.php");

if ($_SERVER["REQUEST_METHOD"] != "POST") {

    echo json_encode([
        "success" => false,
        "message" => "Invalid request."
    ]);

    exit;
}

//========================
// Validate Inputs
//========================

if (!isset($_POST["section_id"])) {

    echo json_encode([
        "success" => false,
        "message" => "Section is required."
    ]);

    exit;
}

if (!isset($_FILES["qr_code"])) {

    echo json_encode([
        "success" => false,
        "message" => "QR Code image is required."
    ]);

    exit;
}

$section_id = intval($_POST["section_id"]);
$file = $_FILES["qr_code"];