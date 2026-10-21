import { useState, useEffect } from "react";
import { motion } from "framer-motion";
// This Api use for offline
const API_BASE = "http://localhost/backend-online-enrollment/admin";
// export const getApiBase = () => {
//   return "/backend-online-enrollment/admin";
// };

const STAT_CARDS = [
  { key: "total_students",       label: "Total Students", tone: "green", icon: "users" },
  { key: "pending_enrollments",  label: "Pending",        tone: "gold",  icon: "clock" },
  { key: "approved_enrollment",  label: "Approved",       tone: "teal",  icon: "check" },
  { key: "rejected_enrollments", label: "Rejected",       tone: "clay",  icon: "x" },
];

const TONE_STYLES = {
  green: { card: "bg-[#1B5E2C] text-[#FAFAF5]", icon: "bg-white/15" },
  gold:  { card: "bg-[#F2BE22] text-[#1B5E2C]", icon: "bg-[#1B5E2C]/10" },
  teal:  { card: "bg-[#2F6F5E] text-[#FAFAF5]", icon: "bg-white/15" },
  clay:  { card: "bg-[#B3492B] text-[#FAFAF5]", icon: "bg-white/15" },
};

const DONUT_COLORS = { approved: "#2F6F5E", pending: "#F2BE22", rejected: "#B3492B" };
const ACTIVITY_STORAGE_KEY = "admin-dashboard-activity";
const adminBoxVariants = {
  hidden: { opacity: 0, y: 22, scale: 0.96 },
  visible: (index = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: index * 0.08, type: "spring", stiffness: 260, damping: 18 },
  }),
};

/* ---------- tiny inline icons (no external icon library assumed) ---------- */
function Icon({ name, className }) {
  const common = { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "users":
      return <svg {...common}><path d="M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" /><circle cx="10" cy="7" r="3.5" /><path d="M17.5 11.5A3.5 3.5 0 0 0 17 4.6" /><path d="M20.5 20v-1a4 4 0 0 0-2.7-3.78" /></svg>;
    case "clock":
      return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>;
    case "check":
      return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.3l2.4 2.4 4.8-5.2" /></svg>;
    case "x":
      return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M9.3 9.3l5.4 5.4M14.7 9.3l-5.4 5.4" /></svg>;
    case "activity":
      return <svg {...common}><path d="M3 12h4l2.5 6L14 6l2 6h5" /></svg>;
    case "inbox":
      return <svg {...common}><path d="M3.5 12h4.2l1.6 3h5.4l1.6-3h4.2" /><path d="M5.5 5.5h13l2 6.5v6a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-6l2-6.5z" /></svg>;
  }
  return null;
}

function formatActivityTime(timestamp) {
  const elapsed = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/* ---------- donut chart built from real summary numbers, no external chart lib ---------- */
function EnrollmentDonut({ approved, pending, rejected, loading }) {
  const total = approved + pending + rejected;
  const safeTotal = total || 1;
  const approvedPct = Math.round((approved / safeTotal) * 100);
  const pendingPct = Math.round((pending / safeTotal) * 100);

  const gradient = total === 0
    ? "conic-gradient(#E7EEE5 0% 100%)"
    : `conic-gradient(${DONUT_COLORS.approved} 0% ${approvedPct}%, ${DONUT_COLORS.pending} ${approvedPct}% ${approvedPct + pendingPct}%, ${DONUT_COLORS.rejected} ${approvedPct + pendingPct}% 100%)`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-40 w-40 rounded-full" style={{ background: loading ? "#EEF2ED" : gradient }}>
        <div className="absolute inset-[14px] rounded-full bg-white flex flex-col items-center justify-center">
          <span className="text-2xl text-[#1B5E2C]" style={{ fontFamily: "'Fraunces', serif" }}>
            {loading ? "—" : `${approvedPct}%`}
          </span>
          <span className="text-[11px] text-[#86A18A] uppercase tracking-[0.08em]">Approved</span>
        </div>
      </div>

      <div className="mt-5 w-full space-y-2.5">
        {[
          { label: "Approved", count: approved, color: DONUT_COLORS.approved },
          { label: "Pending", count: pending, color: DONUT_COLORS.pending },
          { label: "Rejected", count: rejected, color: DONUT_COLORS.rejected },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-[#3E4F3E]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
              {row.label}
            </span>
            <span className="text-[#1B5E2C] font-medium">{loading ? "—" : row.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [summary, setSummary]               = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError]     = useState(null);
  const [requests, setRequests]              = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError]    = useState(null);
  const [activities, setActivities] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(ACTIVITY_STORAGE_KEY) ?? "[]");
    } catch {
      return [];
    }
  });

  const [enrollmentStatus, setEnrollmentStatus] = useState(null);
  const [statusLoading, setStatusLoading]       = useState(true);
  const [statusUpdating, setStatusUpdating]     = useState(false);
  const [statusMessage, setStatusMessage]       = useState(null);
  const [resetting, setResetting]               = useState(false);

  useEffect(() => { loadSummary(); loadStatus(); loadRequests(); }, []);

  function recordActivity(text) {
    const nextActivities = [
      { id: Date.now(), text, timestamp: Date.now() },
      ...activities,
    ].slice(0, 5);
    setActivities(nextActivities);
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(nextActivities));
  }

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

  async function loadRequests() {
    setRequestsLoading(true);
    setRequestsError(null);
    try {
      //Change api if Couldn't reach the server
      const res = await fetch("/backend-online-enrollment/staff/get_pending_enrollments.php", {
        credentials: "include",
      });
 
      const data = await res.json();
      if (data.success) {
        setRequests(data.enrollments ?? []);
      } else {
        setRequestsError("Could not load enrollment requests.");
      }
    } catch {
      setRequestsError("Could not reach the server.");
    } finally {
      setRequestsLoading(false);
    }
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
        recordActivity(`Enrollment was ${nextStatus.toLowerCase()}.`);
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
        recordActivity("Enrollment system was reset.");
        // Reload summary to reflect changes
        setTimeout(() => {
          loadSummary();
          loadStatus();
        }, 1000);
      } else {
        setStatusMessage({ type: "error", text: data.message ?? "Reset failed." });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Could not reach the server." });
    } finally {
      setResetting(false);
    }
  }

  const approved = summary?.approved_enrollment ?? 0;
  const pending  = summary?.pending_enrollments ?? 0;
  const rejected = summary?.rejected_enrollments ?? 0;
  const totalStudents = summary?.total_students ?? 0;

  return (
    <div className="px-4 sm:px-6 py-6 space-y-5">

      {/* Enrollment status + controls — unchanged behavior, kept as-is */}
      <motion.section custom={0} initial="hidden" animate="visible" variants={adminBoxVariants} whileHover={{ y: -3 }} className="bg-white rounded-2xl border border-[#D9E8D5] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
      </motion.section>

      {/* Stat cards */}
      {summaryError ? (
        <div className="rounded-xl border border-[#B3492B]/30 bg-[#B3492B]/10 text-[#B3492B] text-sm px-4 py-3">
          {summaryError}
        </div>
      ) : (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map((card) => {
            const tone = TONE_STYLES[card.tone];
            return (
              <motion.div key={card.key} custom={card.key === "total_students" ? 1 : card.key === "pending_enrollments" ? 2 : card.key === "approved_enrollment" ? 3 : 4} initial="hidden" animate="visible" variants={adminBoxVariants} whileHover={{ y: -5, scale: 1.02 }} className={`rounded-2xl p-5 ${tone.card}`}>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-4 ${tone.icon}`}>
                  <Icon name={card.icon} className="h-5 w-5" />
                </div>
                <p className="text-3xl leading-none" style={{ fontFamily: "'Fraunces', serif" }}>
                  {loadingSummary
                    ? <span className="inline-block h-7 w-14 rounded bg-white/30 animate-pulse" />
                    : summary?.[card.key] ?? "—"}
                </p>
                <p className="text-xs uppercase tracking-[0.1em] opacity-80 mt-2">{card.label}</p>
              </motion.div>
            );
          })}
        </section>
      )}

      {/* Overview + breakdown donut */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div custom={5} initial="hidden" animate="visible" variants={adminBoxVariants} whileHover={{ y: -3 }} className="lg:col-span-2 bg-white rounded-2xl border border-[#D9E8D5] p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.15em] text-[#86A18A] mb-1">Overview</p>
          <h3 className="text-lg text-[#1B5E2C] mb-5" style={{ fontFamily: "'Fraunces', serif" }}>
            Enrollment this term
          </h3>

          <div className="flex items-end gap-2 mb-6">
            <span className="text-4xl text-[#1B5E2C]" style={{ fontFamily: "'Fraunces', serif" }}>
              {loadingSummary ? <span className="inline-block h-9 w-24 rounded bg-[#EEF2ED] animate-pulse" /> : totalStudents}
            </span>
            <span className="text-sm text-[#86A18A] mb-1">total students enrolled</span>
          </div>

          <div className="h-2.5 w-full rounded-full overflow-hidden bg-[#EEF2ED] flex">
            {loadingSummary ? (
              <div className="h-full w-full animate-pulse bg-[#E2E9E0]" />
            ) : (
              <>
                <div className="h-full" style={{ width: `${(approved / (approved + pending + rejected || 1)) * 100}%`, backgroundColor: DONUT_COLORS.approved }} />
                <div className="h-full" style={{ width: `${(pending / (approved + pending + rejected || 1)) * 100}%`, backgroundColor: DONUT_COLORS.pending }} />
                <div className="h-full" style={{ width: `${(rejected / (approved + pending + rejected || 1)) * 100}%`, backgroundColor: DONUT_COLORS.rejected }} />
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-[#EEF2ED]">
            {[
              { label: "Approved", value: approved, color: DONUT_COLORS.approved },
              { label: "Pending", value: pending, color: DONUT_COLORS.pending },
              { label: "Rejected", value: rejected, color: DONUT_COLORS.rejected },
            ].map((s) => (
              <div key={s.label}>
                <span className="h-2 w-2 rounded-full inline-block mb-2" style={{ backgroundColor: s.color }} />
                <p className="text-xl text-[#1B5E2C]" style={{ fontFamily: "'Fraunces', serif" }}>
                  {loadingSummary ? "—" : s.value}
                </p>
                <p className="text-xs text-[#86A18A]">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div custom={6} initial="hidden" animate="visible" variants={adminBoxVariants} whileHover={{ y: -3 }} className="bg-white rounded-2xl border border-[#D9E8D5] p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.15em] text-[#86A18A] mb-1">Breakdown</p>
          <h3 className="text-lg text-[#1B5E2C] mb-5" style={{ fontFamily: "'Fraunces', serif" }}>
            Status distribution
          </h3>
          <EnrollmentDonut approved={approved} pending={pending} rejected={rejected} loading={loadingSummary} />
        </motion.div>
      </section>

      {/* Activity + requests */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div custom={7} initial="hidden" animate="visible" variants={adminBoxVariants} whileHover={{ y: -3 }} className="bg-white rounded-2xl border border-[#D9E8D5] p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.15em] text-[#86A18A] mb-1">Log</p>
          <h3 className="text-lg text-[#1B5E2C] mb-4" style={{ fontFamily: "'Fraunces', serif" }}>
            Recent activity
          </h3>
          {activities.length === 0 ? (
            <div className="flex flex-col items-center text-center py-8 text-[#86A18A]">
              <Icon name="activity" className="h-8 w-8 mb-3 opacity-60" />
              <p className="text-sm">No recent activity.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#F2BE22]" />
                  <div className="min-w-0">
                    <p className="text-sm text-[#3E4F3E]">{activity.text}</p>
                    <p className="mt-0.5 text-xs text-[#86A18A]">{formatActivityTime(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div custom={8} initial="hidden" animate="visible" variants={adminBoxVariants} whileHover={{ y: -3 }} className="lg:col-span-2 bg-white rounded-2xl border border-[#D9E8D5] p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.15em] text-[#86A18A] mb-1">Queue</p>
          <h3 className="text-lg text-[#1B5E2C] mb-4" style={{ fontFamily: "'Fraunces', serif" }}>
            Latest enrollment requests
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.08em] text-[#86A18A] border-b border-[#EEF2ED]">
                  <th className="pb-3 font-medium">Student</th>
                  <th className="pb-3 font-medium">Strand</th>
                  <th className="pb-3 font-medium">Submitted</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {requestsLoading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#86A18A]">Loading requests…</td>
                  </tr>
                ) : requestsError ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#B3492B]">{requestsError}</td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#86A18A]">
                      <div className="flex flex-col items-center gap-2">
                        <Icon name="inbox" className="h-7 w-7 opacity-60" />
                        No pending enrollment requests.
                      </div>
                    </td>
                  </tr>
                ) : requests.map((request) => (
                  <tr key={request.enrollment_id} className="border-b border-[#EEF2ED] last:border-0">
                    <td className="py-3 pr-4 text-[#1B5E2C] font-medium">
                      {request.student_name?.trim() || `Student #${request.student_id}`}
                    </td>
                    <td className="py-3 pr-4 text-[#3E4F3E]">{request.strand_name || "—"}</td>
                    <td className="py-3 pr-4 text-[#3E4F3E] whitespace-nowrap">
                      {request.submitted_at ? new Date(request.submitted_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex rounded-full bg-[#F2BE22]/20 px-2.5 py-1 text-xs font-medium text-[#8C6B12]">
                        {request.enrollment_status || "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </section>

      <p className="text-xs text-[#86A18A]">
        Numbers refresh on page load. Re-open this page after approving or rejecting enrollments to see updated counts.
      </p>
    </div>
  );
}
