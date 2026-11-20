import { useState, useEffect, useCallback } from "react";
import { apiUrl } from "../../config";
import { motion } from "framer-motion";

const API_BASE_NOTIFICATIONS = apiUrl("/backend-online-enrollment/student");

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

const bounceIn = {
  hidden: { opacity: 0, y: 24, scale: 0.94 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay, type: "spring", stiffness: 360, damping: 18, bounce: 0.55 },
  }),
};

const bounceOut = { opacity: 0, y: -18, scale: 0.96 };

export default function StudentDashboard({ onNavigate }) {
  const studentId   = localStorage.getItem("student_id");
  const studentName = localStorage.getItem("student_name") ?? "Student";

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [loadError, setLoadError]         = useState(null);
  const [latestEnrollment, setLatestEnrollment] = useState(null);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);
  const [enrollmentError, setEnrollmentError] = useState(null);

  const loadNotifications = useCallback(async () => {
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
  }, [studentId]);

  const loadEnrollment = useCallback(async () => {
    setEnrollmentLoading(true);
    setEnrollmentError(null);
    try {
      const response = await fetch(
        `${API_BASE_NOTIFICATIONS}/check_enrollment_status.php`,
        { credentials: "include" }
      );
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("The enrollment status response was invalid.");
      }
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Enrollment status could not be loaded.");
      }
      setLatestEnrollment(data.has_enrollment ? data : null);
    } catch (error) {
      setLatestEnrollment(null);
      setEnrollmentError(error.message || "Could not load enrollment status.");
    } finally {
      setEnrollmentLoading(false);
    }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);
  useEffect(() => { loadEnrollment(); }, [loadEnrollment]);

  const isApproved = latestEnrollment?.enrollment_status === "Approved";
  const isPending  = latestEnrollment?.enrollment_status === "Pending";
  const isRejected = latestEnrollment?.enrollment_status === "Rejected";

  const timetableReady = notifications.some((n) => n.title === "Timetable Ready");

  function handleEnrollClick() {
    onNavigate?.("enrollment");
  }

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // First name only
  const firstName = studentName.split(" ")[0];

  return (
    <motion.div
      className="px-4 sm:px-6 py-6 space-y-6"
      initial="hidden"
      animate="visible"
      exit={bounceOut}
      variants={bounceIn}
    >

      {/* ── Hero greeting ── */}
      <motion.div
        className="bg-[#0B2B26] rounded-2xl p-5 sm:p-7 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        variants={bounceIn}
        custom={0.05}
      >
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
              ? "Your latest enrollment is approved."
              : isPending
              ? "Your enrollment is under review. We'll notify you once it's processed."
              : isRejected
              ? "Your latest application was rejected. Review the details below."
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
          <p className="text-xs text-[#DAF1DE] mb-1">
            {enrollmentLoading ? "Enrollment Status" : enrollmentError ? "Enrollment Status" : "Latest Enrollment Status"}
          </p>
          <p className={`text-sm font-medium ${
            isApproved ? "text-[#8EB69B]"
            : isRejected ? "text-[#F87171]"
            : "text-white"
          }`}>
            {enrollmentLoading ? "Loading…"
              : enrollmentError ? "Unavailable"
              : isApproved ? "✓ Approved"
              : isPending ? "⏳ Pending"
              : isRejected ? "✕ Rejected"
              : "Not enrolled"}
          </p>
        </div>
      </motion.div>

      {latestEnrollment && (
        <EnrollmentSummary
          enrollment={latestEnrollment}
          history={Array.isArray(latestEnrollment.enrollment_history)
            ? latestEnrollment.enrollment_history
            : []}
        />
      )}
      {enrollmentError && (
        <p role="alert" className="rounded-xl border border-[#B3492B]/25 bg-[#B3492B]/8 px-4 py-3 text-sm text-[#B3492B]">
          {enrollmentError}
        </p>
      )}

      {/* ── Quick actions ── */}
      <section>
        <p className="text-xs uppercase tracking-[0.15em] text-[#0B2B26]/45 mb-3">
          Quick Actions
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            {
              label:    "Check Enrollment Periods",
              sub:      "See open periods and your eligibility",
              icon:     <EnrollIcon />,
              color:    "border-[#235347]/15 hover:border-[#0B2B26]",
              onClick:  handleEnrollClick,
              disabled: false,
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
          ].map((action, i) => (
            <motion.button
              key={action.label}
              onClick={action.onClick}
              disabled={action.disabled}
              variants={bounceIn}
              custom={0.12 + i * 0.08}
              whileHover={{ y: -5, scale: 1.02 }}
              className={`bg-white rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed ${action.color}`}
            >
              <div className="h-9 w-9 rounded-lg bg-[#0B2B26]/8 flex items-center justify-center mb-3 text-[#0B2B26]">
                {action.icon}
              </div>
              <p className="text-sm font-medium text-[#0B2B26]">{action.label}</p>
              <p className="text-xs text-[#0B2B26]/45 mt-0.5">{action.sub}</p>
            </motion.button>
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
            onClick={() => {
              loadNotifications();
              loadEnrollment();
            }}
            className="text-xs text-[#163832] hover:underline"
          >
            Refresh
          </button>
        </div>

        {loadError && (
          <motion.div
            className="rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 text-[#B3492B] text-sm px-4 py-3"
            variants={bounceIn}
            custom={0.1}
          >
            {loadError}
          </motion.div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="bg-white rounded-xl border border-[#235347]/15 p-4 flex gap-3"
                variants={bounceIn}
                custom={0.12 + i * 0.08}
              >
                <div className="h-9 w-9 rounded-lg bg-[#DAF1DE]/60 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 rounded bg-[#DAF1DE]/60 animate-pulse" />
                  <div className="h-3 w-2/3 rounded bg-[#DAF1DE]/60 animate-pulse" />
                </div>
              </motion.div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <motion.div
            className="bg-white rounded-xl border border-[#235347]/15 p-8 text-center"
            variants={bounceIn}
            custom={0.12}
          >
            <p className="text-[#0B2B26]/45 text-sm">No notifications yet.</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif, i) => {
              const style = NOTIFICATION_STYLES[notif.type] ?? NOTIFICATION_STYLES.info;
              return (
                <motion.div
                  key={i}
                  className={`rounded-xl border p-4 flex gap-3 ${style.wrapper}`}
                  variants={bounceIn}
                  custom={0.12 + i * 0.08}
                  whileHover={{ y: -4, scale: 1.01 }}
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
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── School info footer ── */}
      <motion.div
        className="bg-white rounded-xl border border-[#235347]/15 p-4 flex items-center gap-3"
        variants={bounceIn}
        custom={0.38}
        whileHover={{ y: -4, scale: 1.01 }}
      >
        <img
          src="/assets/gogon-hs-logo.jpg"
          alt="Gogon High School"
          className="h-10 w-10 rounded-full object-cover ring-1 ring-[#8EB69B] shrink-0"
        />
        <div>
          <p className="text-sm font-medium text-[#0B2B26]">Gogon High School</p>
          <p className="text-xs text-[#0B2B26]/45">
            Gogon, Legazpi City, Albay · Junior &amp; Senior High School
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function formatSchoolYear(value) {
  if (!value) return "School year unavailable";
  return String(value).replace(/^(\d{4})-(\d{4})$/, "$1–$2");
}

function enrollmentCoverage(value) {
  return value === "shs_second_semester"
    ? "Senior High School · 2nd Semester"
    : value === "all_grade_levels"
      ? "All Grade Levels"
      : "Coverage unavailable";
}

function EnrollmentSummary({ enrollment, history }) {
  const status = enrollment.enrollment_status;
  const isApproved = status === "Approved";
  const statusStyle = isApproved
    ? "bg-[#0B2B26]/8 text-[#0B2B26]"
    : status === "Rejected"
      ? "bg-[#B3492B]/10 text-[#B3492B]"
      : "bg-[#8EB69B]/20 text-[#163832]";
  const semester = enrollment.semester || enrollment.period_semester;

  return (
    <section className="rounded-2xl border border-[#235347]/15 bg-white p-4 sm:p-5" aria-labelledby="latest-enrollment-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-[#0B2B26]/45">
            {isApproved ? "Approved Enrollment Details" : "Latest Enrollment Application"}
          </p>
          <h3 id="latest-enrollment-title" className="mt-1 text-xl font-semibold text-[#0B2B26]" style={{ fontFamily: "'Fraunces', serif" }}>
            School Year: {formatSchoolYear(enrollment.school_year)}
          </h3>
          <p className="mt-1 text-sm text-[#0B2B26]/60">
            {enrollmentCoverage(enrollment.coverage)}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyle}`}>
          {status || "Status unavailable"}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <EnrollmentDetail label="Semester" value={semester || "Not recorded"} />
        <EnrollmentDetail
          label="Grade Level"
          value={enrollment.grade_level ? `Grade ${enrollment.grade_level}` : "Not assigned"}
        />
        <EnrollmentDetail label="Section" value={enrollment.section_name || "Not assigned"} />
      </dl>

      {status === "Rejected" && enrollment.rejection_reason && (
        <p className="mt-3 rounded-lg bg-[#B3492B]/8 px-3 py-2 text-sm text-[#B3492B]">
          Rejection reason: {enrollment.rejection_reason}
        </p>
      )}

      {history.length > 1 && (
        <details className="mt-4 border-t border-[#235347]/10 pt-3">
          <summary className="cursor-pointer text-sm font-medium text-[#163832]">
            Previous enrollment attempts ({history.length - 1})
          </summary>
          <ul className="mt-3 space-y-2">
            {history.slice(1).map((attempt) => (
              <li
                key={attempt.enrollment_id}
                className="flex flex-col gap-1 rounded-lg bg-[#DAF1DE]/30 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium text-[#0B2B26]">
                  {formatSchoolYear(attempt.school_year)}
                  {attempt.grade_level ? ` · Grade ${attempt.grade_level}` : ""}
                  {attempt.section_name ? ` · ${attempt.section_name}` : ""}
                </span>
                <span className="text-[#0B2B26]/65">
                  {attempt.enrollment_status || "Status unavailable"}
                  {attempt.submitted_at
                    ? ` · ${new Date(String(attempt.submitted_at).replace(" ", "T")).toLocaleDateString()}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function EnrollmentDetail({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg bg-[#DAF1DE]/30 px-3 py-2">
      <dt className="text-xs text-[#0B2B26]/50">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-[#0B2B26]" title={value}>{value}</dd>
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
