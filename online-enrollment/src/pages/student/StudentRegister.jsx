import { useState } from "react";

/**
 * StudentRegister.jsx
 * Talks to: POST /student/student_register.php
 *
 * Backend bugs to fix in student_register.php:
 *  - Method check is "$_POST" string — should be "POST"
 *  - Duplicate check: "SELECT studen_id student WHERE gmail = ? OR lrn ?"
 *    should be "SELECT student_id FROM students WHERE gmail = ? OR lrn = ?"
 *  - check logic inverted — $check->get_result() returns a result object
 *    (always truthy), should be $check->get_result()->num_rows > 0
 *  - INSERT has "VAUES" typo — should be "VALUES"
 *  - bind_param has 18 s's but only 17 ? placeholders and fields
 */

// Use a relative path so the Vite dev server can proxy requests to the PHP backend.
const API_BASE = "http://localhost/backend-online-enrollment/student";

const STEPS = [
  { label: "Personal",  desc: "Basic information" },
  { label: "Address",   desc: "Home address"       },
  { label: "Guardian",  desc: "Parent or guardian"  },
  { label: "Account",   desc: "Login credentials"   },
];

const SUFFIXES       = ["", "Jr.", "Sr.", "II", "III", "IV"];
const NATIONALITIES  = ["Filipino", "Other"];

const emptyForm = {
  // Step 1 — Personal
  first_name:       "",
  last_name:        "",
  middle_name:      "",
  suffix:           "",
  lrn:              "",
  contact_no:       "",
  gmail:            "",
  date_of_birth:    "",
  age:              "",
  nationality:      "Filipino",
  // Step 2 — Address
  province:         "",
  city_municipality:"",
  barangay:         "",
  street_house_no:  "",
  // Step 3 — Guardian
  guardian_fullname:    "",
  guardian_relationship:"",
  guardian_contact_no:  "",
  // Step 4 — Account
  password:         "",
  confirm_password: "",
};

export default function StudentRegister({ onGoLogin }) {
  const [step, setStep]         = useState(1);
  const [form, setForm]         = useState(emptyForm);
  const [errors, setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverMsg, setServerMsg]   = useState(null); // {type, text}

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // Auto-compute age from date_of_birth
      if (name === "date_of_birth" && value) {
        const today = new Date();
        const dob   = new Date(value);
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        next.age = age >= 0 ? String(age) : "";
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  /* ── Validators per step ── */
  function validateStep(s) {
    const errs = {};
    if (s === 1) {
      if (!form.first_name.trim())    errs.first_name    = "Required.";
      if (!form.last_name.trim())     errs.last_name     = "Required.";
      if (!/^\d{12}$/.test(form.lrn)) errs.lrn           = "LRN must be 12 digits.";
      if (!/^09\d{9}$/.test(form.contact_no)) errs.contact_no = "Enter a valid PH mobile number (09XXXXXXXXX).";
      if (!/^[^\s@]+@gmail\.com$/.test(form.gmail)) errs.gmail = "Enter a valid Gmail address.";
      if (!form.date_of_birth)        errs.date_of_birth = "Required.";
      if (!form.age)                  errs.age           = "Required.";
    }
    if (s === 2) {
      if (!form.province.trim())          errs.province          = "Required.";
      if (!form.city_municipality.trim()) errs.city_municipality = "Required.";
      if (!form.barangay.trim())          errs.barangay          = "Required.";
      if (!form.street_house_no.trim())   errs.street_house_no   = "Required.";
    }
    if (s === 3) {
      if (!form.guardian_fullname.trim())     errs.guardian_fullname     = "Required.";
      if (!form.guardian_relationship.trim()) errs.guardian_relationship = "Required.";
      if (!/^09\d{9}$/.test(form.guardian_contact_no))
        errs.guardian_contact_no = "Enter a valid PH mobile number.";
    }
    if (s === 4) {
      if (form.password.length < 8)    errs.password         = "At least 8 characters.";
      if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password))
        errs.password = "Must contain upper and lower case letters.";
      if (!/[0-9]/.test(form.password)) errs.password        = "Must contain a number.";
      if (form.password !== form.confirm_password)
        errs.confirm_password = "Passwords don't match.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext() {
    if (validateStep(step)) setStep((s) => s + 1);
  }

  function handleBack() {
    setStep((s) => s - 1);
    setErrors({});
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateStep(4)) return;
    setSubmitting(true);
    setServerMsg(null);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k !== "confirm_password") body.append(k, v);
      });
      const res  = await fetch(`${API_BASE}/student_register.php`, {
        method: "POST", credentials: "include", body,
      });
      const data = await res.json();
      if (data.success) {
        setServerMsg({ type: "success", text: "Account created! You can now log in." });
        setTimeout(() => onGoLogin?.(), 2000);
      } else {
        setServerMsg({ type: "error", text: data.message ?? "Registration failed." });
      }
    } catch {
      setServerMsg({ type: "error", text: "Could not reach the server." });
    } finally { setSubmitting(false); }
  }

  const pctW = `${(step / STEPS.length) * 100}%`;

  return (
    <div className="min-h-screen w-full bg-[#FAFAF5] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">

        {/* Logo + heading */}
        <div className="flex flex-col items-center text-center mb-7">
          <img
            src="/assets/gogon-hs-logo.png"
            alt="Gogon High School"
            className="h-14 w-14 rounded-full object-cover ring-2 ring-[#F2BE22] mb-4"
          />
          <p className="text-xs uppercase tracking-[0.2em] text-[#8C6B12] mb-1">
            Gogon High School · Online Enrollment
          </p>
          <h1
            className="text-2xl sm:text-3xl text-[#1B5E2C]"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            Create Student Account
          </h1>
        </div>

        {/* Step indicators */}
        <div className="mb-6">
          {/* Progress bar */}
          <div className="h-1.5 w-full bg-[#D9E8D5] rounded-full mb-4 overflow-hidden">
            <div
              className="h-full bg-[#1B5E2C] rounded-full transition-all duration-300"
              style={{ width: pctW }}
            />
          </div>
          <div className="grid grid-cols-4 gap-1">
            {STEPS.map((s, i) => {
              const n      = i + 1;
              const active = step === n;
              const done   = step > n;
              return (
                <div key={s.label} className="flex flex-col items-center text-center">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium mb-1 transition-colors ${
                    done   ? "bg-[#1B5E2C] text-white"
                    : active ? "bg-[#F2BE22] text-[#1B5E2C]"
                    : "bg-[#EFF4ED] text-[#86A18A]"
                  }`}>
                    {done ? "✓" : n}
                  </div>
                  <p className={`text-xs font-medium hidden sm:block ${active ? "text-[#1B5E2C]" : "text-[#86A18A]"}`}>
                    {s.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#D9E8D5] shadow-sm p-6 sm:p-7">
          <div className="mb-5">
            <h2 className="text-lg font-medium text-[#1B5E2C]"
              style={{ fontFamily: "'Fraunces', serif" }}>
              Step {step} — {STEPS[step - 1].label}
            </h2>
            <p className="text-sm text-[#86A18A]">{STEPS[step - 1].desc}</p>
          </div>

          {serverMsg && (
            <div className={`mb-5 rounded-lg px-4 py-3 text-sm border ${
              serverMsg.type === "success"
                ? "bg-[#1B5E2C]/10 text-[#1B5E2C] border-[#1B5E2C]/30"
                : "bg-[#B3492B]/10 text-[#B3492B] border-[#B3492B]/30"
            }`}>
              {serverMsg.text}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {step === 1 && <StepPersonal form={form} errors={errors} onChange={handleChange} />}
            {step === 2 && <StepAddress  form={form} errors={errors} onChange={handleChange} />}
            {step === 3 && <StepGuardian form={form} errors={errors} onChange={handleChange} />}
            {step === 4 && <StepAccount  form={form} errors={errors} onChange={handleChange} />}

            {/* Navigation */}
            <div className={`flex gap-3 mt-6 ${step > 1 ? "" : "justify-end"}`}>
              {step > 1 && (
                <button type="button" onClick={handleBack}
                  className="flex-1 rounded-lg border border-[#CBD9C8] text-[#5B6478] text-sm font-medium py-2.5 hover:bg-[#FAFAF5]">
                  Back
                </button>
              )}
              {step < 4 ? (
                <button type="button" onClick={handleNext}
                  className="flex-1 rounded-lg bg-[#1B5E2C] text-white text-sm font-medium py-2.5 hover:bg-[#164A22] transition-colors">
                  Next →
                </button>
              ) : (
                <button type="submit" disabled={submitting}
                  className="flex-1 rounded-lg bg-[#1B5E2C] text-white text-sm font-medium py-2.5 hover:bg-[#164A22] disabled:opacity-60 transition-colors">
                  {submitting ? "Creating account…" : "Create Account"}
                </button>
              )}
            </div>
          </form>
        </div>

        <p className="text-center text-sm text-[#86A18A] mt-5">
          Already have an account?{" "}
          <button onClick={onGoLogin} className="text-[#8C6B12] font-medium hover:underline">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   STEP 1 — PERSONAL INFORMATION
══════════════════════════════════════════════ */
function StepPersonal({ form, errors, onChange }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="First Name *" name="first_name" value={form.first_name} error={errors.first_name} onChange={onChange} placeholder="Juan" />
        <Field label="Last Name *"  name="last_name"  value={form.last_name}  error={errors.last_name}  onChange={onChange} placeholder="Dela Cruz" />
        <Field label="Middle Name"  name="middle_name" value={form.middle_name} onChange={onChange} placeholder="Santos" />
        <div>
          <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">Suffix</label>
          <select name="suffix" value={form.suffix} onChange={onChange} className={inputCls()}>
            {SUFFIXES.map((s) => <option key={s} value={s}>{s || "— None —"}</option>)}
          </select>
        </div>
      </div>
      <Field label="LRN (Learner Reference Number) *" name="lrn" value={form.lrn} error={errors.lrn} onChange={onChange} placeholder="12-digit LRN" maxLength={12} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Gmail Address *" name="gmail" type="email" value={form.gmail} error={errors.gmail} onChange={onChange} placeholder="juan@gmail.com" />
        <Field label="Contact Number *" name="contact_no" value={form.contact_no} error={errors.contact_no} onChange={onChange} placeholder="09XXXXXXXXX" maxLength={11} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">Date of Birth *</label>
          <input type="date" name="date_of_birth" value={form.date_of_birth} onChange={onChange}
            className={inputCls(errors.date_of_birth)} />
          {errors.date_of_birth && <Err msg={errors.date_of_birth} />}
        </div>
        <Field label="Age" name="age" type="number" value={form.age} onChange={onChange} placeholder="Auto-computed" readOnly />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">Nationality</label>
        <select name="nationality" value={form.nationality} onChange={onChange} className={inputCls()}>
          {NATIONALITIES.map((n) => <option key={n}>{n}</option>)}
        </select>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   STEP 2 — ADDRESS
══════════════════════════════════════════════ */
function StepAddress({ form, errors, onChange }) {
  return (
    <div className="space-y-4">
      <Field label="Province *"           name="province"          value={form.province}          error={errors.province}          onChange={onChange} placeholder="e.g. Albay" />
      <Field label="City / Municipality *" name="city_municipality" value={form.city_municipality} error={errors.city_municipality} onChange={onChange} placeholder="e.g. Legazpi City" />
      <Field label="Barangay *"           name="barangay"          value={form.barangay}          error={errors.barangay}          onChange={onChange} placeholder="e.g. Gogon" />
      <Field label="Street / House No. *" name="street_house_no"   value={form.street_house_no}   error={errors.street_house_no}   onChange={onChange} placeholder="e.g. 123 Rizal St." />
    </div>
  );
}

/* ══════════════════════════════════════════════
   STEP 3 — GUARDIAN
══════════════════════════════════════════════ */
function StepGuardian({ form, errors, onChange }) {
  return (
    <div className="space-y-4">
      <Field label="Guardian Full Name *"   name="guardian_fullname"     value={form.guardian_fullname}     error={errors.guardian_fullname}     onChange={onChange} placeholder="Maria Dela Cruz" />
      <Field label="Relationship *"         name="guardian_relationship" value={form.guardian_relationship} error={errors.guardian_relationship} onChange={onChange} placeholder="e.g. Mother, Father, Aunt" />
      <Field label="Guardian Contact No. *" name="guardian_contact_no"   value={form.guardian_contact_no}   error={errors.guardian_contact_no}   onChange={onChange} placeholder="09XXXXXXXXX" maxLength={11} />
    </div>
  );
}

/* ══════════════════════════════════════════════
   STEP 4 — ACCOUNT
══════════════════════════════════════════════ */
function StepAccount({ form, errors, onChange }) {
  const [showPw, setShowPw]     = useState(false);
  const [showCPw, setShowCPw]   = useState(false);

  const rules = {
    length:     form.password.length >= 8,
    upperLower: /[a-z]/.test(form.password) && /[A-Z]/.test(form.password),
    number:     /[0-9]/.test(form.password),
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#FAFAF5] rounded-xl border border-[#D9E8D5] p-4 text-sm text-[#5B6478]">
        You will use your <span className="font-medium text-[#1B5E2C]">Gmail address</span> and this password to log in.
        <span className="block mt-1 text-[#8C6B12] font-medium">{form.gmail || "—"}</span>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-[#1B5E2C]">Password *</label>
          <button type="button" onClick={() => setShowPw(s => !s)} className="text-xs text-[#8C6B12]">{showPw ? "Hide" : "Show"}</button>
        </div>
        <input name="password" type={showPw ? "text" : "password"}
          value={form.password} onChange={onChange}
          placeholder="At least 8 characters"
          className={inputCls(errors.password)} />
        {errors.password && <Err msg={errors.password} />}

        {form.password.length > 0 && (
          <div className="mt-2 space-y-1">
            {[
              { label: "At least 8 characters",     done: rules.length },
              { label: "Upper & lower case letters", done: rules.upperLower },
              { label: "Contains a number",          done: rules.number },
            ].map((r) => (
              <div key={r.label} className="flex items-center gap-2">
                <span className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 ${r.done ? "bg-[#1B5E2C] border-[#1B5E2C]" : "border-[#CBD9C8]"}`}>
                  {r.done && <svg viewBox="0 0 10 10" className="h-2 w-2"><path d="M2 5l2 2 4-3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </span>
                <span className={`text-xs ${r.done ? "text-[#1B5E2C]" : "text-[#86A18A]"}`}>{r.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-[#1B5E2C]">Confirm Password *</label>
          <button type="button" onClick={() => setShowCPw(s => !s)} className="text-xs text-[#8C6B12]">{showCPw ? "Hide" : "Show"}</button>
        </div>
        <input name="confirm_password" type={showCPw ? "text" : "password"}
          value={form.confirm_password} onChange={onChange}
          placeholder="Re-enter password"
          className={inputCls(errors.confirm_password)} />
        {errors.confirm_password && <Err msg={errors.confirm_password} />}
      </div>
    </div>
  );
}

/* ── Shared tiny components ──────────────────────────────────── */
function Field({ label, name, value, onChange, error, placeholder, type = "text", readOnly, maxLength }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">{label}</label>
      <input
        name={name} type={type} value={value} onChange={onChange}
        placeholder={placeholder} readOnly={readOnly} maxLength={maxLength}
        className={`${inputCls(error)} ${readOnly ? "bg-[#FAFAF5] text-[#86A18A] cursor-not-allowed" : ""}`}
      />
      {error && <Err msg={error} />}
    </div>
  );
}

const inputCls = (err) =>
  `w-full rounded-lg border px-4 py-2.5 text-sm text-[#1B5E2C] placeholder:text-[#A8AEBC] bg-white focus:outline-none focus:ring-2 focus:ring-[#F2BE22] ${
    err ? "border-[#B3492B]" : "border-[#CBD9C8]"
  }`;

function Err({ msg }) {
  return <p className="mt-1 text-xs text-[#B3492B]">{msg}</p>;
}
