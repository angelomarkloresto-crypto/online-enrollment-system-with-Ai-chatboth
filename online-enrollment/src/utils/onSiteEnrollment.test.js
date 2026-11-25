import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOnSiteEnrollmentPayload,
  isNewOnSiteAccountValidationResponse,
  interpretOnSiteEnrollmentResponse,
  isValidOnSiteStrandSelection,
  validateOnSiteAccountFields,
} from "./onSiteEnrollment.js";

const baseForm = {
  lrn: "123456789012",
  student_type: "New",
  grade_level: "7",
  average_grade: "88.5",
  is_pwd: "No",
  pwd_specification: "",
  is_4ps_beneficiary: "No",
  four_ps_household_id: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  extension_name: "",
  date_of_birth: "",
  sex: "",
  age: "",
  cellphone_no: "",
  email: "",
  report_card_front_received: true,
  report_card_back_received: true,
  psa_birth_certificate_received: true,
  good_moral_received: false,
};

test("JHS payload leaves period and section assignment to the backend", () => {
  const payload = buildOnSiteEnrollmentPayload(baseForm);

  assert.equal(payload.grade_level, 7);
  assert.equal(payload.average_grade, 88.5);
  assert.equal(payload.password, "123456789012");
  assert.equal("strand_id" in payload, false);
  assert.equal("section_id" in payload, false);
  assert.equal("enrollment_period_id" in payload, false);
});

test("SHS payload includes the selected strand and keeps checklist booleans explicit", () => {
  const payload = buildOnSiteEnrollmentPayload({
    ...baseForm,
    grade_level: "11",
    strand_id: "6",
    report_card_front_received: false,
    good_moral_received: true,
  });

  assert.equal(payload.strand_id, 6);
  assert.equal(payload.report_card_front_received, false);
  assert.equal(payload.report_card_back_received, true);
  assert.equal(payload.psa_birth_certificate_received, true);
  assert.equal(payload.good_moral_received, true);
  for (const field of [
    "report_card_front_received",
    "report_card_back_received",
    "psa_birth_certificate_received",
    "good_moral_received",
  ]) {
    assert.equal(typeof payload[field], "boolean");
  }
});

test("JHS does not require a strand and SHS requires a listed active strand", () => {
  const activeStrands = [{ strand_id: 6, strand_name: "STEM" }];
  assert.equal(isValidOnSiteStrandSelection(7, [], ""), true);
  assert.equal(isValidOnSiteStrandSelection(11, activeStrands, ""), false);
  assert.equal(isValidOnSiteStrandSelection(11, activeStrands, 7), false);
  assert.equal(isValidOnSiteStrandSelection(11, activeStrands, "6"), true);
});

test("existing LRN does not require account fields, but validates optional phone and email", () => {
  assert.deepEqual(validateOnSiteAccountFields(baseForm, false), {});
  assert.deepEqual(
    validateOnSiteAccountFields({ ...baseForm, email: "not-an-email" }, false),
    { email: "Enter a valid email address or leave this field blank." },
  );
  assert.deepEqual(
    validateOnSiteAccountFields({ ...baseForm, cellphone_no: "123" }, false),
    { cellphone_no: "Enter a valid PH mobile number (09XXXXXXXXX or +639XXXXXXXXX)." },
  );
});

test("new LRN requires valid first and last names, date of birth, sex, age, and PH phone", () => {
  assert.deepEqual(validateOnSiteAccountFields(baseForm, true), {
    first_name: "Enter a first name of 100 characters or fewer.",
    last_name: "Enter a last name of 100 characters or fewer.",
    date_of_birth: "Enter a valid date of birth.",
    sex: "Select Male or Female.",
    age: "Enter a valid positive whole-number age.",
    cellphone_no: "Enter a valid PH mobile number (09XXXXXXXXX or +639XXXXXXXXX).",
  });
  assert.deepEqual(
    validateOnSiteAccountFields({
      ...baseForm,
      first_name: "Ana",
      last_name: "Student",
      date_of_birth: "2010-02-28",
      sex: "Female",
      age: "16",
      cellphone_no: "+639123456789",
      email: "ana@example.com",
    }, true),
    {},
  );
});

test("new-account validation catches backend name limits and short initial-password LRN", () => {
  const errors = validateOnSiteAccountFields({
    ...baseForm,
    lrn: "1234567",
    first_name: "A".repeat(101),
    middle_name: "M".repeat(101),
    last_name: "B".repeat(101),
    extension_name: "S".repeat(21),
    date_of_birth: "2010-02-29",
    sex: "Other",
    age: "16.5",
    cellphone_no: "123",
  }, true);

  assert.deepEqual(errors, {
    first_name: "Enter a first name of 100 characters or fewer.",
    middle_name: "Keep the middle name to 100 characters or fewer.",
    last_name: "Enter a last name of 100 characters or fewer.",
    extension_name: "Keep the suffix to 20 characters or fewer.",
    date_of_birth: "Enter a valid date of birth.",
    sex: "Select Male or Female.",
    age: "Enter a valid positive whole-number age.",
    lrn: "The LRN must be at least 8 characters to serve as the initial password.",
    cellphone_no: "Enter a valid PH mobile number (09XXXXXXXXX or +639XXXXXXXXX).",
  });
});

test("new-account requirements activate only from the backend's account-validation response", () => {
  assert.equal(isNewOnSiteAccountValidationResponse(400, {
    message: "Required student account fields are missing or invalid.",
  }), true);
  assert.equal(isNewOnSiteAccountValidationResponse(409, {
    message: "Required student account fields are missing or invalid.",
  }), false);
  assert.equal(isNewOnSiteAccountValidationResponse(400, {
    message: "A valid student LRN is required.",
  }), false);
});

test("learner-information fields and account payload fields use backend names", () => {
  const payload = buildOnSiteEnrollmentPayload({
    ...baseForm,
    first_name: "  Ana ",
    middle_name: " Marie ",
    last_name: " Student ",
    extension_name: "Jr.",
    date_of_birth: "2010-01-02",
    sex: "Female",
    age: "16",
    cellphone_no: "0912 345 6789",
    email: " ana@example.com ",
    is_pwd: "Yes",
    pwd_specification: "  Mobility  ",
    is_4ps_beneficiary: "Yes",
    four_ps_household_id: " 0012 ",
  });

  assert.deepEqual(
    {
      first_name: payload.first_name,
      middle_name: payload.middle_name,
      last_name: payload.last_name,
      extension_name: payload.extension_name,
      date_of_birth: payload.date_of_birth,
      sex: payload.sex,
      age: payload.age,
      cellphone_no: payload.cellphone_no,
      email: payload.email,
      is_pwd: payload.is_pwd,
      pwd_specification: payload.pwd_specification,
      is_4ps_beneficiary: payload.is_4ps_beneficiary,
      four_ps_household_id: payload.four_ps_household_id,
    },
    {
      first_name: "Ana",
      middle_name: "Marie",
      last_name: "Student",
      extension_name: "Jr.",
      date_of_birth: "2010-01-02",
      sex: "Female",
      age: 16,
      cellphone_no: "09123456789",
      email: "ana@example.com",
      is_pwd: "Yes",
      pwd_specification: "Mobility",
      is_4ps_beneficiary: "Yes",
      four_ps_household_id: "0012",
    },
  );
});

test("only the backend's HTTP 201 approved on-site response confirms success", () => {
  assert.deepEqual(
    interpretOnSiteEnrollmentResponse(201, {
      success: true,
      enrollment_id: 44,
      lrn: "123456789012",
      enrollment_status: "Approved",
      enrollment_mode: "on_site",
      school_year: "2026-2027",
      semester: null,
    }, "123456789012"),
    { success: true, enrollmentId: 44, lrn: "123456789012", schoolYear: "2026-2027", semester: null },
  );
  assert.equal(
    interpretOnSiteEnrollmentResponse(200, {
      success: true,
      enrollment_id: 44,
      lrn: "123456789012",
      enrollment_status: "Approved",
      enrollment_mode: "on_site",
    }, "123456789012").success,
    false,
  );
});

test("400 and 409 messages are surfaced, while 500 uses a safe failure message", () => {
  assert.equal(
    interpretOnSiteEnrollmentResponse(400, { message: "LRN is required." }, "").message,
    "LRN is required.",
  );
  assert.equal(
    interpretOnSiteEnrollmentResponse(409, { message: "No eligible period." }, "").message,
    "No eligible period.",
  );
  assert.match(
    interpretOnSiteEnrollmentResponse(500, { message: "Sensitive internal detail" }, "").message,
    /could not confirm/i,
  );
});
