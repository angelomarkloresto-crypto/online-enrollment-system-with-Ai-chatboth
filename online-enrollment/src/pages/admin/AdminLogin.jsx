import { useState } from "react";

/**
 * AdminLogin.jsx
 * Everyday sign-in screen for the single admin account.
 * Talks to: admin_login.php
 *
 * NOTE: admin_login.php currently has two bugs that need fixing server-side:
 *  - uses json_encode(file_get_contents(...)) instead of json_decode(...)
 *  - sets $_SESSION['amdin_id'] (typo) instead of $_SESSION['admin_id']
 * This component sends a proper JSON POST body and expects { success, message, admin_id }.
 */

const API_BASE = "http://localhost/backend-online-enrollment/admin";

export default function AdminLogin({ onLoginSuccess }) {
  const [form, setForm] = useState({ email: "", password: "" });
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

    if (!form.email.trim() || !form.password) {
      setErrorMsg("Enter both email and password.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/admin_login.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.message || "Invalid email or password.");
        return;
      }

      localStorage.setItem("admin_id", String(data.admin_id));

      if (onLoginSuccess) {
        onLoginSuccess(data.admin_id);
      } else {
        window.location.href = "/AdminDashboard";
      }
    } catch (err) {
      setErrorMsg("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FAFAF5] px-6 py-12">
      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <img
            src="/assets/gogon-hs-logo.png"
            alt="Gogon High School seal"
            className="h-16 w-16 rounded-full ring-2 ring-[#F2BE22] object-cover mb-5"
          />
          <p className="text-xs uppercase tracking-[0.2em] text-[#8C6B12] mb-2">
            Gogon High School &middot; Administrator Access
          </p>
          <h1
            className="text-3xl text-[#1B5E2C]"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-[#5B6478]">
            Sign in to manage Junior &amp; Senior High enrollment, staff, and
            system settings.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#D9E8D5] shadow-sm p-7">
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
                placeholder="registrar@school.edu.ph"
                className="w-full rounded-lg border border-[#CBD9C8] px-4 py-2.5 text-sm text-[#1B5E2C] placeholder:text-[#A8AEBC] bg-white focus:outline-none focus:ring-2 focus:ring-[#F2BE22] transition-shadow"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[#1B5E2C]"
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

        <p className="mt-6 text-center text-xs text-[#86A18A]">
          Trouble signing in? Contact your system developer to reset access.
        </p>
      </div>
    </div>
  );
}
