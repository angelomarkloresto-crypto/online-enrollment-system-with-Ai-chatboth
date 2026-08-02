import { useState, useEffect } from "react";

/**
 * AdminProfile.jsx
 * Talks to:
 *  - GET  /admin/get_admin_profile.php?admin_id=X
 *  - POST /admin/update_admin_profile.php  { admin_id, email }
 *  - POST /admin/change_admin_password.php  { admin_id, current_password, new_password }
 *
 * Backend bug fixed to note:
 *  - change_admin_password.php had $smin_id (typo) and the success block was nested
 *    inside the wrong-password branch — meaning it only updated on a wrong password.
 *    Make sure that's corrected before testing the password change form.
 *  - update_admin_profile.php uses "SELECT admins WHERE ..." instead of
 *    "SELECT * FROM admins WHERE ..." — missing "* FROM", will throw a SQL error.
 */

const API_BASE = "http://localhost/backend-online-enrollment/admin";

export default function AdminProfile({ adminId }) {
  // Fallback: read admin_id from localStorage if not passed as prop
  const resolvedId = adminId ?? localStorage.getItem("admin_id");

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [activeTab, setActiveTab] = useState("profile"); // "profile" | "password"
  const [toast, setToast] = useState(null); // { type, text }

  useEffect(() => {
    loadProfile();
  }, [resolvedId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function loadProfile() {
    if (!resolvedId) {
      setLoadError("Admin ID not found. Please log in again.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `${API_BASE}/get_admin_profile.php?admin_id=${resolvedId}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (data.success) {
        setProfile(data.admin);
      } else {
        setLoadError(data.message || "Could not load profile.");
      }
    } catch {
      setLoadError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#FAFAF5] px-4 sm:px-6 lg:px-10 py-8">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.15em] text-[#8C6B12] mb-1">
            Gogon High School
          </p>
          <h1
            className="text-2xl sm:text-3xl text-[#1B5E2C]"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            Admin Profile
          </h1>
        </header>

        {loadError && (
          <div className="mb-6 rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 text-[#B3492B] text-sm px-4 py-3">
            {loadError}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-[#D9E8D5] p-8 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-4 rounded bg-[#EFF4ED] animate-pulse"
                style={{ width: `${60 + i * 10}%` }}
              />
            ))}
          </div>
        ) : profile ? (
          <>
            {/* Identity card */}
            <div className="bg-[#1B5E2C] text-[#FAFAF5] rounded-2xl p-5 sm:p-6 flex items-center gap-4 mb-6">
              <div className="h-14 w-14 rounded-full bg-[#F2BE22] flex items-center justify-center shrink-0">
                <span
                  className="text-[#1B5E2C] text-2xl font-bold"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  {profile.email?.[0]?.toUpperCase() ?? "A"}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm text-[#CFE3CE]">Administrator</p>
                <p className="font-medium truncate">{profile.email}</p>
                <p className="text-xs text-[#CFE3CE] mt-0.5">
                  Account since{" "}
                  {profile.created_at
                    ? new Date(profile.created_at).toLocaleDateString("en-PH", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "—"}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#D9E8D5] mb-6">
              {["profile", "password"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                    activeTab === tab
                      ? "border-[#1B5E2C] text-[#1B5E2C]"
                      : "border-transparent text-[#86A18A] hover:text-[#1B5E2C]"
                  }`}
                >
                  {tab === "profile" ? "Edit Profile" : "Change Password"}
                </button>
              ))}
            </div>

            {activeTab === "profile" ? (
              <EditProfileForm
                profile={profile}
                resolvedId={resolvedId}
                apiBase={API_BASE}
                onSuccess={(newEmail) => {
                  setProfile((prev) => ({ ...prev, email: newEmail }));
                  setToast({ type: "success", text: "Profile updated successfully." });
                }}
                onError={(msg) => setToast({ type: "error", text: msg })}
              />
            ) : (
              <ChangePasswordForm
                resolvedId={resolvedId}
                apiBase={API_BASE}
                onSuccess={() =>
                  setToast({ type: "success", text: "Password changed successfully." })
                }
                onError={(msg) => setToast({ type: "error", text: msg })}
              />
            )}
          </>
        ) : null}
      </div>

      {toast && (
        <div
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm shadow-lg z-50 whitespace-nowrap ${
            toast.type === "success"
              ? "bg-[#1B5E2C] text-white"
              : "bg-[#B3492B] text-white"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

/* ─── Edit Profile Form ─────────────────────────────────────── */
function EditProfileForm({ profile, resolvedId, apiBase, onSuccess, onError }) {
  const [email, setEmail] = useState(profile.email || "");
  const [emailError, setEmailError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Enter a valid email address.");
      return false;
    }
    setEmailError(null);
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("admin_id", resolvedId);
      body.append("email", email.trim());
      const res = await fetch(`${apiBase}/update_admin_profile.php`, {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(email.trim());
      } else {
        onError(data.message || "Could not update profile.");
      }
    } catch {
      onError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#D9E8D5] p-6">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError(null);
            }}
            placeholder="registrar@gogonhs.edu.ph"
            className={`w-full rounded-lg border px-4 py-2.5 text-sm text-[#1B5E2C] placeholder:text-[#A8AEBC] bg-white focus:outline-none focus:ring-2 focus:ring-[#F2BE22] ${
              emailError ? "border-[#B3492B]" : "border-[#CBD9C8]"
            }`}
          />
          {emailError && (
            <p className="mt-1.5 text-xs text-[#B3492B]">{emailError}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">
            Admin ID
          </label>
          <input
            value={resolvedId ?? ""}
            disabled
            className="w-full rounded-lg border border-[#CBD9C8] px-4 py-2.5 text-sm text-[#86A18A] bg-[#FAFAF5] cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-[#86A18A]">
            Admin ID cannot be changed.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-[#1B5E2C] text-white text-sm font-medium py-2.5 hover:bg-[#164A22] disabled:opacity-60 transition-colors"
        >
          {submitting ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}

/* ─── Change Password Form ──────────────────────────────────── */
function ChangePasswordForm({ resolvedId, apiBase, onSuccess, onError }) {
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const ruleChecks = {
    length: form.new_password.length >= 8,
    upperLower:
      /[a-z]/.test(form.new_password) && /[A-Z]/.test(form.new_password),
    number: /[0-9]/.test(form.new_password),
  };

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.current_password)
      next.current_password = "Enter your current password.";
    if (!Object.values(ruleChecks).every(Boolean))
      next.new_password =
        "Password needs 8+ characters, upper & lower case, and a number.";
    if (form.new_password !== form.confirm_password)
      next.confirm_password = "Passwords don't match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("admin_id", resolvedId);
      body.append("current_password", form.current_password);
      body.append("new_password", form.new_password);
      const res = await fetch(`${apiBase}/change_admin_password.php`, {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = await res.json();
      if (data.success) {
        setForm({ current_password: "", new_password: "", confirm_password: "" });
        onSuccess();
      } else {
        onError(data.message || "Could not change password.");
      }
    } catch {
      onError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#D9E8D5] p-6">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-[#1B5E2C]">
              Current password
            </label>
            <button
              type="button"
              onClick={() => setShowCurrent((s) => !s)}
              className="text-xs text-[#8C6B12] hover:text-[#6E5410]"
            >
              {showCurrent ? "Hide" : "Show"}
            </button>
          </div>
          <input
            name="current_password"
            type={showCurrent ? "text" : "password"}
            value={form.current_password}
            onChange={handleChange}
            placeholder="Enter current password"
            className={`w-full rounded-lg border px-4 py-2.5 text-sm text-[#1B5E2C] placeholder:text-[#A8AEBC] focus:outline-none focus:ring-2 focus:ring-[#F2BE22] ${
              errors.current_password ? "border-[#B3492B]" : "border-[#CBD9C8]"
            }`}
          />
          {errors.current_password && (
            <p className="mt-1.5 text-xs text-[#B3492B]">
              {errors.current_password}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-[#1B5E2C]">
              New password
            </label>
            <button
              type="button"
              onClick={() => setShowNew((s) => !s)}
              className="text-xs text-[#8C6B12] hover:text-[#6E5410]"
            >
              {showNew ? "Hide" : "Show"}
            </button>
          </div>
          <input
            name="new_password"
            type={showNew ? "text" : "password"}
            value={form.new_password}
            onChange={handleChange}
            placeholder="At least 8 characters"
            className={`w-full rounded-lg border px-4 py-2.5 text-sm text-[#1B5E2C] placeholder:text-[#A8AEBC] focus:outline-none focus:ring-2 focus:ring-[#F2BE22] ${
              errors.new_password ? "border-[#B3492B]" : "border-[#CBD9C8]"
            }`}
          />
          {errors.new_password && (
            <p className="mt-1.5 text-xs text-[#B3492B]">
              {errors.new_password}
            </p>
          )}

          {/* Password strength rules */}
          {form.new_password.length > 0 && (
            <div className="mt-2 space-y-1">
              {[
                { label: "At least 8 characters", done: ruleChecks.length },
                { label: "Upper & lower case", done: ruleChecks.upperLower },
                { label: "Contains a number", done: ruleChecks.number },
              ].map((rule) => (
                <div key={rule.label} className="flex items-center gap-2">
                  <span
                    className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                      rule.done
                        ? "bg-[#1B5E2C] border-[#1B5E2C]"
                        : "border-[#CBD9C8]"
                    }`}
                  >
                    {rule.done && (
                      <svg viewBox="0 0 10 10" className="h-2 w-2">
                        <path
                          d="M2 5l2 2 4-3"
                          stroke="white"
                          strokeWidth="1.5"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span
                    className={`text-xs ${
                      rule.done ? "text-[#1B5E2C]" : "text-[#86A18A]"
                    }`}
                  >
                    {rule.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">
            Confirm new password
          </label>
          <input
            name="confirm_password"
            type="password"
            value={form.confirm_password}
            onChange={handleChange}
            placeholder="Re-enter new password"
            className={`w-full rounded-lg border px-4 py-2.5 text-sm text-[#1B5E2C] placeholder:text-[#A8AEBC] focus:outline-none focus:ring-2 focus:ring-[#F2BE22] ${
              errors.confirm_password ? "border-[#B3492B]" : "border-[#CBD9C8]"
            }`}
          />
          {errors.confirm_password && (
            <p className="mt-1.5 text-xs text-[#B3492B]">
              {errors.confirm_password}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-[#1B5E2C] text-white text-sm font-medium py-2.5 hover:bg-[#164A22] disabled:opacity-60 transition-colors"
        >
          {submitting ? "Updating…" : "Change password"}
        </button>
      </form>
    </div>
  );
}
