import { useState } from "react";
import { motion } from "framer-motion";

export const getApiBase = () => "/backend-online-enrollment/student";

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

      const res = await fetch(`${getApiBase()}/student_login.php`, {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.message || "Invalid Gmail or password.");
        return;
      }

      const studentId = data.student?.student_id ?? data.student?.lrn ?? data.student?.email ?? "";
      localStorage.setItem("student_id", String(studentId));
      localStorage.setItem("student_name", `${data.student.first_name} ${data.student.last_name}`);
      localStorage.setItem("student_gmail", data.student.gmail ?? data.student.email ?? "");

      onLoginSuccess?.(data.student);
    } catch {
      setErrorMsg("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#14251a]">
      <header className="bg-[#155000] text-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <img
              src="/assets/gogon-hs-logo.jpg"
              alt="Gogon High School"
              className="h-12 w-12 rounded-full bg-white object-cover ring-2 ring-white/70"
            />
            <div className="leading-tight">
              <p className="font-semibold">Gogon High School</p>
              <p className="text-xs text-white/80">Online Enrollment System</p>
            </div>
          </div>
          <p className="text-lg font-semibold sm:text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>
            Student Portal
          </p>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:py-16">
        <motion.section
          initial={{ opacity: 0, x: 72 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 18 }}
          className="w-full max-w-md"
        >
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#326b22]">Student Access</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#14251a]" style={{ fontFamily: "'Fraunces', serif" }}>
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-[#526257]">Sign in with your Gmail and password.</p>
          </div>

          <div className="mb-4 rounded-xl bg-[#155000] px-5 py-4 text-sm leading-relaxed text-white">
            <span className="font-semibold">New student?</span> Your initial password is your
            {" "}<span className="font-semibold">LRN (Learner Reference Number)</span>.
          </div>

          <motion.div
            initial={{ scale: 0.97 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="rounded-2xl border border-[#d7e4d2] bg-[#155000] p-5 text-white shadow-[5px_7px_0_rgba(45,55,40,0.45)] sm:p-8"
          >
            {errorMsg && (
              <div role="alert" className="mb-5 rounded-lg border border-red-200/50 bg-red-950/30 px-4 py-3 text-sm text-white">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <label htmlFor="gmail" className="mb-1.5 block text-sm font-medium">
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
                  className="w-full rounded-lg border border-[#d7e4d2] bg-white px-4 py-3 text-sm text-[#14251a] placeholder:text-[#879489] outline-none transition focus:ring-2 focus:ring-[#a8c437]"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((show) => !show)}
                    className="text-xs text-white/80 transition hover:text-white"
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
                  className="w-full rounded-lg border border-[#d7e4d2] bg-white px-4 py-3 text-sm text-[#14251a] placeholder:text-[#879489] outline-none transition focus:ring-2 focus:ring-[#a8c437]"
                />
              </div>

              <motion.button
                type="submit"
                disabled={submitting}
                whileHover={{ y: -2 }}
                whileTap={{ x: 12, scale: 0.97 }}
                className="w-full rounded-full bg-[#a8bd00] px-4 py-3 text-sm font-semibold text-[#14251a] shadow-[2px_3px_0_rgba(0,0,0,0.25)] transition hover:bg-[#b8cd12] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Signing in…" : "Sign in"}
              </motion.button>

              <div className="border-t border-white/20 pt-4 text-center">
                <p className="text-sm text-white/85">Don’t have an account?</p>
                <motion.button
                  type="button"
                  onClick={onGoRegister}
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  whileTap={{ x: 12, scale: 0.96 }}
                  className="mt-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-[#155000] shadow-[2px_3px_0_rgba(0,0,0,0.25)] transition hover:bg-[#eff6e9]"
                >
                  Enroll Now
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.section>
      </main>

      <footer className="bg-[#155000] text-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-6 text-sm sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
          <div>
            <h2 className="mb-2 font-semibold">Online student services</h2>
            <ul className="space-y-1 text-white/85">
              <li>Submit your enrollment online</li>
              <li>Upload your requirements</li>
              <li>Track your application status</li>
              <li>View your assigned class timetable</li>
            </ul>
          </div>
          <div>
            <h2 className="mb-2 font-semibold">Gogon High School</h2>
            <p className="text-white/85">For Junior and Senior High School students</p>
            <p className="text-white/85">Legazpi City, Albay</p>
          </div>
          <div className="lg:text-right">
            <p className="font-semibold">Online Enrollment System</p>
            <p className="mt-1 text-white/75">Secure access to your student account</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
