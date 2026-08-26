import { useState, useEffect } from "react";

const API_BASE_NOTIFICATIONS = "/backend-online-enrollment/student";

const NOTIFICATION_STYLES = {
  success: {
    wrapper: "bg-[#0B2B26]/8 border-[#0B2B26]/25",
    icon:    "bg-[#0B2B26]/15 text-[#0B2B26]",
    title:   "text-[#0B2B26]",
    dot:     "bg-[#0B2B26]",
  },
  info: {
    wrapper: "bg-[#8EB69B]/10 border-[#8EB69B]/40",
    icon:    "bg-[#8EB69B]/20 text-[#163832]",
    title:   "text-[#163832]",
    dot:     "bg-[#8EB69B]",
  },
  warning: {
    wrapper: "bg-[#8EB69B]/10 border-[#8EB69B]/40",
    icon:    "bg-[#8EB69B]/20 text-[#163832]",
    title:   "text-[#163832]",
    dot:     "bg-[#8EB69B]",
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
  const [notice, setNotice]               = useState(null); // e.g. "You are already enrolled."

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

  // Approved students already have a finalized enrollment — block them from
  // re-opening the form and surface a notice instead. Rejected students are
  // explicitly allowed to enroll again (they never got in), and pending
  // students can still tap through to see their submitted application.
  function handleEnrollClick() {
    if (isApproved) {
      setNotice("You are already enrolled.");
      return;
    }
    onNavigate?.("enrollment");
  }

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // First name only
  const firstName = studentName.split(" ")[0];

  return (
    <div className="px-4 sm:px-6 py-6 space-y-6">

      {/* ── Hero greeting ── */}
      <div className="bg-[#0B2B26] rounded-2xl p-5 sm:p-7 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[#DAF1DE] text-sm mb-1">{greeting},</p>
          <h2
            className="text-2xl sm:text-3xl text-white"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {firstName}!
          </h2>
          <p className="text-[#DAF1DE] text-sm mt-2 max-w-sm">
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
          isApproved ? "bg-[#8EB69B]/20 border border-[#8EB69B]/30"
          : isPending ? "bg-white/10 border border-white/20"
          : isRejected ? "bg-[#B3492B]/30 border border-[#B3492B]/40"
          : "bg-white/10 border border-white/20"
        }`}>
          <p className="text-xs text-[#DAF1DE] mb-1">Enrollment Status</p>
          <p className={`text-sm font-medium ${
            isApproved ? "text-[#8EB69B]"
            : isRejected ? "text-[#F87171]"
            : "text-white"
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
        <p className="text-xs uppercase tracking-[0.15em] text-[#0B2B26]/45 mb-3">
          Quick Actions
        </p>

        {notice && (
          <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-[#8EB69B]/40 bg-[#8EB69B]/10 px-4 py-3 text-sm text-[#163832]">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className="shrink-0 text-[#163832]/70 hover:text-[#163832]" aria-label="Dismiss">✕</button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            {
              label:    isApproved ? "Already Enrolled" : isRejected ? "Enroll Again" : hasEnrolled ? "View Enrollment" : "Enroll Now",
              sub:      isApproved ? "Your enrollment is finalized" : isRejected ? "Re-submit your enrollment form" : hasEnrolled ? "Track your application" : "Submit your enrollment form",
              icon:     <EnrollIcon />,
              color:    isApproved ? "border-[#235347]/15 opacity-60" : "border-[#235347]/15 hover:border-[#0B2B26]",
              onClick:  handleEnrollClick,
              disabled: false, // stays clickable even when approved, so the notice can actually show
            },
            {
              label:    "My Timetable",
              sub:      timetableReady ? "Your schedule is ready" : "Available after approval",
              icon:     <TimetableIcon />,
              color:    timetableReady
                ? "border-[#8EB69B]/50 hover:border-[#8EB69B]"
                : "border-[#235347]/15 opacity-60",
              onClick:  () => timetableReady && onNavigate?.("timetable"),
              disabled: !timetableReady,
            },
            {
              label:    "My Profile",
              sub:      "View and update your info",
              icon:     <ProfileIcon />,
              color:    "border-[#235347]/15 hover:border-[#0B2B26]",
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
              <div className="h-9 w-9 rounded-lg bg-[#0B2B26]/8 flex items-center justify-center mb-3 text-[#0B2B26]">
                {action.icon}
              </div>
              <p className="text-sm font-medium text-[#0B2B26]">{action.label}</p>
              <p className="text-xs text-[#0B2B26]/45 mt-0.5">{action.sub}</p>
            </button>
          ))}
        </div>
      </section>

      {/* ── Notifications ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-[0.15em] text-[#0B2B26]/45">
            Notifications
          </p>
          <button
            onClick={loadNotifications}
            className="text-xs text-[#163832] hover:underline"
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
              <div key={i} className="bg-white rounded-xl border border-[#235347]/15 p-4 flex gap-3">
                <div className="h-9 w-9 rounded-lg bg-[#DAF1DE]/60 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 rounded bg-[#DAF1DE]/60 animate-pulse" />
                  <div className="h-3 w-2/3 rounded bg-[#DAF1DE]/60 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#235347]/15 p-8 text-center">
            <p className="text-[#0B2B26]/45 text-sm">No notifications yet.</p>
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
                    <p className="text-sm text-[#0B2B26]/70 leading-relaxed">
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
      <div className="bg-white rounded-xl border border-[#235347]/15 p-4 flex items-center gap-3">
        <img
          src="/assets/gogon-hs-logo.png"
          alt="Gogon High School"
          className="h-10 w-10 rounded-full object-cover ring-1 ring-[#8EB69B] shrink-0"
        />
        <div>
          <p className="text-sm font-medium text-[#0B2B26]">Gogon High School</p>
          <p className="text-xs text-[#0B2B26]/45">
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
