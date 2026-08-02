import { useState, useEffect } from "react";

/**
 * StudentDashboard.jsx
 * Talks to: GET /student/notifications/get_notifications.php?student_id=X
 *
 * Returns notifications array with:
 *  { type: "success"|"info"|"warning"|"error", title, message }
 *
 * Three notification sources from the backend:
 *  1. Enrollment status (Pending / Approved / Rejected)
 *  2. System enrollment open/closed
 *  3. Timetable available (if approved + timetable exists)
 */

const API_BASE_NOTIFICATIONS = "http://localhost/backend-online-enrollment/student/notifications";

const NOTIFICATION_STYLES = {
  success: {
    wrapper: "bg-[#1B5E2C]/8 border-[#1B5E2C]/25",
    icon:    "bg-[#1B5E2C]/15 text-[#1B5E2C]",
    title:   "text-[#1B5E2C]",
    dot:     "bg-[#1B5E2C]",
  },
  info: {
    wrapper: "bg-[#F2BE22]/10 border-[#F2BE22]/40",
    icon:    "bg-[#F2BE22]/20 text-[#8C6B12]",
    title:   "text-[#8C6B12]",
    dot:     "bg-[#F2BE22]",
  },
  warning: {
    wrapper: "bg-[#F2BE22]/10 border-[#F2BE22]/40",
    icon:    "bg-[#F2BE22]/20 text-[#8C6B12]",
    title:   "text-[#8C6B12]",
    dot:     "bg-[#F2BE22]",
  },
  error: {
    wrapper: "bg-[#B3492B]/8 border-[#B3492B]/25",
    icon:    "bg-[#B3492B]/15 text-[#B3492B]",
    title:   "text-[#B3492B]",
    dot:     "bg-[#B3492B]",
  },
};

export default function StudentDashboard({ onNavigate }) {
  const studentId   = localStorage.getItem("student_id");
  const studentName = localStorage.getItem("student_name") ?? "Student";

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [loadError, setLoadError]         = useState(null);

  useEffect(() => { loadNotifications(); }, []);

  async function loadNotifications() {
    if (!studentId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res  = await fetch(
        `${API_BASE_NOTIFICATIONS}/get_notifications.php?student_id=${studentId}`,
        { credentials: "include" }
      );
      const data = await res.json();
      data.success
        ? setNotifications(data.notifications ?? [])
        : setLoadError("Could not load notifications.");
    } catch { setLoadError("Could not reach the server."); }
    finally  { setLoading(false); }
  }

  // Derive enrollment status from notifications
  const enrollmentNotif = notifications.find((n) =>
    ["Enrollment Pending", "Enrollment Approved", "Enrollment Rejected"].includes(n.title)
  );
  const isApproved = enrollmentNotif?.title === "Enrollment Approved";
  const isPending  = enrollmentNotif?.title === "Enrollment Pending";
  const isRejected = enrollmentNotif?.title === "Enrollment Rejected";
  const hasEnrolled = isApproved || isPending || isRejected;

  const timetableReady = notifications.some((n) => n.title === "Timetable Ready");

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // First name only
  const firstName = studentName.split(" ")[0];

  return (
    <div className="px-4 sm:px-6 py-6 space-y-6">

      {/* ── Hero greeting ── */}
      <div className="bg-[#1B5E2C] rounded-2xl p-5 sm:p-7 text-[#FAFAF5] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[#CFE3CE] text-sm mb-1">{greeting},</p>
          <h2
            className="text-2xl sm:text-3xl text-[#FAFAF5]"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {firstName}!
          </h2>
          <p className="text-[#CFE3CE] text-sm mt-2 max-w-sm">
            {isApproved
              ? "Your enrollment is approved. Check your timetable below."
              : isPending
              ? "Your enrollment is under review. We'll notify you once it's processed."
              : isRejected
              ? "Your enrollment was rejected. Please contact the school office."
              : "Welcome to the Gogon High School Online Enrollment System."}
          </p>
        </div>

        {/* Status chip */}
        <div className={`shrink-0 rounded-xl px-4 py-3 text-center ${
          isApproved ? "bg-[#F2BE22]/20 border border-[#F2BE22]/30"
          : isPending ? "bg-white/10 border border-white/20"
          : isRejected ? "bg-[#B3492B]/30 border border-[#B3492B]/40"
          : "bg-white/10 border border-white/20"
        }`}>
          <p className="text-xs text-[#CFE3CE] mb-1">Enrollment Status</p>
          <p className={`text-sm font-medium ${
            isApproved ? "text-[#F2BE22]"
            : isRejected ? "text-[#F87171]"
            : "text-[#FAFAF5]"
          }`}>
            {isApproved ? "✓ Approved"
              : isPending ? "⏳ Pending"
              : isRejected ? "✕ Rejected"
              : "Not enrolled"}
          </p>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <section>
        <p className="text-xs uppercase tracking-[0.15em] text-[#86A18A] mb-3">
          Quick Actions
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            {
              label:    hasEnrolled ? "View Enrollment" : "Enroll Now",
              sub:      hasEnrolled ? "Track your application" : "Submit your enrollment form",
              icon:     <EnrollIcon />,
              color:    "border-[#D9E8D5] hover:border-[#1B5E2C]",
              onClick:  () => onNavigate?.("enrollment"),
              disabled: isApproved,
            },
            {
              label:    "My Timetable",
              sub:      timetableReady ? "Your schedule is ready" : "Available after approval",
              icon:     <TimetableIcon />,
              color:    timetableReady
                ? "border-[#F2BE22]/50 hover:border-[#F2BE22]"
                : "border-[#D9E8D5] opacity-60",
              onClick:  () => timetableReady && onNavigate?.("timetable"),
              disabled: !timetableReady,
            },
            {
              label:    "My Profile",
              sub:      "View and update your info",
              icon:     <ProfileIcon />,
              color:    "border-[#D9E8D5] hover:border-[#1B5E2C]",
              onClick:  () => onNavigate?.("profile"),
              disabled: false,
            },
          ].map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`bg-white rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed ${action.color}`}
            >
              <div className="h-9 w-9 rounded-lg bg-[#1B5E2C]/8 flex items-center justify-center mb-3 text-[#1B5E2C]">
                {action.icon}
              </div>
              <p className="text-sm font-medium text-[#1B5E2C]">{action.label}</p>
              <p className="text-xs text-[#86A18A] mt-0.5">{action.sub}</p>
            </button>
          ))}
        </div>
      </section>

      {/* ── Notifications ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-[0.15em] text-[#86A18A]">
            Notifications
          </p>
          <button
            onClick={loadNotifications}
            className="text-xs text-[#8C6B12] hover:underline"
          >
            Refresh
          </button>
        </div>

        {loadError && (
          <div className="rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 text-[#B3492B] text-sm px-4 py-3">
            {loadError}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#D9E8D5] p-4 flex gap-3">
                <div className="h-9 w-9 rounded-lg bg-[#EFF4ED] animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 rounded bg-[#EFF4ED] animate-pulse" />
                  <div className="h-3 w-2/3 rounded bg-[#EFF4ED] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#D9E8D5] p-8 text-center">
            <p className="text-[#86A18A] text-sm">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif, i) => {
              const style = NOTIFICATION_STYLES[notif.type] ?? NOTIFICATION_STYLES.info;
              return (
                <div
                  key={i}
                  className={`rounded-xl border p-4 flex gap-3 ${style.wrapper}`}
                >
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${style.icon}`}>
                    <NotifIcon type={notif.type} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${style.dot}`} />
                      <p className={`text-sm font-medium ${style.title}`}>
                        {notif.title}
                      </p>
                    </div>
                    <p className="text-sm text-[#5B6478] leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── School info footer ── */}
      <div className="bg-white rounded-xl border border-[#D9E8D5] p-4 flex items-center gap-3">
        <img
          src="/assets/gogon-hs-logo.png"
          alt="Gogon High School"
          className="h-10 w-10 rounded-full object-cover ring-1 ring-[#F2BE22] shrink-0"
        />
        <div>
          <p className="text-sm font-medium text-[#1B5E2C]">Gogon High School</p>
          <p className="text-xs text-[#86A18A]">
            Gogon, Legazpi City, Albay · Junior &amp; Senior High School
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Icons ───────────────────────────────────────────────────── */
function EnrollIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <path d="M4 4h12v12H4z" stroke="currentColor" strokeWidth="1.5" rx="1" />
      <path d="M8 8h4M8 11h4M8 14h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 7h12" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function TimetableIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <rect x="2" y="3" width="16" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 2v2M14 2v2M2 8h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 12h2M10 12h2M6 15h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 18c0-4.142 3.358-7.5 7.5-7.5s7.5 3.358 7.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function NotifIcon({ type }) {
  if (type === "success")
    return (
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (type === "error")
    return (
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 7v4M10 13.5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 7v4M10 13.5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
