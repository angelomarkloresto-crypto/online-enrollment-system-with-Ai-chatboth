export const EMPTY_LEARNER_DISCLOSURES = {
  is_pwd: "",
  pwd_specification: "",
  is_4ps_beneficiary: "",
  four_ps_household_id: "",
};

export function validateLearnerDisclosures(values) {
  const errors = {};

  if (!["Yes", "No"].includes(values.is_pwd)) {
    errors.is_pwd = "Select Yes or No.";
  } else if (values.is_pwd === "Yes") {
    if (!String(values.pwd_specification ?? "").trim()) {
      errors.pwd_specification = "Please specify the disability.";
    } else if (String(values.pwd_specification).trim().length > 500) {
      errors.pwd_specification = "Keep the specification to 500 characters or fewer.";
    }
  }

  if (!["Yes", "No"].includes(values.is_4ps_beneficiary)) {
    errors.is_4ps_beneficiary = "Select Yes or No.";
  } else if (values.is_4ps_beneficiary === "Yes") {
    if (!String(values.four_ps_household_id ?? "").trim()) {
      errors.four_ps_household_id = "Enter the 4Ps Household ID Number.";
    } else if (String(values.four_ps_household_id).trim().length > 100) {
      errors.four_ps_household_id = "Keep the Household ID Number to 100 characters or fewer.";
    }
  }

  return errors;
}

export function enrollmentDisclosurePayload(values) {
  return {
    is_pwd: values.is_pwd,
    pwd_specification: values.is_pwd === "Yes"
      ? String(values.pwd_specification ?? "").trim()
      : null,
    is_4ps_beneficiary: values.is_4ps_beneficiary,
    four_ps_household_id: values.is_4ps_beneficiary === "Yes"
      ? String(values.four_ps_household_id ?? "").trim()
      : null,
  };
}
