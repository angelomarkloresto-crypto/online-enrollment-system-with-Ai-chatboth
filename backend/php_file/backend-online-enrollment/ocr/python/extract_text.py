import sys
import os
import json

import pytesseract


from helper import (
    load_image,
    image_exists,
    clean_text,
    success_response,
    error_response
)

from image_preprocessing import preprocess_image

from average_parser import parse_average


# =====================================
# Tesseract Path
# =====================================
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


# =====================================
# Validate Input
# =====================================
if len(sys.argv) < 2:

    print(error_response("No image supplied."))

    sys.exit()


image_path = sys.argv[1]


if not image_exists(image_path):

    print(error_response("Image not found."))

    sys.exit()


# =====================================
# Load Image
# =====================================
image = load_image(image_path)

if image is None:

    print(error_response("Unable to load image."))

    sys.exit()


# =====================================
# Image Preprocessing
# =====================================
success, processed_image, message = preprocess_image(image)

if not success:

    print(error_response(message))

    sys.exit()


# =====================================
# OCR
# =====================================
try:

    text = pytesseract.image_to_string(

        processed_image,

        lang="eng",

        config="--oem 3 --psm 6"

    )

except Exception:

    print(error_response("OCR failed."))

    sys.exit()


# =====================================
# Clean OCR Text
# =====================================
text = clean_text(text)


# =====================================
# Detect Average
# =====================================
average = parse_average(text)

if average is None:

    print(error_response(
        "Unable to detect the student's average. Please upload a clearer report card."
    ))

    sys.exit()


# =====================================
# Success Response
# =====================================
print(success_response({

    "average": average,

    "text": text

}))