import json
import cv2
import os
import re


def success_response(data):
    response = {"success": True}
    response.update(data)
    return json.dumps(response)


def error_response(message):
    return json.dumps({"success": False, "message": message})


def image_exists(image_path):
    return os.path.exists(image_path)


def load_image(image_path):
    return cv2.imread(image_path)


def clean_text(text):
    """
    Clean OCR output text.
    NOTE: We no longer blindly replace O/o with 0 across all text
    because that would break word recognition (e.g. "for" -> "f0r").
    Only replace common OCR misreads for characters that appear
    in numeric-only contexts — handled in extract_grades() below.
    """
    text = text.replace("|", " ")
    text = text.replace("§", "5")
    text = text.replace(",", ".")
    text = text.strip()
    return text


def extract_grades(text):
    """
    Extract valid grade numbers (60-100) from OCR text.
    Handles common OCR misreads in numeric contexts only.
    """
    grades = []

    # Fix common OCR digit misreads in numeric context only
    # Replace 'O' or 'o' with '0' only when surrounded by digits or
    # at start/end of a number-like token
    numeric_text = re.sub(r'(?<=\d)[Oo](?=\d)', '0', text)
    numeric_text = re.sub(r'\b[Oo](?=\d)', '0', numeric_text)
    numeric_text = re.sub(r'(?<=\d)[Oo]\b', '0', numeric_text)

    numbers = re.findall(r'\b([6-9][0-9]|100)\b', numeric_text)

    for number in numbers:
        value = int(number)
        if 60 <= value <= 100:
            grades.append(value)

    return grades


def compute_average(grades):
    if len(grades) == 0:
        return None
    return round(sum(grades) / len(grades))
