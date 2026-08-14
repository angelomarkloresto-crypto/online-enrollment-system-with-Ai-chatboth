import { useState, useEffect } from "react";

/**
 * AdminDashboard.jsx
 * Content only — sidebar and header are handled by SidebarLayout in App.jsx.
 * Talks to: dashboard_summary.php, get_system_status.php, update_enrollment_status.php
 */

const API_BASE = "http://localhost/backend-online-enrollment/admin";

const STAT_CARDS = [
  { key: "total_students",      label: "Total Students", tone: "green" },
  { key: "pending_enrollments", label: "Pending",        tone: "gold"  },
  { key: "approved_enrollment", label: "Approved",       tone: "green" },
  { key: "rejected_enrollments",label: "Rejected",       tone: "clay"  },
];

const TONE_STYLES = {
  green: "bg-[#1B5E2C] text-[#FAFAF5]",
  gold:  "bg-[#F2BE22] text-[#1B5E2C]",
  clay:  "bg-[#B3492B] text-[#FAFAF5]",
};

export default function AdminDashboard() {
  const [summary, setSummary]               = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError]     = useState(null);

  const [enrollmentStatus, setEnrollmentStatus] = useState(null);
  const [statusLoading, setStatusLoading]       = useState(true);
  const [statusUpdating, setStatusUpdating]     = useState(false);
  const [statusMessage, setStatusMessage]       = useState(null);
  const [resetting, setResetting]               = useState(false);

  useEffect(() => { loadSummary(); loadStatus(); }, []);

  async function loadSummary() {
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const res  = await fetch(`${API_BASE}/dashboard_summary.php`, { credentials: "include" });
      const data = await res.json();
      data.success ? setSummary(data) : setSummaryError("Could not load dashboard numbers.");
    } catch { setSummaryError("Could not reach the server."); }
    finally  { setLoadingSummary(false); }
  }

  async function loadStatus() {
    setStatusLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/get_system_status.php`, { credentials: "include" });
      const data = await res.json();
      if (data.success) setEnrollmentStatus(data.enrollment_status);
    } catch { /* leave as null */ }
    finally { setStatusLoading(false); }
  }

  async function toggleEnrollment() {
    const nextStatus = enrollmentStatus === "Open" ? "Closed" : "Open";
    setStatusUpdating(true);
    setStatusMessage(null);
    try {
      const body = new FormData();
      body.append("enrollment_status", nextStatus);
      const res  = await fetch(`${API_BASE}/update_enrollment_status.php`, {
        method: "POST", credentials: "include", body,
      });
      const text = await res.text();
      if (/error/i.test(text) && !/successfully/i.test(text)) {
        setStatusMessage({ type: "error", text });
      } else {
        setEnrollmentStatus(nextStatus);
        setStatusMessage({ type: "success", text: `Enrollment is now ${nextStatus.toLowerCase()}.` });
      }
    } catch { setStatusMessage({ type: "error", text: "Could not reach the server." }); }
    finally  { setStatusUpdating(false); }
  }

  async function handleResetEnrollment() {
    const confirmed = window.confirm(
      "Are you sure you want to reset ALL enrollments?\n\n" +
      "This will:\n" +
      "• Clear all student enrollments\n" +
      "• Clear all sections and strands\n" +
      "• Reset the system to a fresh state\n\n" +
      "Note: Student requirements records from past enrollments will be preserved.\n\n" +
      "This action cannot be undone!"
    );
    if (!confirmed) return;

    setResetting(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`${API_BASE}/reset_enrollment.php`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: "success", text: "Enrollment system has been reset successfully." });
        // Reload summary to reflect changes
        setTimeout(() => {
          loadSummary();
          loadStatus();
        }, 1000);
      } else {
        setStatusMessage({ type: "error", text: data.message ?? "Reset failed." });
      }
    } catch (err) {
      setStatusMessage({ type: "error", text: "Could not reach the server." });
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="px-4 sm:px-6 py-6 space-y-6">

      {/* Enrollment status card */}
      <section className="bg-white rounded-2xl border border-[#D9E8D5] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-[#86A18A] mb-1">
            System Status
          </p>
          <div className="flex items-center gap-2.5">
            <span className={`h-2.5 w-2.5 rounded-full ${
              statusLoading ? "bg-[#CBD9C8]"
              : enrollmentStatus === "Open" ? "bg-[#1B5E2C]"
              : "bg-[#B3492B]"
            }`} />
            <h2 className="text-xl text-[#1B5E2C]" style={{ fontFamily: "'Fraunces', serif" }}>
              {statusLoading
                ? "Checking…"
                : enrollmentStatus === "Open"   ? "Enrollment is Open"
                : enrollmentStatus === "Closed" ? "Enrollment is Closed"
                : "Status unknown"}
            </h2>
          </div>
          {statusMessage && (
            <p className={`mt-2 text-sm ${statusMessage.type === "error" ? "text-[#B3492B]" : "text-[#1B5E2C]"}`}>
              {statusMessage.text}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <button
            onClick={toggleEnrollment}
            disabled={statusUpdating || statusLoading}
            className={`rounded-lg px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
              enrollmentStatus === "Open"
                ? "bg-[#B3492B] text-white hover:bg-[#963B22]"
                : "bg-[#1B5E2C] text-white hover:bg-[#164A22]"
            }`}
          >
            {statusUpdating ? "Updating…" : enrollmentStatus === "Open" ? "Close Enrollment" : "Open Enrollment"}
          </button>
          <button
            onClick={handleResetEnrollment}
            disabled={resetting || statusLoading}
            className="rounded-lg px-5 py-2.5 text-sm font-medium transition-colors bg-[#8C6B12] text-white hover:bg-[#6D5410] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {resetting ? "Resetting…" : "Reset"}
          </button>
        </div>
      </section>

      {/* Stat cards */}
      {summaryError ? (
        <div className="rounded-xl border border-[#B3492B]/30 bg-[#B3492B]/10 text-[#B3492B] text-sm px-4 py-3">
          {summaryError}
        </div>
      ) : (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map((card) => (
            <div key={card.key} className={`rounded-2xl p-5 ${TONE_STYLES[card.tone]}`}>
              <p className="text-xs uppercase tracking-[0.1em] opacity-80 mb-2">{card.label}</p>
              <p className="text-3xl" style={{ fontFamily: "'Fraunces', serif" }}>
                {loadingSummary
                  ? <span className="inline-block h-7 w-12 rounded bg-white/30 animate-pulse" />
                  : summary?.[card.key] ?? "—"}
              </p>
            </div>
          ))}
        </section>
      )}

      <p className="text-xs text-[#86A18A]">
        Numbers refresh on page load. Re-open this page after approving or rejecting enrollments to see updated counts.
      </p>
    </div>
  );
}
