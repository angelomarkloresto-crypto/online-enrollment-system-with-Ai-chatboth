import { useState, useEffect } from "react";

/**
 * AdminRegister.jsx
 * One-time setup screen for creating the single admin account.
 * Talks to: check_admin_exists.php, admin_register.php
 *
 * NOTE: This assumes the backend bugs below are fixed first:
 *  - admin_register.php: "amins" -> "admins" table name typo
 *  - check_admin_exists.php: $row['total_Admins'] -> $row['total_admins']
 */

const API_BASE = "http://localhost/backend-online-enrollment/admin";

export default function AdminRegister() {
  const [checking, setChecking] = useState(true);
  const [adminExists, setAdminExists] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState(null); // { type: 'success' | 'error', text }

  useEffect(() => {
    let cancelled = false;
    async function checkAdmin() {
      try {
        const res = await fetch(`${API_BASE}/check_admin_exists.php`);
        const data = await res.json();
        if (!cancelled) {
          setAdminExists(Boolean(data.exists ?? data.exist));
        }
      } catch (err) {
        // If the check itself fails, fail open to the form rather than locking the admin out.
        if (!cancelled) setAdminExists(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    checkAdmin();
    return () => {
      cancelled = true;
    };
  }, []);

  const ruleChecks = {
    length: form.password.length >= 8,
    upperLower: /[a-z]/.test(form.password) && /[A-Z]/.test(form.password),
    number: /[0-9]/.test(form.password),
  };
  const passedRules = Object.values(ruleChecks).filter(Boolean).length;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const passwordsMatch =
    form.confirmPassword.length > 0 && form.password === form.confirmPassword;

  const sealFilled =
    (emailValid ? 1 : 0) + passedRules + (passwordsMatch ? 1 : 0);
  const sealTotal = 5;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validate() {
    const next = {};
    if (!emailValid) next.email = "Enter a valid email address.";
    if (passedRules < 3)
      next.password =
        "Password needs 8+ characters, upper & lower case, and a number.";
    if (!passwordsMatch) next.confirmPassword = "Passwords don't match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerMessage(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("email", form.email.trim());
      body.append("password", form.password);

      const res = await fetch(`${API_BASE}/admin_register.php`, {
        method: "POST",
        body,
      });
      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        // backend currently echoes plain strings on success/error in some paths
        data = { success: /success/i.test(text), message: text };
      }

      if (data.success === false) {
        setServerMessage({
          type: "error",
          text: data.message || data.mesage || "Registration failed.",
        });
      } else {
        setServerMessage({
          type: "success",
          text: "Admin account created. You can now log in.",
        });
        setAdminExists(true);
      }
    } catch (err) {
      setServerMessage({
        type: "error",
        text: "Could not reach the server. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#FAFAF5]">
      {/* Institutional panel */}
      <div className="relative md:w-[42%] bg-[#1B5E2C] text-[#FAFAF5] flex flex-col justify-between px-6 sm:px-8 py-10 md:px-12 md:py-14 overflow-hidden">
        <div className="relative">
          <div className="flex items-center gap-3">
            <img
              src="/assets/gogon-hs-logo.png"
              alt="Gogon High School seal"
              className="h-12 w-12 rounded-full bg-white object-cover ring-2 ring-[#F2BE22] shrink-0"
            />
            <p className="text-xs tracking-[0.2em] uppercase text-[#CFE3CE] leading-snug">
              Gogon High School
              <br />
              Enrollment System
            </p>
          </div>

          <h1
            className="mt-10 text-4xl md:text-[2.75rem] leading-[1.1] text-[#FAFAF5]"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            Set up the
            <br />
            registrar's account.
          </h1>
          <p className="mt-5 text-[#CFE3CE] text-[15px] leading-relaxed max-w-sm">
            For Junior and Senior High enrollment. This system allows
            exactly one administrator account — once created here, this
            setup screen won't be reachable again. Sign in normally from
            then on.
          </p>
        </div>

        <div className="relative mt-12">
          <p className="text-xs uppercase tracking-[0.2em] text-[#86A18A] mb-3">
            Setup checklist
          </p>
          <div className="space-y-2.5">
            {[
              { label: "Valid email address", done: emailValid },
              { label: "Strong password", done: passedRules >= 3 },
              { label: "Passwords confirmed", done: passwordsMatch },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2.5">
                <span
                  className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    item.done
                      ? "bg-[#F2BE22] border-[#F2BE22]"
                      : "border-[#5B6478]"
                  }`}
                >
                  {item.done && (
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5">
                      <path
                        d="M2 6l2.5 2.5L10 3"
                        stroke="#1B5E2C"
                        strokeWidth="1.6"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span
                  className={`text-sm ${
                    item.done ? "text-[#FAFAF5]" : "text-[#86A18A]"
                  }`}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 md:py-0">
        <div className="w-full max-w-md">
          {checking ? (
            <div className="text-center py-20">
              <div className="mx-auto h-8 w-8 rounded-full border-2 border-[#1B5E2C] border-t-transparent animate-spin" />
              <p className="mt-4 text-sm text-[#5B6478]">
                Checking setup status…
              </p>
            </div>
          ) : adminExists ? (
            <div className="bg-white rounded-2xl border border-[#D9E8D5] p-8 text-center shadow-sm">
              <div className="mx-auto h-14 w-14 rounded-full bg-[#1B5E2C] flex items-center justify-center mb-5">
                <span
                  className="text-[#F2BE22] text-xl"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  ✓
                </span>
              </div>
              <h2
                className="text-2xl text-[#1B5E2C] mb-2"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                Setup already complete
              </h2>
              <p className="text-sm text-[#5B6478] leading-relaxed">
                An administrator account already exists for this system.
                Head to the login page to sign in.
              </p>
              <a
                href="/AdminLogin"
                className="mt-6 inline-block w-full rounded-lg bg-[#1B5E2C] text-[#FAFAF5] text-sm font-medium py-3 hover:bg-[#164A22] transition-colors"
              >
                Go to login
              </a>
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between mb-8">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#8C6B12] mb-2">
                    Step 1 of 1
                  </p>
                  <h2
                    className="text-3xl text-[#1B5E2C]"
                    style={{ fontFamily: "'Fraunces', serif" }}
                  >
                    Create admin account
                  </h2>
                </div>
                {/* seal indicator */}
                <div className="relative h-14 w-14 shrink-0">
                  <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      fill="none"
                      stroke="#D9E8D5"
                      strokeWidth="4"
                    />
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      fill="none"
                      stroke="#F2BE22"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 24}
                      strokeDashoffset={
                        2 * Math.PI * 24 * (1 - sealFilled / sealTotal)
                      }
                      style={{ transition: "stroke-dashoffset 0.3s ease" }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-[#1B5E2C]">
                    {sealFilled}/{sealTotal}
                  </span>
                </div>
              </div>

              {serverMessage && (
                <div
                  className={`mb-6 rounded-lg px-4 py-3 text-sm ${
                    serverMessage.type === "success"
                      ? "bg-[#3F7D58]/10 text-[#3F7D58] border border-[#3F7D58]/30"
                      : "bg-[#B3492B]/10 text-[#B3492B] border border-[#B3492B]/30"
                  }`}
                >
                  {serverMessage.text}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-[#1B5E2C] mb-1.5"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="registrar@school.edu.ph"
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm text-[#1B5E2C] placeholder:text-[#A8AEBC] bg-white focus:outline-none focus:ring-2 focus:ring-[#F2BE22] transition-shadow ${
                      errors.email ? "border-[#B3492B]" : "border-[#CBD9C8]"
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-[#B3492B]">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-[#1B5E2C] mb-1.5"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="At least 8 characters"
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm text-[#1B5E2C] placeholder:text-[#A8AEBC] bg-white focus:outline-none focus:ring-2 focus:ring-[#F2BE22] transition-shadow ${
                      errors.password
                        ? "border-[#B3492B]"
                        : "border-[#CBD9C8]"
                    }`}
                  />
                  {errors.password && (
                    <p className="mt-1.5 text-xs text-[#B3492B]">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-[#1B5E2C] mb-1.5"
                  >
                    Confirm password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm text-[#1B5E2C] placeholder:text-[#A8AEBC] bg-white focus:outline-none focus:ring-2 focus:ring-[#F2BE22] transition-shadow ${
                      errors.confirmPassword
                        ? "border-[#B3492B]"
                        : "border-[#CBD9C8]"
                    }`}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1.5 text-xs text-[#B3492B]">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-[#1B5E2C] text-[#FAFAF5] text-sm font-medium py-3 hover:bg-[#164A22] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? "Creating account…" : "Create admin account"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
