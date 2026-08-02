import { useState } from "react";

/**
 * StaffLogin.jsx
 * Talks to: /staff/staff_login.php
 *
 * Backend bugs to fix before this works:
 *  - $emai typo on line 5 — should be $email
 *  - Returns "staff-id" (hyphen) — should be "staff_id" (underscore)
 *  - No session_start() — add it at the top if you plan to use PHP sessions
 *  - staff_login.php currently reads POST fields directly, NOT a JSON body,
 *    so this component sends FormData (correct for that file as written).
 */

const API_BASE = "http://localhost/backend-online-enrollment/staff";

export default function StaffLogin({ onLoginSuccess }) {
  const [form, setForm]             = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg]     = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrorMsg(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg(null);

    if (!form.email.trim() || !form.password) {
      setErrorMsg("Enter both email and password.");
      return;
    }

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("email",    form.email.trim());
      body.append("password", form.password);

      const res  = await fetch(`${API_BASE}/staff_login.php`, {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.message || "Invalid email or password.");
        return;
      }

      // Save staff info for use across pages
      localStorage.setItem("staff_id",    data.staff_id   ?? "");
      localStorage.setItem("staff_name",  data.full_name  ?? "Staff");
      localStorage.setItem("staff_email", data.email      ?? "");

      if (onLoginSuccess) {
        onLoginSuccess({
          staff_id:   data.staff_id,
          full_name:  data.full_name,
          email:      data.email,
        });
      } else {
        window.location.href = "/StaffDashboard";
      }
    } catch {
      setErrorMsg("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#FAFAF5]">

      {/* Left institutional panel */}
      <div className="md:w-[42%] bg-[#1B5E2C] text-[#FAFAF5] flex flex-col justify-between px-6 sm:px-8 py-10 md:px-12 md:py-14">
        <div>
          {/* Logo + school name */}
          <div className="flex items-center gap-3">
            <img
              src="/assets/gogon-hs-logo.png"
              alt="Gogon High School seal"
              className="h-12 w-12 rounded-full bg-white object-cover ring-2 ring-[#F2BE22] shrink-0"
            />
            <div className="leading-snug">
              <p className="text-sm font-medium">Gogon High School</p>
              <p className="text-xs text-[#CFE3CE] tracking-wide">
                Online Enrollment System
              </p>
            </div>
          </div>

          <h1
            className="mt-10 text-4xl md:text-[2.6rem] leading-[1.1] text-[#FAFAF5]"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            Staff Portal
          </h1>
          <p className="mt-4 text-[#CFE3CE] text-[15px] leading-relaxed max-w-sm">
            Sign in to review enrollment applications, manage strands and
            sections, and support students through the enrollment process.
          </p>
        </div>

        {/* Bottom note */}
        <div className="mt-12 border-t border-white/10 pt-5">
          <p className="text-xs text-[#86A18A]">
            Staff accounts are created by the school administrator. Contact
            your admin if you cannot log in.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8C6B12] mb-2">
              Staff Access
            </p>
            <h2
              className="text-2xl sm:text-3xl text-[#1B5E2C]"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-[#5B6478]">
              Sign in with your staff credentials.
            </p> 
          </div>

          <div className="bg-white rounded-2xl border border-[#D9E8D5] shadow-sm p-6 sm:p-7">
            {errorMsg && (
              <div className="mb-5 rounded-lg px-4 py-3 text-sm bg-[#B3492B]/10 text-[#B3492B] border border-[#B3492B]/30">
                {errorMsg}
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
                  placeholder="staff@gogonhs.edu.ph"
                  className="w-full rounded-lg border border-[#CBD9C8] px-4 py-2.5 text-sm text-[#1B5E2C] placeholder:text-[#A8AEBC] bg-white focus:outline-none focus:ring-2 focus:ring-[#F2BE22] transition-shadow"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-[#1B5E2C]"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="text-xs text-[#8C6B12] hover:text-[#6E5410] transition-colors"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-[#CBD9C8] px-4 py-2.5 text-sm text-[#1B5E2C] placeholder:text-[#A8AEBC] bg-white focus:outline-none focus:ring-2 focus:ring-[#F2BE22] transition-shadow"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[#1B5E2C] text-[#FAFAF5] text-sm font-medium py-3 hover:bg-[#164A22] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-xs text-[#86A18A]">
            This portal is for authorized school staff only.
          </p>
        </div>
      </div>
    </div>
  );
}
