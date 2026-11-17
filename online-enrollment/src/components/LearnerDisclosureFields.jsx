const INPUT_CLASS =
  "mt-1.5 w-full rounded-lg border border-[#CBD9C8] bg-white px-3 py-2.5 text-sm text-[#1B5E2C] outline-none focus:border-[#1B5E2C] focus:ring-1 focus:ring-[#1B5E2C]";

export default function LearnerDisclosureFields({ values, errors = {}, onChange }) {
  function changeAnswer(field, value, detailField) {
    onChange(field, value);
    if (value === "No") onChange(detailField, "");
  }

  return (
    <section aria-labelledby="learner-disclosures-heading" className="space-y-4">
      <div>
        <h3 id="learner-disclosures-heading" className="text-base font-semibold text-[#1B5E2C]">
          Learner Information
        </h3>
        <p className="mt-1 text-sm text-[#5B6478]">
          These answers apply to this enrollment.
        </p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-[#1B5E2C]">
          Is the learner a person with disability (PWD)? <span aria-hidden="true">*</span>
        </legend>
        <div className="mt-2 flex gap-4">
          {["Yes", "No"].map((answer) => (
            <label key={answer} className="inline-flex items-center gap-2 text-sm text-[#1B5E2C]">
              <input
                type="radio"
                name="is_pwd"
                value={answer}
                checked={values.is_pwd === answer}
                onChange={(event) => changeAnswer("is_pwd", event.target.value, "pwd_specification")}
                aria-describedby={errors.is_pwd ? "is-pwd-error" : undefined}
                className="accent-[#1B5E2C]"
              />
              {answer}
            </label>
          ))}
        </div>
        {errors.is_pwd && <p id="is-pwd-error" role="alert" className="mt-1 text-sm text-[#B3492B]">{errors.is_pwd}</p>}
      </fieldset>

      {values.is_pwd === "Yes" && (
        <label className="block text-sm font-medium text-[#1B5E2C]">
          If yes, please specify: <span aria-hidden="true">*</span>
          <input
            type="text"
            name="pwd_specification"
            value={values.pwd_specification ?? ""}
            onChange={(event) => onChange("pwd_specification", event.target.value)}
            maxLength={500}
            required
            autoComplete="off"
            aria-describedby={errors.pwd_specification ? "pwd-specification-error" : undefined}
            className={INPUT_CLASS}
          />
          {errors.pwd_specification && <p id="pwd-specification-error" role="alert" className="mt-1 text-sm text-[#B3492B]">{errors.pwd_specification}</p>}
        </label>
      )}

      <fieldset>
        <legend className="text-sm font-medium text-[#1B5E2C]">
          Is your family a beneficiary of 4Ps? <span aria-hidden="true">*</span>
        </legend>
        <div className="mt-2 flex gap-4">
          {["Yes", "No"].map((answer) => (
            <label key={answer} className="inline-flex items-center gap-2 text-sm text-[#1B5E2C]">
              <input
                type="radio"
                name="is_4ps_beneficiary"
                value={answer}
                checked={values.is_4ps_beneficiary === answer}
                onChange={(event) => changeAnswer("is_4ps_beneficiary", event.target.value, "four_ps_household_id")}
                aria-describedby={errors.is_4ps_beneficiary ? "four-ps-answer-error" : undefined}
                className="accent-[#1B5E2C]"
              />
              {answer}
            </label>
          ))}
        </div>
        {errors.is_4ps_beneficiary && <p id="four-ps-answer-error" role="alert" className="mt-1 text-sm text-[#B3492B]">{errors.is_4ps_beneficiary}</p>}
      </fieldset>

      {values.is_4ps_beneficiary === "Yes" && (
        <label className="block text-sm font-medium text-[#1B5E2C]">
          4Ps Household ID Number <span aria-hidden="true">*</span>
          <input
            type="text"
            name="four_ps_household_id"
            value={values.four_ps_household_id ?? ""}
            onChange={(event) => onChange("four_ps_household_id", event.target.value)}
            maxLength={100}
            required
            autoComplete="off"
            aria-describedby={errors.four_ps_household_id ? "four-ps-id-error" : undefined}
            className={INPUT_CLASS}
          />
          {errors.four_ps_household_id && <p id="four-ps-id-error" role="alert" className="mt-1 text-sm text-[#B3492B]">{errors.four_ps_household_id}</p>}
        </label>
      )}
    </section>
  );
}
