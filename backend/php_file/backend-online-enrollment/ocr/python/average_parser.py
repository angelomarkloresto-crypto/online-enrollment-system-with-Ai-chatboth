import re
from helper import extract_grades, compute_average


def find_general_average(text):
    """
    Find General Average from OCR text.

    KEY FIX for SHS report cards:
    SHS cards have TWO semester tables, each with their own
    "General Average for the Semester". We find ALL matches
    and return the LAST one — which is the 2nd semester average.

    For JHS cards with only one table, there's only one match,
    so returning the last = returning the only one.
    """

    # Most specific pattern first — exact phrase on SHS report cards
    # "General Average for the Semester | 89"
    specific_patterns = [
        r'General\s+Average\s+for\s+the\s+Semester\s*[\|\:\-\s]+\s*(\d{2,3})',
        r'GENERAL\s+AVERAGE\s+FOR\s+THE\s+SEMESTER\s*[\|\:\-\s]+\s*(\d{2,3})',
        r'General\s+Average\s+for\s+the\s+Semester\s+(\d{2,3})',
        r'GENERAL\s+AVERAGE\s+FOR\s+THE\s+SEMESTER\s+(\d{2,3})',
    ]

    # Fallback patterns — less specific, used if above fail
    fallback_patterns = [
        r'General\s*Average\s*[\|\:\-\s]+\s*(\d{2,3})',
        r'GENERAL\s*AVERAGE\s*[\|\:\-\s]+\s*(\d{2,3})',
        r'GENERAL\s*AVERAGE[:\s]*(\d{2,3})',
        r'AVERAGE[:\s]*(\d{2,3})',
        r'FINAL\s*RATING[:\s]*(\d{2,3})',
        r'FINAL\s*AVERAGE[:\s]*(\d{2,3})',
    ]

    all_values = []

    # Try specific patterns first
    for pattern in specific_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for m in matches:
            value = int(m)
            if 60 <= value <= 100:
                all_values.append(value)

    # If specific patterns found something, return the LAST match
    # (last = 2nd semester for SHS, or the only one for JHS)
    if all_values:
        return all_values[-1]

    # Try fallback patterns
    for pattern in fallback_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for m in matches:
            value = int(m)
            if 60 <= value <= 100:
                all_values.append(value)

    if all_values:
        return all_values[-1]

    return None


def extract_semester_grades(text):
    """
    For SHS cards: try to extract only 2nd semester grades
    by splitting the text at the 2nd semester section.

    Looks for "Second Semester" heading to split the text,
    then extracts grades only from that section.
    """
    # Try to find "Second Semester" section
    split_patterns = [
        r'Second\s+Semester',
        r'SECOND\s+SEMESTER',
        r'2nd\s+Semester',
        r'2ND\s+SEMESTER',
    ]

    for pattern in split_patterns:
        parts = re.split(pattern, text, flags=re.IGNORECASE, maxsplit=1)
        if len(parts) == 2:
            # Return grades from the 2nd semester section only
            return extract_grades(parts[1])

    # No "Second Semester" found — return all grades (JHS case)
    return extract_grades(text)


def parse_average(text):
    """
    Main entry point.
    Returns the detected general average.

    Priority:
    1. Find "General Average for the Semester" text (most accurate)
    2. Fallback: compute mean of detected grades from 2nd semester section
    3. Last resort: compute mean of all detected grades
    """

    # Step 1: Direct average detection (most accurate)
    average = find_general_average(text)
    if average is not None:
        return average

    # Step 2: Try computing from 2nd semester grades specifically
    grades = extract_semester_grades(text)
    if len(grades) >= 3:
        return compute_average(grades)

    # Step 3: Last resort — all grades
    grades = extract_grades(text)
    if len(grades) == 0:
        return None

    return compute_average(grades)
