import { enrollmentDisclosurePayload } from "./learnerDisclosures.js";

const CHECKLIST_FIELDS = [
  "report_card_front_received",
  "report_card_back_received",
  "psa_birth_certificate_received",
  "good_moral_received",
];

const ACCOUNT_FIELDS_REQUIRED_MESSAGE = "Required student account fields are missing or invalid.";

function isValidPhone(value) {
  return /^(?:09\d{9}|\+639\d{9})$/.test(value.trim().replace(/[\s()-]/g, ""));
}

function isValidDate(value) {
  const date = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function isValidOnSiteStrandSelection(gradeLevel, strands, strandId) {
  if (Number(gradeLevel) < 11) return true;
  return Array.isArray(strands)
    && strands.some((strand) => String(strand.strand_id) === String(strandId));
}

export function validateOnSiteAccountFields(form, accountCreationRequired = false) {
  const errors = {};
  const firstName = String(form.first_name ?? "").trim();
  const middleName = String(form.middle_name ?? "").trim();
  const lastName = String(form.last_name ?? "").trim();
  const extensionName = String(form.extension_name ?? "").trim();
  const lrn = String(form.lrn ?? "").trim();
  const dateOfBirth = String(form.date_of_birth ?? "").trim();
  const sex = String(form.sex ?? "");
  const age = String(form.age ?? "").trim();
  const cellphone = String(form.cellphone_no ?? "").trim();
  const email = String(form.email ?? "").trim();

  if (accountCreationRequired && (!firstName || firstName.length > 100)) {
    errors.first_name = "Enter a first name of 100 characters or fewer.";
  }
  if (accountCreationRequired && middleName.length > 100) {
    errors.middle_name = "Keep the middle name to 100 characters or fewer.";
  }
  if (accountCreationRequired && (!lastName || lastName.length > 100)) {
    errors.last_name = "Enter a last name of 100 characters or fewer.";
  }
  if (accountCreationRequired && extensionName.length > 20) {
    errors.extension_name = "Keep the suffix to 20 characters or fewer.";
  }
  if (accountCreationRequired && !isValidDate(dateOfBirth)) {
    errors.date_of_birth = "Enter a valid date of birth.";
  }
  if (accountCreationRequired && !["Male", "Female"].includes(sex)) {
    errors.sex = "Select Male or Female.";
  }
  if (accountCreationRequired && (!/^\d+$/.test(age) || !Number.isSafeInteger(Number(age)) || Number(age) < 1)) {
    errors.age = "Enter a valid positive whole-number age.";
  }
  if (accountCreationRequired && lrn && lrn.length < 8) {
    errors.lrn = "The LRN must be at least 8 characters to serve as the initial password.";
  }
  if ((accountCreationRequired || cellphone) && !isValidPhone(cellphone)) {
    errors.cellphone_no = "Enter a valid PH mobile number (09XXXXXXXXX or +639XXXXXXXXX).";
  }
  if (email && !isValidEmail(email)) {
    errors.email = "Enter a valid email address or leave this field blank.";
  }

  return errors;
}

export function isNewOnSiteAccountValidationResponse(status, data) {
  return status === 400 && data?.message === ACCOUNT_FIELDS_REQUIRED_MESSAGE;
}

export function buildOnSiteEnrollmentPayload(form) {
  const gradeLevel = Number(form.grade_level);
  const lrn = String(form.lrn ?? "").trim();
  const cellphone = String(form.cellphone_no ?? "").trim().replace(/[\s()-]/g, "");
  const payload = {
    lrn,
    student_type: form.student_type,
    grade_level: gradeLevel,
    average_grade: Number(form.average_grade),
    ...enrollmentDisclosurePayload(form),
    first_name: String(form.first_name ?? "").trim(),
    middle_name: String(form.middle_name ?? "").trim(),
    last_name: String(form.last_name ?? "").trim(),
    extension_name: String(form.extension_name ?? "").trim(),
    date_of_birth: String(form.date_of_birth ?? ""),
    sex: form.sex,
    age: form.age === "" ? "" : Number(form.age),
    cellphone_no: cellphone,
    email: String(form.email ?? "").trim(),
    password: lrn,
  };

  if (gradeLevel >= 11) payload.strand_id = Number(form.strand_id);
  for (const field of CHECKLIST_FIELDS) payload[field] = form[field] === true;

  return payload;
}

export function interpretOnSiteEnrollmentResponse(status, data, expectedLrn) {
  const enrollmentId = Number(data?.enrollment_id);
  const lrn = typeof data?.lrn === "string" ? data.lrn.trim() : "";
  const schoolYear = typeof data?.school_year === "string" ? data.school_year.trim() : "";
  const semester = typeof data?.semester === "string" ? data.semester.trim() : null;
  const confirmed = status === 201
    && data?.success === true
    && data.enrollment_status === "Approved"
    && data.enrollment_mode === "on_site"
    && Number.isSafeInteger(enrollmentId)
    && enrollmentId > 0
    && lrn !== ""
    && lrn === String(expectedLrn ?? "").trim();

  if (confirmed) {
    return { success: true, enrollmentId, lrn, schoolYear, semester };
  }

  if (status === 400 || status === 409) {
    return {
      success: false,
      message: typeof data?.message === "string"
        ? data.message
        : "The enrollment could not be validated.",
    };
  }
  if (status >= 500) {
    return {
      success: false,
      message: "The server could not confirm the On-Site enrollment. Please verify the student record before retrying.",
    };
  }
  return {
    success: false,
    message: typeof data?.message === "string"
      ? data.message
      : "The On-Site enrollment could not be confirmed.",
  };
}
