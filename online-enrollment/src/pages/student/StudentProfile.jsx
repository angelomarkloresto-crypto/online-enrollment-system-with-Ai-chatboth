import { useState, useEffect } from "react";


const API_BASE = "/backend-online-enrollment/student";

const SUFFIXES = ["", "Jr.", "Sr.", "II", "III", "IV"];
const isValidOptionalPhone = (value) =>
  value === "" || /^(?:09\d{9}|\+639\d{9})$/.test(value);

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
        <p className="text-xs uppercase tracking-[0.15em] text-[#163832] mb-1">Student Portal</p>
        <h2 className="text-xl sm:text-2xl text-[#0B2B26]" style={{ fontFamily: "'Fraunces', serif" }}>
          My Profile
        </h2>
      </div>

      {loadError && (
        <div className="rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 text-[#B3492B] text-sm px-4 py-3">
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-[#235347]/15 p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 rounded bg-[#DAF1DE]/60 animate-pulse" style={{ width: `${50 + i * 9}%` }} />
          ))}
        </div>
      ) : profile ? (
        <>
          {/* Identity card */}
          <div className="bg-[#0B2B26] rounded-2xl p-5 sm:p-6 flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-[#8EB69B] flex items-center justify-center shrink-0">
              <span className="text-[#0B2B26] text-2xl font-bold" style={{ fontFamily: "'Fraunces', serif" }}>
                {profile.first_name?.[0]?.toUpperCase() ?? "S"}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[#DAF1DE] text-xs mb-0.5">Student</p>
              <p className="text-white font-medium truncate">{fullName}</p>
              <p className="text-[#DAF1DE] text-xs mt-0.5">LRN: {profile.lrn ?? "—"}</p>
              <p className="text-[#DAF1DE] text-xs">{profile.gmail ?? "—"}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#235347]/15">
            {[
              { key: "profile",  label: "Edit Profile"     },
              { key: "password", label: "Change Password"  },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? "border-[#0B2B26] text-[#0B2B26]"
                    : "border-transparent text-[#0B2B26]/45 hover:text-[#0B2B26]"
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
          toast.type === "success" ? "bg-[#0B2B26] text-white" : "bg-[#B3492B] text-white"
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
    father_contact_number: profile.father_contact_number ?? "",
    mother_contact_number: profile.mother_contact_number ?? "",
    guardian_fullname:    profile.guardian_fullname    ?? "",
    guardian_relationship: profile.guardian_relationship ?? "",
    guardian_contact_number: profile.guardian_contact_number ?? "",
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
    for (const field of [
      "father_contact_number",
      "mother_contact_number",
      "guardian_contact_number",
    ]) {
      if (!isValidOptionalPhone(form[field])) {
        errs[field] = "Enter a valid PH mobile number (09XXXXXXXXX or +639XXXXXXXXX).";
      }
    }
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
        <div key={sec.key} className="bg-white rounded-2xl border border-[#235347]/15 overflow-hidden">
          {/* Accordion header */}
          <button
            type="button"
            onClick={() => setOpenSection((p) => p === sec.key ? null : sec.key)}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
          >
            <span className="text-sm font-medium text-[#0B2B26]">{sec.label}</span>
            <svg viewBox="0 0 20 20" className={`h-4 w-4 text-[#0B2B26]/45 transition-transform ${openSection === sec.key ? "rotate-180" : ""}`} fill="none">
              <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {openSection === sec.key && (
            <div className="px-5 pb-5 pt-1 space-y-4 border-t border-[#DAF1DE]/60">

              {sec.key === "personal" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="First Name *"  name="first_name"  value={form.first_name}  error={errors.first_name}  onChange={handleChange} />
                    <Field label="Last Name *"   name="last_name"   value={form.last_name}   error={errors.last_name}   onChange={handleChange} />
                    <Field label="Middle Name"   name="middle_name" value={form.middle_name} onChange={handleChange} />
                    <div>
                      <label className="block text-sm font-medium text-[#0B2B26] mb-1.5">Suffix</label>
                      <select name="suffix" value={form.suffix} onChange={handleChange} className={inputCls()}>
                        {SUFFIXES.map((s) => <option key={s} value={s}>{s || "— None —"}</option>)}
                      </select>
                    </div>
                  </div>
                  <Field label="Contact Number" name="contact_no" value={form.contact_no} error={errors.contact_no} onChange={handleChange} placeholder="09XXXXXXXXX" maxLength={11} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#0B2B26] mb-1.5">Date of Birth</label>
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
                  <Field label="Father's Contact Number" name="father_contact_number" type="tel" value={form.father_contact_number} error={errors.father_contact_number} onChange={handleChange} placeholder="09XXXXXXXXX or +639XXXXXXXXX" maxLength={13} />
                  <Field label="Mother's Contact Number" name="mother_contact_number" type="tel" value={form.mother_contact_number} error={errors.mother_contact_number} onChange={handleChange} placeholder="09XXXXXXXXX or +639XXXXXXXXX" maxLength={13} />
                  <Field label="Guardian Full Name *" name="guardian_fullname"    value={form.guardian_fullname}    error={errors.guardian_fullname} onChange={handleChange} />
                  <Field label="Relationship"         name="guardian_relationship" value={form.guardian_relationship} onChange={handleChange} placeholder="e.g. Mother, Father" />
                  <Field label="Guardian Contact Number" name="guardian_contact_number" value={form.guardian_contact_number} error={errors.guardian_contact_number} onChange={handleChange} type="tel" placeholder="09XXXXXXXXX or +639XXXXXXXXX" maxLength={13} />
                </>
              )}
            </div>
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-[#0B2B26] text-white text-sm font-medium py-3 hover:bg-[#051F20] disabled:opacity-60 transition-colors"
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
    <div className="bg-white rounded-2xl border border-[#235347]/15 p-5 sm:p-6">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Current password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-[#0B2B26]">Current Password</label>
            <button type="button" onClick={() => setShowCurrent((s) => !s)} className="text-xs text-[#163832]">
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
            <label className="text-sm font-medium text-[#0B2B26]">New Password</label>
            <button type="button" onClick={() => setShowNew((s) => !s)} className="text-xs text-[#163832]">
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
                  <span className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 ${r.done ? "bg-[#0B2B26] border-[#0B2B26]" : "border-[#235347]/25"}`}>
                    {r.done && (
                      <svg viewBox="0 0 10 10" className="h-2 w-2">
                        <path d="M2 5l2 2 4-3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  <span className={`text-xs ${r.done ? "text-[#0B2B26]" : "text-[#0B2B26]/45"}`}>{r.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label className="block text-sm font-medium text-[#0B2B26] mb-1.5">Confirm New Password</label>
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
          className="w-full rounded-lg bg-[#0B2B26] text-white text-sm font-medium py-2.5 hover:bg-[#051F20] disabled:opacity-60 transition-colors"
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
      <label className="block text-sm font-medium text-[#0B2B26] mb-1.5">{label}</label>
      <input
        name={name} type={type} value={value} onChange={onChange}
        placeholder={placeholder} readOnly={readOnly} maxLength={maxLength}
        className={`${inputCls(error)} ${readOnly ? "bg-[#DAF1DE]/40 text-[#0B2B26]/45 cursor-not-allowed" : ""}`}
      />
      {error && <Err msg={error} />}
    </div>
  );
}

const inputCls = (err) =>
  `w-full rounded-lg border px-4 py-2.5 text-sm text-[#0B2B26] placeholder:text-[#8EB69B] bg-white focus:outline-none focus:ring-2 focus:ring-[#8EB69B] ${
    err ? "border-[#B3492B]" : "border-[#235347]/25"
  }`;

function Err({ msg }) {
  return <p className="mt-1 text-xs text-[#B3492B]">{msg}</p>;
}
