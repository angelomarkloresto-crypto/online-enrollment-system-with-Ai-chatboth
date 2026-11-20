import { useEffect, useMemo, useRef, useState } from "react";
import { apiUrl } from "../../config";
import {
  EMPTY_LEARNER_DISCLOSURES,
  enrollmentDisclosurePayload,
  validateLearnerDisclosures,
} from "../../utils/learnerDisclosures";
import LearnerDisclosureFields from "../../components/LearnerDisclosureFields";

const API_BASE = apiUrl("/backend-online-enrollment/staff");
const BASE_INPUT =
  "mt-1.5 w-full rounded-lg border border-[#CBD9C8] bg-white px-3 py-2.5 text-sm text-[#1B5E2C] outline-none focus:border-[#1B5E2C] focus:ring-1 focus:ring-[#1B5E2C]";
const STUDENT_GRADES = {
  New: ["7", "11"],
  Old: ["8", "9", "10", "12"],
  Returning: ["7", "8", "9", "10", "11", "12"],
};

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

function isValidPhone(value) {
  return /^(?:09\d{9}|\+639\d{9})$/.test(value.trim().replace(/[\s()-]/g, ""));
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export default function OnSiteEnrollment() {
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [gradesLoading, setGradesLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState({
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
    section_id: "",
    average_grade: "",
    report_card_front_received: false,
    report_card_back_received: false,
    psa_birth_certificate_received: false,
    good_moral_received: false,
  });
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const allowedGrades = useMemo(
    () => grades.filter((grade) => STUDENT_GRADES[form.student_type]?.includes(String(grade))),
    [grades, form.student_type],
  );
  const gradeSeven = String(form.grade_level) === "7";

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
    if (!form.grade_level) {
      setSections([]);
      return undefined;
    }
    const controller = new AbortController();
    async function loadSections() {
      setSectionsLoading(true);
      setLoadError("");
      try {
        const params = new URLSearchParams({ grade_level: form.grade_level });
        const response = await fetch(`${API_BASE}/get_on_site_sections.php?${params}`, {
          credentials: "include",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          setSections([]);
          setLoadError(data.message ?? "Could not load sections for this grade.");
          return;
        }
        setSections(data.sections ?? []);
      } catch (error) {
        if (error.name !== "AbortError") {
          setSections([]);
          setLoadError("Could not reach the server to load sections.");
        }
      } finally {
        if (!controller.signal.aborted) setSectionsLoading(false);
      }
    }
    loadSections();
    return () => controller.abort();
  }, [form.grade_level]);

  function changeField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: type === "checkbox" ? checked : value };
      if (name === "date_of_birth") next.age = calculateAge(value);
      if (name === "student_type" && !STUDENT_GRADES[value]?.includes(String(current.grade_level))) {
        next.grade_level = "";
        next.section_id = "";
      }
      if (name === "grade_level") next.section_id = "";
      return next;
    });
    setErrors((current) => ({ ...current, [name]: undefined }));
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

  function validate() {
    const next = {};
    if (!form.lrn.trim()) next.lrn = "Enter the student's LRN.";
    if (form.cellphone_no.trim() && !isValidPhone(form.cellphone_no)) {
      next.cellphone_no = "Enter a valid PH mobile number (09XXXXXXXXX or +639XXXXXXXXX).";
    }
    if (form.email.trim() && !isValidEmail(form.email)) next.email = "Enter a valid email address or leave this field blank.";
    if (!form.student_type) next.student_type = "Select the student's type.";
    if (!form.grade_level) next.grade_level = "Select a grade level.";
    if (!form.section_id) next.section_id = "Select a section.";
    if (form.average_grade === "" || !Number.isFinite(Number(form.average_grade)) || Number(form.average_grade) < 60 || Number(form.average_grade) > 100) {
      next.average_grade = "Enter an average from 60 to 100.";
    }
    if (!form.report_card_front_received) next.report_card_front_received = "Confirm the report card front was received.";
    if (!form.report_card_back_received) next.report_card_back_received = "Confirm the report card back was received.";
    if (gradeSeven && !form.psa_birth_certificate_received) {
      next.psa_birth_certificate_received = "Confirm the PSA/Birth Certificate was received for Grade 7.";
    }
    if (gradeSeven && !form.good_moral_received) {
      next.good_moral_received = "Confirm the Good Moral Certificate was received for Grade 7.";
    }
    Object.assign(next, validateLearnerDisclosures(form));
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current || !validate()) return;

    submittingRef.current = true;
    setSubmitting(true);
    setNotice(null);
    try {
      const payload = {
        ...form,
        ...enrollmentDisclosurePayload(form),
        lrn: form.lrn.trim(),
        first_name: form.first_name.trim(),
        middle_name: form.middle_name.trim(),
        last_name: form.last_name.trim(),
        extension_name: form.extension_name.trim(),
        cellphone_no: form.cellphone_no.trim().replace(/[\s()-]/g, ""),
        grade_level: Number(form.grade_level),
        section_id: Number(form.section_id),
        age: Number(form.age),
        average_grade: Number(form.average_grade),
        password: form.lrn.trim(),
      };
      if (!form.email.trim()) delete payload.email;
      const response = await fetch(`${API_BASE}/create_on_site_enrollment.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setNotice({ type: "error", text: data.message ?? "Could not save this on-site enrollment." });
        return;
      }
      setNotice({
        type: "success",
        text: `${data.message ?? "On-site enrollment recorded."} Status: ${data.enrollment_status ?? "Pending"}.`,
      });
      setForm((current) => ({
        ...current,
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
        section_id: "",
        average_grade: "",
        report_card_front_received: false,
        report_card_back_received: false,
        psa_birth_certificate_received: false,
        good_moral_received: false,
      }));
      setSections([]);
      setErrors({});
    } catch {
      setNotice({ type: "error", text: "Could not reach the server. Please try again." });
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

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <section className="rounded-2xl border border-[#D9E8D5] bg-white p-4 sm:p-5">
          <h3 className="mb-1 text-base font-semibold text-[#1B5E2C]">Student information</h3>
          <p className="mb-4 text-sm text-[#86A18A]">For an existing LRN, these account fields may be left blank. Complete them when registering a new student.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="LRN *" name="lrn" value={form.lrn} onChange={changeField} error={errors.lrn} maxLength={12} />
            <FormField label="First name (new student)" name="first_name" value={form.first_name} onChange={changeField} error={errors.first_name} />
            <FormField label="Middle name" name="middle_name" value={form.middle_name} onChange={changeField} />
            <FormField label="Last name (new student)" name="last_name" value={form.last_name} onChange={changeField} error={errors.last_name} />
            <FormField label="Suffix" name="extension_name" value={form.extension_name} onChange={changeField} placeholder="Jr., Sr., II..." />
            <FormField label="Phone number (new student)" name="cellphone_no" type="tel" value={form.cellphone_no} onChange={changeField} error={errors.cellphone_no} placeholder="09XXXXXXXXX or +639XXXXXXXXX" />
            <FormField label="Email (optional)" name="email" type="email" value={form.email} onChange={changeField} error={errors.email} placeholder="student@example.com" />
            <label className="block text-sm font-medium text-[#1B5E2C]">
              Date of birth (new student)
              <input className={BASE_INPUT} type="date" name="date_of_birth" value={form.date_of_birth} onChange={changeField} />
              {errors.date_of_birth && <FieldError>{errors.date_of_birth}</FieldError>}
            </label>
            <label className="block text-sm font-medium text-[#1B5E2C]">
              Age
              <input className={`${BASE_INPUT} bg-[#FAFAF5]`} value={form.age} readOnly aria-readonly="true" />
            </label>
            <label className="block text-sm font-medium text-[#1B5E2C]">
              Sex (new student)
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SelectField label="Student type *" name="student_type" value={form.student_type} onChange={changeField} error={errors.student_type}>
              {Object.keys(STUDENT_GRADES).map((type) => <option key={type} value={type}>{type}</option>)}
            </SelectField>
            <SelectField label="Grade level *" name="grade_level" value={form.grade_level} onChange={changeField} error={errors.grade_level} disabled={gradesLoading}>
              <option value="">{gradesLoading ? "Loading grades…" : "Select grade"}</option>
              {allowedGrades.map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}
            </SelectField>
            <SelectField label="Section *" name="section_id" value={form.section_id} onChange={changeField} error={errors.section_id} disabled={!form.grade_level || sectionsLoading}>
              <option value="">{sectionsLoading ? "Loading sections…" : "Select section"}</option>
              {sections.map((section) => (
                <option key={section.section_id} value={section.section_id}>
                  {section.section_name}
                </option>
              ))}
            </SelectField>
            <FormField label="Average grade *" name="average_grade" type="number" min="60" max="100" step="0.01" value={form.average_grade} onChange={changeField} error={errors.average_grade} />
          </div>
        </section>

        <section className="rounded-2xl border border-[#D9E8D5] bg-white p-4 sm:p-5">
          <h3 className="text-base font-semibold text-[#1B5E2C]">Physical document checklist</h3>
          <p className="mb-4 mt-1 text-sm text-[#86A18A]">
            Mark each item only after staff has physically received it. PSA/Birth Certificate and Good Moral are required for Grade 7.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <DocumentCheckbox label="Report Card Front *" name="report_card_front_received" checked={form.report_card_front_received} onChange={changeField} error={errors.report_card_front_received} />
            <DocumentCheckbox label="Report Card Back *" name="report_card_back_received" checked={form.report_card_back_received} onChange={changeField} error={errors.report_card_back_received} />
            <DocumentCheckbox label={`PSA/Birth Certificate${gradeSeven ? " *" : " (Grade 7)"}`} name="psa_birth_certificate_received" checked={form.psa_birth_certificate_received} onChange={changeField} error={errors.psa_birth_certificate_received} />
            <DocumentCheckbox label={`Good Moral Certificate${gradeSeven ? " *" : " (Grade 7)"}`} name="good_moral_received" checked={form.good_moral_received} onChange={changeField} error={errors.good_moral_received} />
          </div>
        </section>

        <div className="flex justify-end">
          <button type="submit" disabled={submitting} className="rounded-lg bg-[#1B5E2C] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#164A22] disabled:cursor-not-allowed disabled:opacity-60">
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
