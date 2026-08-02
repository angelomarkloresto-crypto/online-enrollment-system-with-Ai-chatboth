import cv2
import numpy as np

try:
    import pytesseract
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    TESSERACT_AVAILABLE = True
except Exception:
    TESSERACT_AVAILABLE = False


def rotate_image(image, angle):
    """Rotate image by 0, 90, 180, or 270 degrees."""
    if angle == 90:
        return cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
    elif angle == 180:
        return cv2.rotate(image, cv2.ROTATE_180)
    elif angle == 270:
        return cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)
    return image


def auto_rotate(image):
    """
    Auto-detect and correct image rotation.
    Handles portrait (90/270) and upside-down (180) images.

    Method 1: Tesseract OSD — fast and accurate when it works.
    Method 2: Brute-force all 4 rotations — picks the one
              with the most readable OCR text.
    """
    if not TESSERACT_AVAILABLE:
        return image

    # Method 1: Tesseract OSD
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        osd  = pytesseract.image_to_osd(
            gray,
            output_type=pytesseract.Output.DICT,
            config="--psm 0"
        )
        angle = osd.get("rotate", 0)
        conf  = osd.get("orientation_conf", 0)

        if conf >= 1.5:
            return rotate_image(image, angle)
    except Exception:
        pass

    # Method 2: Brute force
    best_len   = 0
    best_image = image

    for angle in [0, 90, 180, 270]:
        rotated = rotate_image(image, angle)
        try:
            gray = cv2.cvtColor(rotated, cv2.COLOR_BGR2GRAY)
            text = pytesseract.image_to_string(
                gray, config="--oem 3 --psm 6"
            )
            count = sum(1 for c in text if c.isalnum())
            if count > best_len:
                best_len   = count
                best_image = rotated
        except Exception:
            continue

    return best_image


def preprocess_image(image):
    """
    Full preprocessing pipeline before OCR.
    Returns: (success: bool, processed_image, message: str)
    """
    if image is None:
        return False, None, "Unable to read image."

    # 1. Auto-rotate (fixes portrait and inverted captures)
    image = auto_rotate(image)

    # 2. Upscale small images for better OCR
    height, width = image.shape[:2]
    if width < 1200:
        scale = 1200 / width
        image = cv2.resize(
            image, None,
            fx=scale, fy=scale,
            interpolation=cv2.INTER_CUBIC
        )

    # 3. Grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # 4. Denoise
    gray = cv2.GaussianBlur(gray, (3, 3), 0)

    # 5. Contrast enhancement
    gray = cv2.equalizeHist(gray)

    # 6. Binarize
    processed = cv2.threshold(
        gray, 0, 255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )[1]

    # 7. Reject blurry images
    variance = cv2.Laplacian(processed, cv2.CV_64F).var()
    if variance < 50:
        return False, None, "Image is too blurry. Please take a clearer photo."

    return True, processed, "OK"
