import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../../config";
import {
  EMPTY_LEARNER_DISCLOSURES,
  validateLearnerDisclosures,
} from "../../utils/learnerDisclosures";
import {
  buildOnSiteEnrollmentPayload,
  interpretOnSiteEnrollmentResponse,
  isNewOnSiteAccountValidationResponse,
  isValidOnSiteStrandSelection,
  validateOnSiteAccountFields,
} from "../../utils/onSiteEnrollment";
import LearnerDisclosureFields from "../../components/LearnerDisclosureFields";

const API_BASE = apiUrl("/backend-online-enrollment/staff");
const STRANDS_API = apiUrl("/backend-online-enrollment/public/get_active_strands.php");
const PERIOD_API = `${API_BASE}/get_on_site_enrollment_period.php`;
const BASE_INPUT =
  "mt-1.5 w-full rounded-lg border border-[#CBD9C8] bg-white px-3 py-2.5 text-sm text-[#1B5E2C] outline-none focus:border-[#1B5E2C] focus:ring-1 focus:ring-[#1B5E2C]";
const STUDENT_GRADES = {
  New: ["7", "11"],
  Old: ["8", "9", "10", "12"],
  Returning: ["7", "8", "9", "10", "11", "12"],
};
const CHECKLIST_FIELDS = [
  "report_card_front_received",
  "report_card_back_received",
  "psa_birth_certificate_received",
];

function calculateAge(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  if (
    today.getMonth() < date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() < date.getDate())
  ) age--;
  return age >= 0 ? String(age) : "";
}

function createInitialForm() {
  return {
    lrn: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    extension_name: "",
    date_of_birth: "",
    age: "",
    sex: "",
    cellphone_no: "",
    email: "",
    ...EMPTY_LEARNER_DISCLOSURES,
    student_type: "New",
    grade_level: "",
    strand_id: "",
    average_grade: "",
    report_card_front_received: false,
    report_card_back_received: false,
    psa_birth_certificate_received: false,
    good_moral_received: false,
  };
}

export default function OnSiteEnrollment() {
  const navigate = useNavigate();
  const [grades, setGrades] = useState([]);
  const [strands, setStrands] = useState([]);
  const [gradesLoading, setGradesLoading] = useState(true);
  const [strandsLoading, setStrandsLoading] = useState(false);
  const [strandsError, setStrandsError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [periods, setPeriods] = useState([]);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [periodsError, setPeriodsError] = useState("");
  const [form, setForm] = useState(createInitialForm);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [accountCreationRequired, setAccountCreationRequired] = useState(false);
  const submittingRef = useRef(false);

  const allowedGrades = useMemo(
    () => grades.filter((grade) => STUDENT_GRADES[form.student_type]?.includes(String(grade))),
    [grades, form.student_type],
  );
  const isSHS = Number(form.grade_level) >= 11;

  useEffect(() => {
    const controller = new AbortController();
    async function loadGrades() {
      setGradesLoading(true);
      setLoadError("");
      try {
        const response = await fetch(`${API_BASE}/get_on_site_grades.php`, {
          credentials: "include",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          setLoadError(data.message ?? "Could not load available grade levels.");
          return;
        }
        setGrades((data.grades ?? []).map(String));
      } catch (error) {
        if (error.name !== "AbortError") setLoadError("Could not reach the server to load grade levels.");
      } finally {
        if (!controller.signal.aborted) setGradesLoading(false);
      }
    }
    loadGrades();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadPeriods() {
      setPeriodsLoading(true);
      setPeriodsError("");
      try {
        const response = await fetch(PERIOD_API, {
          credentials: "include",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message ?? "Could not load enrollment periods.");
        }
        setPeriods(Array.isArray(data.periods) ? data.periods : []);
      } catch (error) {
        if (error.name !== "AbortError") {
          setPeriods([]);
          setPeriodsError(error.message ?? "Could not load enrollment periods.");
        }
      } finally {
        if (!controller.signal.aborted) setPeriodsLoading(false);
      }
    }
    loadPeriods();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!isSHS) {
      setStrands([]);
      setStrandsError("");
      setStrandsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    async function loadStrands() {
      setStrandsLoading(true);
      setStrandsError("");
      try {
        const response = await fetch(STRANDS_API, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !data.success || !Array.isArray(data.strands)) {
          throw new Error(data.message ?? "Could not load active SHS strands.");
        }
        setStrands(data.strands);
      } catch (error) {
        if (error.name !== "AbortError") {
          setStrands([]);
          setStrandsError(error.message ?? "Could not load active SHS strands.");
        }
      } finally {
        if (!controller.signal.aborted) setStrandsLoading(false);
      }
    }
    loadStrands();
    return () => controller.abort();
  }, [isSHS]);

  function changeField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: type === "checkbox" ? checked : value };
      if (name === "date_of_birth") next.age = calculateAge(value);
      if (name === "student_type" && !STUDENT_GRADES[value]?.includes(String(current.grade_level))) {
        next.grade_level = "";
        next.strand_id = "";
      }
      if (name === "grade_level") next.strand_id = "";
      return next;
    });
    setErrors((current) => ({
      ...current,
      [name]: undefined,
      ...(name === "date_of_birth" ? { age: undefined } : {}),
      ...(name === "lrn" ? {
        first_name: undefined,
        last_name: undefined,
        date_of_birth: undefined,
        sex: undefined,
        age: undefined,
        cellphone_no: undefined,
      } : {}),
    }));
    if (name === "lrn") setAccountCreationRequired(false);
    setNotice(null);
  }

  function changeLearnerDisclosure(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({
      ...current,
      [name]: undefined,
      ...(name === "is_pwd" ? { pwd_specification: undefined } : {}),
      ...(name === "is_4ps_beneficiary" ? { four_ps_household_id: undefined } : {}),
    }));
    setNotice(null);
  }

  function validate(requireAccountFields = accountCreationRequired) {
    const next = {};
    if (!form.lrn.trim()) next.lrn = "Enter the student's LRN.";
    Object.assign(next, validateOnSiteAccountFields(form, requireAccountFields));
    if (!["New", "Old", "Returning"].includes(form.student_type)) next.student_type = "Select the student's type.";
    if (!form.grade_level || !allowedGrades.includes(String(form.grade_level))) {
      next.grade_level = "Select an available grade level for this student type.";
    }
    if (!isValidOnSiteStrandSelection(form.grade_level, strands, form.strand_id)) {
      next.strand_id = "Select an active strand for Senior High School.";
    }
    if (form.average_grade === "" || !Number.isFinite(Number(form.average_grade)) || Number(form.average_grade) < 60 || Number(form.average_grade) > 100) {
      next.average_grade = "Enter an average from 60 to 100.";
    }
    for (const field of CHECKLIST_FIELDS) {
      if (!form[field]) next[field] = "Confirm this required document was received.";
    }
    Object.assign(next, validateLearnerDisclosures(form));
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (periodsLoading) return;
    if (periods.length === 0) {
      setNotice({
        type: "error",
        text: periodsError || "There is no open enrollment period. On-Site enrollment cannot be saved.",
      });
      return;
    }
    if (submittingRef.current || !validate()) return;

    submittingRef.current = true;
    setSubmitting(true);
    setNotice(null);
    try {
      const payload = buildOnSiteEnrollmentPayload(form);
      const response = await fetch(`${API_BASE}/create_on_site_enrollment.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      const result = interpretOnSiteEnrollmentResponse(
        response.status,
        data,
        payload.lrn,
      );
      if (!result.success) {
        if (isNewOnSiteAccountValidationResponse(response.status, data)) {
          setAccountCreationRequired(true);
          validate(true);
          setNotice({
            type: "error",
            text: "This LRN has no existing student account. Complete or correct the required account details, then submit again.",
          });
          return;
        }
        setNotice({ type: "error", text: result.message });
        return;
      }

      navigate("/staff/student-list", {
        state: {
          onSiteEnrollmentSuccess: {
            lrn: result.lrn,
            grade_level: Number(form.grade_level),
            enrollment_status: "Approved",
            school_year: result.schoolYear,
            semester: result.semester,
          },
        },
      });
    } catch {
      setNotice({
        type: "error",
        text: "The server could not confirm the On-Site enrollment. Please verify the student record before retrying.",
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5 px-4 py-6 sm:px-6">
      <header>
        <p className="mb-1 text-xs uppercase tracking-[0.15em] text-[#8C6B12]">Staff Portal</p>
        <h2 className="text-xl text-[#1B5E2C] sm:text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>
          On-Site Enrollment Form
        </h2>
        <p className="mt-1 text-sm text-[#86A18A]">Record in-person enrollment and confirm the physical documents received. No document uploads are needed.</p>
      </header>

      {notice && <Notice notice={notice} />}
      {loadError && <p role="alert" className="rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 px-4 py-3 text-sm text-[#B3492B]">{loadError}</p>}
      <section className="rounded-2xl border border-[#D9E8D5] bg-white p-4 sm:p-5">
        <h3 className="text-base font-semibold text-[#1B5E2C]">Active enrollment period</h3>
        {periodsLoading ? (
          <p className="mt-2 text-sm text-[#86A18A]">Checking enrollment periods…</p>
        ) : periodsError ? (
          <p role="alert" className="mt-2 text-sm text-[#B3492B]">{periodsError}</p>
        ) : periods.length === 0 ? (
          <p role="alert" className="mt-2 text-sm text-[#B3492B]">Enrollment is closed. No active enrollment period is available for On-Site enrollment.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {periods.map((period) => (
              <div key={period.enrollment_period_id} className="flex flex-col gap-1 rounded-lg border border-[#D9E8D5] bg-[#FAFAF5] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-semibold text-[#1B5E2C]">{period.school_year}</p>
                <p className="text-sm text-[#86A18A]">
                  {period.coverage === "shs_second_semester" ? "Senior High School · 2nd Semester" : "All Grade Levels"}
                  {period.semester ? ` · ${period.semester}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <section className="rounded-2xl border border-[#D9E8D5] bg-white p-4 sm:p-5">
          <h3 className="mb-1 text-base font-semibold text-[#1B5E2C]">Student information</h3>
          <p className="mb-4 text-sm text-[#86A18A]">
            {accountCreationRequired
              ? "This LRN was not found as an existing student account. Complete the required account details; the initial password will be the LRN."
              : "For an existing LRN, account fields may be left blank. If no account exists, the server will identify that and request the required details; the initial password will be the LRN."}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="LRN *" name="lrn" value={form.lrn} onChange={changeField} error={errors.lrn} maxLength={12} />
            <FormField label={`First name${accountCreationRequired ? " *" : " (new student)"}`} name="first_name" value={form.first_name} onChange={changeField} error={errors.first_name} />
            <FormField label="Middle name" name="middle_name" value={form.middle_name} onChange={changeField} error={errors.middle_name} />
            <FormField label={`Last name${accountCreationRequired ? " *" : " (new student)"}`} name="last_name" value={form.last_name} onChange={changeField} error={errors.last_name} />
            <FormField label="Suffix" name="extension_name" value={form.extension_name} onChange={changeField} error={errors.extension_name} placeholder="Jr., Sr., II..." />
            <FormField label={`Phone number${accountCreationRequired ? " *" : " (new student)"}`} name="cellphone_no" type="tel" value={form.cellphone_no} onChange={changeField} error={errors.cellphone_no} placeholder="09XXXXXXXXX or +639XXXXXXXXX" />
            <FormField label="Email (optional)" name="email" type="email" value={form.email} onChange={changeField} error={errors.email} placeholder="student@example.com" />
            <label className="block text-sm font-medium text-[#1B5E2C]">
              Date of birth{accountCreationRequired ? " *" : " (new student)"}
              <input className={BASE_INPUT} type="date" name="date_of_birth" value={form.date_of_birth} onChange={changeField} />
              {errors.date_of_birth && <FieldError>{errors.date_of_birth}</FieldError>}
            </label>
            <label className="block text-sm font-medium text-[#1B5E2C]">
              Age{accountCreationRequired ? " *" : " (new student)"}
              <input className={`${BASE_INPUT} bg-[#FAFAF5]`} value={form.age} readOnly aria-readonly="true" />
              {errors.age && <FieldError>{errors.age}</FieldError>}
            </label>
            <label className="block text-sm font-medium text-[#1B5E2C]">
              Sex{accountCreationRequired ? " *" : " (new student)"}
              <select className={BASE_INPUT} name="sex" value={form.sex} onChange={changeField}>
                <option value="">Select sex</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              {errors.sex && <FieldError>{errors.sex}</FieldError>}
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-[#D9E8D5] bg-white p-4 sm:p-5">
          <LearnerDisclosureFields
            values={form}
            errors={errors}
            onChange={changeLearnerDisclosure}
          />
        </section>

        <section className="rounded-2xl border border-[#D9E8D5] bg-white p-4 sm:p-5">
          <h3 className="mb-4 text-base font-semibold text-[#1B5E2C]">Enrollment details</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField label="Student type *" name="student_type" value={form.student_type} onChange={changeField} error={errors.student_type}>
              {Object.keys(STUDENT_GRADES).map((type) => <option key={type} value={type}>{type}</option>)}
            </SelectField>
            <SelectField label="Grade level *" name="grade_level" value={form.grade_level} onChange={changeField} error={errors.grade_level} disabled={gradesLoading}>
              <option value="">{gradesLoading ? "Loading grades…" : "Select grade"}</option>
              {allowedGrades.map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}
            </SelectField>
            {isSHS && (
              <SelectField label="Active strand *" name="strand_id" value={form.strand_id} onChange={changeField} error={errors.strand_id} disabled={strandsLoading || Boolean(strandsError)}>
                <option value="">{strandsLoading ? "Loading strands…" : "Select strand"}</option>
                {strands.map((strand) => (
                  <option key={strand.strand_id} value={strand.strand_id}>{strand.strand_name}</option>
                ))}
              </SelectField>
            )}
            {isSHS && strandsError && <p role="alert" className="text-sm text-[#B3492B]">{strandsError}</p>}
            <FormField label="Average grade *" name="average_grade" type="number" min="60" max="100" step="0.01" value={form.average_grade} onChange={changeField} error={errors.average_grade} />
          </div>
        </section>

        <section className="rounded-2xl border border-[#D9E8D5] bg-white p-4 sm:p-5">
          <h3 className="text-base font-semibold text-[#1B5E2C]">Physical document checklist</h3>
          <p className="mb-4 mt-1 text-sm text-[#86A18A]">
            Mark each item only after staff has physically received it. Report card front and back and PSA/Birth Certificate are required; Good Moral is optional.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <DocumentCheckbox label="Report Card Front *" name="report_card_front_received" checked={form.report_card_front_received} onChange={changeField} error={errors.report_card_front_received} />
            <DocumentCheckbox label="Report Card Back *" name="report_card_back_received" checked={form.report_card_back_received} onChange={changeField} error={errors.report_card_back_received} />
            <DocumentCheckbox label="PSA/Birth Certificate *" name="psa_birth_certificate_received" checked={form.psa_birth_certificate_received} onChange={changeField} error={errors.psa_birth_certificate_received} />
            <DocumentCheckbox label="Good Moral Certificate (optional)" name="good_moral_received" checked={form.good_moral_received} onChange={changeField} error={errors.good_moral_received} />
          </div>
        </section>

        <div className="flex justify-end">
          <button type="submit" disabled={submitting || gradesLoading || periodsLoading || periods.length === 0} className="rounded-lg bg-[#1B5E2C] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#164A22] disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? "Saving enrollment…" : "Save On-Site Enrollment"}
          </button>
        </div>
      </form>
    </div>
  );
}

function FormField({ label, name, value, onChange, error, type = "text", ...props }) {
  return (
    <label className="block text-sm font-medium text-[#1B5E2C]">
      {label}
      <input className={BASE_INPUT} type={type} name={name} value={value} onChange={onChange} {...props} />
      {error && <FieldError>{error}</FieldError>}
    </label>
  );
}

function SelectField({ label, name, value, onChange, error, disabled, children }) {
  return (
    <label className="block text-sm font-medium text-[#1B5E2C]">
      {label}
      <select className={`${BASE_INPUT} disabled:bg-[#FAFAF5]`} name={name} value={value} onChange={onChange} disabled={disabled}>
        {children}
      </select>
      {error && <FieldError>{error}</FieldError>}
    </label>
  );
}

function DocumentCheckbox({ label, name, checked, onChange, error }) {
  return (
    <label className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${error ? "border-[#B3492B]" : "border-[#D9E8D5]"}`}>
      <input className="mt-0.5 h-4 w-4 accent-[#1B5E2C]" type="checkbox" name={name} checked={checked} onChange={onChange} />
      <span className="font-medium text-[#1B5E2C]">{label}</span>
      {error && <FieldError>{error}</FieldError>}
    </label>
  );
}

function FieldError({ children }) {
  return <span className="mt-1 block text-xs font-normal text-[#B3492B]">{children}</span>;
}

function Notice({ notice }) {
  return (
    <p role={notice.type === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${notice.type === "success" ? "border-[#1B5E2C]/30 bg-[#1B5E2C]/10 text-[#1B5E2C]" : "border-[#B3492B]/30 bg-[#B3492B]/10 text-[#B3492B]"}`}>
      {notice.text}
    </p>
  );
}
