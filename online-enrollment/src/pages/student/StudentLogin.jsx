import { useState } from "react";

/**
 * StudentLogin.jsx
 * Talks to: POST /student/student_login.php
 *
 * student_login.php is clean — no bugs found.
 * Sends FormData (email field is called "gmail" in the DB/PHP).
 * On success returns: { success, student: { student_id, first_name, last_name, gmail } }
 */

const API_BASE = "http://localhost/backend-online-enrollment/student";

export default function StudentLogin({ onLoginSuccess, onGoRegister }) {
  const [form, setForm] = useState({ gmail: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrorMsg(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg(null);

    if (!form.gmail.trim() || !form.password) {
      setErrorMsg("Enter both your Gmail and password.");
      return;
    }

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("gmail", form.gmail.trim());
      body.append("password", form.password);

      const res = await fetch(`${API_BASE}/student_login.php`, {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.message || "Invalid Gmail or password.");
        return;
      }

      localStorage.setItem("student_id", String(data.student.student_id));
      localStorage.setItem("student_name", `${data.student.first_name} ${data.student.last_name}`);
      localStorage.setItem("student_gmail", data.student.gmail);

      onLoginSuccess?.(data.student);
    } catch {
      setErrorMsg("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#FAFAF5]">
      <div className="md:w-[42%] bg-[#1B5E2C] text-[#FAFAF5] flex flex-col justify-between px-6 sm:px-8 py-10 md:px-12 md:py-14">
        <div>
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
            className="mt-10 text-4xl md:text-[2.6rem] leading-[1.1]"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            Student Portal
          </h1>
          <p className="mt-4 text-[#CFE3CE] text-[15px] leading-relaxed max-w-sm">
            Sign in to enroll, track your application status, view your
            class timetable, and manage your student profile.
          </p>

          <div className="mt-8 space-y-3">
            {[
              "Submit your enrollment online",
              "Upload your requirements",
              "Track application in real time",
              "View assigned class timetable",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <span className="mt-0.5 h-4 w-4 rounded-full bg-[#F2BE22]/20 border border-[#F2BE22]/50 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 10 10" className="h-2 w-2">
                    <path d="M2 5l2 2 4-3" stroke="#F2BE22" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="text-[#CFE3CE] text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-5">
          <p className="text-xs text-[#86A18A]">
            For Junior and Senior High School students of Gogon High School,
            Legazpi City, Albay.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8C6B12] mb-2">
              Student Access
            </p>
            <h2
              className="text-2xl sm:text-3xl text-[#1B5E2C]"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-[#5B6478]">
              Sign in with your Gmail and password.
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
                  htmlFor="gmail"
                  className="block text-sm font-medium text-[#1B5E2C] mb-1.5"
                >
                  Gmail address
                </label>
                <input
                  id="gmail"
                  name="gmail"
                  type="email"
                  autoComplete="email"
                  value={form.gmail}
                  onChange={handleChange}
                  placeholder="juan@gmail.com"
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

          <p className="mt-5 text-center text-sm text-[#86A18A]">
            No account yet? {" "}
            <button
              type="button"
              onClick={onGoRegister}
              className="text-[#8C6B12] font-medium hover:underline"
            >
              Register here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
