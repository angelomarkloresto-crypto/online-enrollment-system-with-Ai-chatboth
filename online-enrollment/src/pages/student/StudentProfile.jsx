import { useState, useEffect } from "react";

/**
 * StudentProfile.jsx
 * Talks to:
 *  GET  /student/get_student_profile.php?student_id=X
 *  POST /student/update_student_profile.php
 *  POST /student/change_student_password.php
 *
 * Note: DB column is "guardian_relationship" — correct spelling.
 * Matches the students table column guardian_relationship.
 */

const API_BASE = "http://localhost/backend-online-enrollment/student";

const SUFFIXES = ["", "Jr.", "Sr.", "II", "III", "IV"];

export default function StudentProfile() {
  const studentId = localStorage.getItem("student_id");

  const [profile, setProfile]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeTab, setActiveTab] = useState("profile"); // "profile" | "password"
  const [toast, setToast]         = useState(null);

  useEffect(() => { loadProfile(); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function loadProfile() {
    if (!studentId) { setLoadError("Student ID not found. Please log in again."); setLoading(false); return; }
    setLoading(true);
    setLoadError(null);
    try {
      const res  = await fetch(`${API_BASE}/get_student_profile.php?student_id=${studentId}`, {
        credentials: "include",
      });
      const data = await res.json();
      data.success ? setProfile(data.student) : setLoadError(data.message ?? "Could not load profile.");
    } catch { setLoadError("Could not reach the server."); }
    finally  { setLoading(false); }
  }

  const fullName = profile
    ? `${profile.first_name ?? ""} ${profile.middle_name ? profile.middle_name[0] + ". " : ""}${profile.last_name ?? ""}${profile.suffix ? " " + profile.suffix : ""}`.trim()
    : "—";

  return (
    <div className="px-4 sm:px-6 py-6 space-y-5">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.15em] text-[#8C6B12] mb-1">Student Portal</p>
        <h2 className="text-xl sm:text-2xl text-[#1B5E2C]" style={{ fontFamily: "'Fraunces', serif" }}>
          My Profile
        </h2>
      </div>

      {loadError && (
        <div className="rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 text-[#B3492B] text-sm px-4 py-3">
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-[#D9E8D5] p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 rounded bg-[#EFF4ED] animate-pulse" style={{ width: `${50 + i * 9}%` }} />
          ))}
        </div>
      ) : profile ? (
        <>
          {/* Identity card */}
          <div className="bg-[#1B5E2C] rounded-2xl p-5 sm:p-6 flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-[#F2BE22] flex items-center justify-center shrink-0">
              <span className="text-[#1B5E2C] text-2xl font-bold" style={{ fontFamily: "'Fraunces', serif" }}>
                {profile.first_name?.[0]?.toUpperCase() ?? "S"}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[#CFE3CE] text-xs mb-0.5">Student</p>
              <p className="text-[#FAFAF5] font-medium truncate">{fullName}</p>
              <p className="text-[#CFE3CE] text-xs mt-0.5">LRN: {profile.lrn ?? "—"}</p>
              <p className="text-[#CFE3CE] text-xs">{profile.gmail ?? "—"}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#D9E8D5]">
            {[
              { key: "profile",  label: "Edit Profile"     },
              { key: "password", label: "Change Password"  },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? "border-[#1B5E2C] text-[#1B5E2C]"
                    : "border-transparent text-[#86A18A] hover:text-[#1B5E2C]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "profile" ? (
            <EditProfileForm
              profile={profile}
              studentId={studentId}
              apiBase={API_BASE}
              onSuccess={(updated) => {
                setProfile((prev) => ({ ...prev, ...updated }));
                setToast({ type: "success", text: "Profile updated successfully." });
              }}
              onError={(msg) => setToast({ type: "error", text: msg })}
            />
          ) : (
            <ChangePasswordForm
              studentId={studentId}
              apiBase={API_BASE}
              onSuccess={() => setToast({ type: "success", text: "Password changed successfully." })}
              onError={(msg) => setToast({ type: "error", text: msg })}
            />
          )}
        </>
      ) : null}

      {toast && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm shadow-lg z-50 whitespace-nowrap ${
          toast.type === "success" ? "bg-[#1B5E2C] text-white" : "bg-[#B3492B] text-white"
        }`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   EDIT PROFILE FORM
══════════════════════════════════════════════ */
function EditProfileForm({ profile, studentId, apiBase, onSuccess, onError }) {
  const [form, setForm] = useState({
    first_name:           profile.first_name           ?? "",
    last_name:            profile.last_name            ?? "",
    middle_name:          profile.middle_name          ?? "",
    suffix:               profile.suffix               ?? "",
    contact_no:           profile.contact_no           ?? "",
    date_of_birth:        profile.date_of_birth        ?? "",
    age:                  profile.age                  ?? "",
    nationality:          profile.nationality          ?? "Filipino",
    province:             profile.province             ?? "",
    city_municipality:    profile.city_municipality    ?? "",
    barangay:             profile.barangay             ?? "",
    street_house_no:      profile.street_house_no      ?? "",
    guardian_fullname:    profile.guardian_fullname    ?? "",
    guardian_relationship: profile.guardian_relationship ?? "",
    guardian_contact_no:  profile.guardian_contact_no  ?? "",
  });
  const [errors, setErrors]         = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [openSection, setOpenSection] = useState("personal"); // accordion

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
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

  function validate() {
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = "Required.";
    if (!form.last_name.trim())  errs.last_name  = "Required.";
    if (form.contact_no && !/^09\d{9}$/.test(form.contact_no))
      errs.contact_no = "Enter a valid PH mobile number.";
    if (!form.province.trim())          errs.province          = "Required.";
    if (!form.city_municipality.trim()) errs.city_municipality = "Required.";
    if (!form.barangay.trim())          errs.barangay          = "Required.";
    if (!form.guardian_fullname.trim()) errs.guardian_fullname = "Required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("student_id", studentId);
      Object.entries(form).forEach(([k, v]) => body.append(k, v));
      const res  = await fetch(`${apiBase}/update_student_profile.php`, {
        method: "POST", credentials: "include", body,
      });
      const data = await res.json();
      data.success ? onSuccess(form) : onError(data.message ?? "Could not update profile.");
    } catch { onError("Could not reach the server."); }
    finally  { setSubmitting(false); }
  }

  const SECTIONS = [
    { key: "personal", label: "Personal Information" },
    { key: "address",  label: "Home Address" },
    { key: "guardian", label: "Guardian Information" },
  ];

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      {SECTIONS.map((sec) => (
        <div key={sec.key} className="bg-white rounded-2xl border border-[#D9E8D5] overflow-hidden">
          {/* Accordion header */}
          <button
            type="button"
            onClick={() => setOpenSection((p) => p === sec.key ? null : sec.key)}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
          >
            <span className="text-sm font-medium text-[#1B5E2C]">{sec.label}</span>
            <svg viewBox="0 0 20 20" className={`h-4 w-4 text-[#86A18A] transition-transform ${openSection === sec.key ? "rotate-180" : ""}`} fill="none">
              <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {openSection === sec.key && (
            <div className="px-5 pb-5 pt-1 space-y-4 border-t border-[#EFF4ED]">

              {sec.key === "personal" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="First Name *"  name="first_name"  value={form.first_name}  error={errors.first_name}  onChange={handleChange} />
                    <Field label="Last Name *"   name="last_name"   value={form.last_name}   error={errors.last_name}   onChange={handleChange} />
                    <Field label="Middle Name"   name="middle_name" value={form.middle_name} onChange={handleChange} />
                    <div>
                      <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">Suffix</label>
                      <select name="suffix" value={form.suffix} onChange={handleChange} className={inputCls()}>
                        {SUFFIXES.map((s) => <option key={s} value={s}>{s || "— None —"}</option>)}
                      </select>
                    </div>
                  </div>
                  <Field label="Contact Number" name="contact_no" value={form.contact_no} error={errors.contact_no} onChange={handleChange} placeholder="09XXXXXXXXX" maxLength={11} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">Date of Birth</label>
                      <input type="date" name="date_of_birth" value={form.date_of_birth} onChange={handleChange} className={inputCls()} />
                    </div>
                    <Field label="Age" name="age" type="number" value={form.age} onChange={handleChange} readOnly />
                  </div>
                  <Field label="Nationality" name="nationality" value={form.nationality} onChange={handleChange} />
                </>
              )}

              {sec.key === "address" && (
                <>
                  <Field label="Province *"            name="province"          value={form.province}          error={errors.province}          onChange={handleChange} />
                  <Field label="City / Municipality *" name="city_municipality" value={form.city_municipality} error={errors.city_municipality} onChange={handleChange} />
                  <Field label="Barangay"              name="barangay"          value={form.barangay}          onChange={handleChange} />
                  <Field label="Street / House No."    name="street_house_no"   value={form.street_house_no}   onChange={handleChange} />
                </>
              )}

              {sec.key === "guardian" && (
                <>
                  <Field label="Guardian Full Name *" name="guardian_fullname"    value={form.guardian_fullname}    error={errors.guardian_fullname} onChange={handleChange} />
                  <Field label="Relationship"         name="guardian_relationship" value={form.guardian_relationship} onChange={handleChange} placeholder="e.g. Mother, Father" />
                  <Field label="Guardian Contact No." name="guardian_contact_no"  value={form.guardian_contact_no}  onChange={handleChange} placeholder="09XXXXXXXXX" maxLength={11} />
                </>
              )}
            </div>
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-[#1B5E2C] text-white text-sm font-medium py-3 hover:bg-[#164A22] disabled:opacity-60 transition-colors"
      >
        {submitting ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}

/* ══════════════════════════════════════════════
   CHANGE PASSWORD FORM
══════════════════════════════════════════════ */
function ChangePasswordForm({ studentId, apiBase, onSuccess, onError }) {
  const [form, setForm] = useState({
    current_password:  "",
    new_password:      "",
    confirm_password:  "",
  });
  const [errors, setErrors]         = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);

  const rules = {
    length:     form.new_password.length >= 8,
    upperLower: /[a-z]/.test(form.new_password) && /[A-Z]/.test(form.new_password),
    number:     /[0-9]/.test(form.new_password),
  };

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!form.current_password) errs.current_password = "Enter your current password.";
    if (!Object.values(rules).every(Boolean)) errs.new_password = "Password does not meet requirements.";
    if (form.new_password !== form.confirm_password) errs.confirm_password = "Passwords don't match.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("student_id",       studentId);
      body.append("current_password", form.current_password);
      body.append("new_password",     form.new_password);
      body.append("confirm_password", form.confirm_password);
      const res  = await fetch(`${apiBase}/change_student_password.php`, {
        method: "POST", credentials: "include", body,
      });
      const data = await res.json();
      if (data.success) {
        setForm({ current_password: "", new_password: "", confirm_password: "" });
        onSuccess();
      } else {
        onError(data.message ?? "Could not change password.");
      }
    } catch { onError("Could not reach the server."); }
    finally  { setSubmitting(false); }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#D9E8D5] p-5 sm:p-6">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Current password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-[#1B5E2C]">Current Password</label>
            <button type="button" onClick={() => setShowCurrent((s) => !s)} className="text-xs text-[#8C6B12]">
              {showCurrent ? "Hide" : "Show"}
            </button>
          </div>
          <input
            name="current_password" type={showCurrent ? "text" : "password"}
            value={form.current_password} onChange={handleChange}
            placeholder="Enter current password"
            className={inputCls(errors.current_password)}
          />
          {errors.current_password && <Err msg={errors.current_password} />}
        </div>

        {/* New password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-[#1B5E2C]">New Password</label>
            <button type="button" onClick={() => setShowNew((s) => !s)} className="text-xs text-[#8C6B12]">
              {showNew ? "Hide" : "Show"}
            </button>
          </div>
          <input
            name="new_password" type={showNew ? "text" : "password"}
            value={form.new_password} onChange={handleChange}
            placeholder="At least 8 characters"
            className={inputCls(errors.new_password)}
          />
          {errors.new_password && <Err msg={errors.new_password} />}
          {form.new_password.length > 0 && (
            <div className="mt-2 space-y-1">
              {[
                { label: "At least 8 characters",     done: rules.length },
                { label: "Upper & lower case letters", done: rules.upperLower },
                { label: "Contains a number",          done: rules.number },
              ].map((r) => (
                <div key={r.label} className="flex items-center gap-2">
                  <span className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 ${r.done ? "bg-[#1B5E2C] border-[#1B5E2C]" : "border-[#CBD9C8]"}`}>
                    {r.done && (
                      <svg viewBox="0 0 10 10" className="h-2 w-2">
                        <path d="M2 5l2 2 4-3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  <span className={`text-xs ${r.done ? "text-[#1B5E2C]" : "text-[#86A18A]"}`}>{r.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">Confirm New Password</label>
          <input
            name="confirm_password" type="password"
            value={form.confirm_password} onChange={handleChange}
            placeholder="Re-enter new password"
            className={inputCls(errors.confirm_password)}
          />
          {errors.confirm_password && <Err msg={errors.confirm_password} />}
        </div>

        <button
          type="submit" disabled={submitting}
          className="w-full rounded-lg bg-[#1B5E2C] text-white text-sm font-medium py-2.5 hover:bg-[#164A22] disabled:opacity-60 transition-colors"
        >
          {submitting ? "Updating…" : "Change Password"}
        </button>
      </form>
    </div>
  );
}

/* ── Shared ─────────────────────────────────────────────────── */
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
