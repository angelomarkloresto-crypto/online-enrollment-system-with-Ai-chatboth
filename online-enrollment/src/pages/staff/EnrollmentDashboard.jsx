import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

/**
 * EnrollmentDashboard
 *
 * Overview screen for the Staff Portal. Data is loaded from the database API.
 *
 * data shape:
 * {
 *   staffName: string,
 *   totals: { enrolled, pending, approved, rejected },
 *   newApplications: { today, thisWeek },
 *   newRegistrations: { grade7, grade11 },
 *   weeklyTrend: [{ day: "Mon", applications: 12 }, ...],
 *   recentApplications: [
 *     { name, grade, strand, status: "pending"|"approved"|"rejected", date }
 *   ]
 * }
 */

const EMPTY_DATA = {
  staffName: "Registrar",
  totals: { enrolled: 0, pending: 0, approved: 0, rejected: 0 },
  newApplications: { today: 0, thisWeek: 0 },
  newRegistrations: { grade7: 0, grade11: 0 },
  weeklyTrend: [],
  recentApplications: [],
};

const STATUS_STYLES = {
  pending: "bg-[#FBF0DA] text-[#8C6B12]",
  approved: "bg-[#E4F1E1] text-[#1B5E2C]",
  rejected: "bg-[#F5E1DD] text-[#A6402E]",
};

const STATUS_LABEL = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const DASHBOARD_EASE = [0.22, 1, 0.36, 1];
const dashboardItemVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  visible: (index = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: index * 0.08, duration: 0.5, ease: DASHBOARD_EASE },
  }),
};
const dashboardBounce = {
  hidden: { opacity: 0, y: 24, scale: 0.9 },
  visible: (index = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: index * 0.1, type: "spring", stiffness: 260, damping: 16 },
  }),
};

function StatIcon({ name, className = "h-5 w-5" }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  const icons = {
    users: (
      <svg {...common}>
        <path d="M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" />
        <circle cx="10" cy="7" r="3.5" />
        <path d="M17.5 11.5A3.5 3.5 0 0 0 17 4.6" />
        <path d="M20.5 20v-1a4 4 0 0 0-2.7-3.78" />
      </svg>
    ),
    clock: (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    ),
    check: (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M8.5 12.3l2.4 2.4 4.8-5.2" />
      </svg>
    ),
    x: (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M9.3 9.3l5.4 5.4M14.7 9.3l-5.4 5.4" />
      </svg>
    ),
    inbox: (
      <svg {...common}>
        <path d="M3.5 12h4.2l1.6 3h5.4l1.6-3h4.2" />
        <path d="M5.5 5.5h13l2 6.5v6a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-6l2-6.5z" />
      </svg>
    ),
    graduation: (
      <svg {...common}>
        <path d="M12 4 3 9l9 5 9-5-9-5Z" />
        <path d="M7 11v3.5c0 1.7 2.2 3 5 3s5-1.3 5-3V11" />
      </svg>
    ),
  };

  return icons[name] || icons.users;
}

function StatCard({ icon, label, value, tone, footnote }) {
  const toneStyles = {
    green: "bg-[#1B5E2C] text-white",
    cream: "bg-white text-[#1B5E2C] border border-[#D9E8D5]",
  };

  return (
    <div className={`rounded-xl p-5 shadow-sm ${toneStyles[tone]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p
            className={`text-xs uppercase tracking-[0.16em] ${
              tone === "green" ? "text-[#CFE6D3]" : "text-[#8C6B12]"
            }`}
          >
            {label}
          </p>
          <p
            className="mt-2 text-3xl"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {value}
          </p>
          {footnote && (
            <p
              className={`mt-1 text-xs ${
                tone === "green" ? "text-[#CFE6D3]" : "text-[#6B7280]"
              }`}
            >
              {footnote}
            </p>
          )}
        </div>
        <div
          className={`rounded-lg p-2 ${
            tone === "green" ? "bg-white/15" : "bg-[#FAFAF5]"
          }`}
        >
          <StatIcon
            name={icon}
            className={`h-5 w-5 ${
              tone === "green" ? "text-white" : "text-[#1B5E2C]"
            }`}
          />
        </div>
      </div>
    </div>
  );
}

export default function EnrollmentDashboard({ data = null }) {
  const [dashboardData, setDashboardData] = useState(data ?? EMPTY_DATA);
  const [loading, setLoading] = useState(!data);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (data) {
      setDashboardData(data);
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadDashboard() {
      try {
        setLoadError(null);
        const res = await fetch("/backend-online-enrollment/staff/get_staff_dashboard_summary.php", {
          credentials: "include",
        });
        const payload = await res.json();

        if (!isMounted) return;

        if (payload.success) {
          const staffName = localStorage.getItem("staff_name") || "Registrar";
          const mapped = {
            staffName,
            totals: {
              enrolled: Number(payload.total_enrolled_students ?? 0),
              pending: Number(payload.pending_enrollments ?? 0),
              approved: Number(payload.approved_enrollments ?? 0),
              rejected: Number(payload.rejected_incomplete_applications ?? 0),
            },
            newApplications: {
              today: Number(payload.new_applications_today ?? 0),
              thisWeek: Number(payload.new_applications_this_week ?? 0),
            },
            newRegistrations: {
              grade7: Number(payload.new_registrations_grade_7 ?? 0),
              grade11: Number(payload.new_registrations_grade_11 ?? 0),
            },
            weeklyTrend: payload.weekly_trend ?? [],
            recentApplications: (payload.recent_applications ?? []).map((app) => ({
              name: app.student_name || app.name || "Unknown",
              grade: app.grade_level ? `Grade ${app.grade_level}` : app.grade || "—",
              strand: app.strand_name || app.strand || "—",
              status: (app.enrollment_status || app.status || "pending").toLowerCase(),
              date: app.submitted_at ? new Date(app.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : app.date || "—",
            })),
          };

          setDashboardData(mapped);
        } else {
          setDashboardData(EMPTY_DATA);
          setLoadError("Could not load dashboard data from the database.");
        }
      } catch {
        if (isMounted) {
          setDashboardData(EMPTY_DATA);
          setLoadError("Could not reach the server.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboard();
    return () => { isMounted = false; };
  }, [data]);

  const { staffName, totals, newApplications, newRegistrations, weeklyTrend, recentApplications } = dashboardData;

  const ledgerSegments = useMemo(() => {
    const total = Math.max(totals.approved + totals.pending + totals.rejected, 1);
    return [
      { key: "approved", label: "Approved", value: totals.approved, color: "#1B5E2C", pct: (totals.approved / total) * 100 },
      { key: "pending", label: "Pending", value: totals.pending, color: "#C08A1E", pct: (totals.pending / total) * 100 },
      { key: "rejected", label: "Rejected / incomplete", value: totals.rejected, color: "#A6402E", pct: (totals.rejected / total) * 100 },
    ];
  }, [totals]);

  return (
    <div className="min-h-screen bg-[#FAFAF5]">
      <div className="border-b border-[#D9E8D5] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <p className="text-xs uppercase tracking-[0.2em] text-[#8C6B12]">Staff Portal</p>
          <h1
            className="text-xl text-[#1B5E2C] sm:text-2xl"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {loading ? "Loading dashboard..." : `Welcome back, ${staffName}`}
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">Here's where enrollment stands today.</p>
          {loadError && <p className="mt-2 text-sm text-[#A6402E]">{loadError}</p>}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Primary stat row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["users", "Total Enrolled", totals.enrolled.toLocaleString(), "green", "All grade levels"],
            ["clock", "Pending", totals.pending, "cream", "Awaiting review"],
            ["check", "Approved", totals.approved, "cream", "Confirmed slots"],
            ["x", "Rejected / Incomplete", totals.rejected, "cream", "Needs follow-up"],
          ].map(([icon, label, value, tone, footnote], index) => (
            <motion.div
              key={label}
              custom={index}
              initial="hidden"
              animate="visible"
              variants={dashboardBounce}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <StatCard icon={icon} label={label} value={value} tone={tone} footnote={footnote} />
            </motion.div>
          ))}
        </div>

        {/* Secondary stat row */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <motion.div custom={0} initial="hidden" animate="visible" variants={dashboardItemVariants} whileHover={{ y: -4 }} className="rounded-xl border border-[#D9E8D5] bg-white p-5">
            <div className="flex items-center gap-2 text-[#8C6B12]">
              <StatIcon name="inbox" className="h-4 w-4" />
              <p className="text-xs uppercase tracking-[0.16em]">New Applications</p>
            </div>
            <div className="mt-3 flex items-end gap-6">
              <div>
                <p className="text-2xl text-[#1B5E2C]" style={{ fontFamily: "'Fraunces', serif" }}>
                  {newApplications.today}
                </p>
                <p className="text-xs text-[#6B7280]">Today</p>
              </div>
              <div>
                <p className="text-2xl text-[#1B5E2C]" style={{ fontFamily: "'Fraunces', serif" }}>
                  {newApplications.thisWeek}
                </p>
                <p className="text-xs text-[#6B7280]">This week</p>
              </div>
            </div>
          </motion.div>

          <motion.div custom={1} initial="hidden" animate="visible" variants={dashboardItemVariants} whileHover={{ y: -4 }} className="rounded-xl border border-[#D9E8D5] bg-white p-5">
            <div className="flex items-center gap-2 text-[#8C6B12]">
              <StatIcon name="graduation" className="h-4 w-4" />
              <p className="text-xs uppercase tracking-[0.16em]">Grade 7 Registrations</p>
            </div>
            <p className="mt-3 text-2xl text-[#1B5E2C]" style={{ fontFamily: "'Fraunces', serif" }}>
              {newRegistrations.grade7}
            </p>
            <p className="text-xs text-[#6B7280]">New this term</p>
          </motion.div>

          <motion.div custom={2} initial="hidden" animate="visible" variants={dashboardItemVariants} whileHover={{ y: -4 }} className="rounded-xl border border-[#D9E8D5] bg-white p-5">
            <div className="flex items-center gap-2 text-[#8C6B12]">
              <StatIcon name="graduation" className="h-4 w-4" />
              <p className="text-xs uppercase tracking-[0.16em]">Grade 11 Registrations</p>
            </div>
            <p className="mt-3 text-2xl text-[#1B5E2C]" style={{ fontFamily: "'Fraunces', serif" }}>
              {newRegistrations.grade11}
            </p>
            <p className="text-xs text-[#6B7280]">New this term</p>
          </motion.div>
        </div>

        {/* Trend + ledger row */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <motion.div initial="hidden" animate="visible" variants={dashboardItemVariants} className="rounded-xl border border-[#D9E8D5] bg-white p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#1B5E2C]">Applications this week</p>
              <span className="text-xs text-[#8C6B12]">Mon – Sun</span>
            </div>
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyTrend} margin={{ left: -20, right: 10, top: 10 }}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1B5E2C" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#1B5E2C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#EFEFE6" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, borderColor: "#D9E8D5", fontSize: 12 }}
                    labelStyle={{ color: "#1B5E2C" }}
                  />
                  <Area type="monotone" dataKey="applications" stroke="#1B5E2C" strokeWidth={2} fill="url(#trendFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div custom={1} initial="hidden" animate="visible" variants={dashboardItemVariants} className="rounded-xl border border-[#D9E8D5] bg-white p-5">
            <p className="text-sm font-medium text-[#1B5E2C]">Status ledger</p>
            <p className="text-xs text-[#6B7280]">Out of {totals.approved + totals.pending + totals.rejected} reviewed</p>

            <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-[#F0F0E8]">
              {ledgerSegments.map((seg) => (
                <div
                  key={seg.key}
                  style={{ width: `${seg.pct}%`, backgroundColor: seg.color }}
                  title={`${seg.label}: ${seg.value}`}
                />
              ))}
            </div>

            <div className="mt-4 space-y-2">
              {ledgerSegments.map((seg) => (
                <div key={seg.key} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                    <span className="text-[#374151]">{seg.label}</span>
                  </div>
                  <span className="text-[#1B5E2C]">{seg.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Recent applications table */}
        <motion.div initial="hidden" animate="visible" variants={dashboardItemVariants} className="mt-4 rounded-xl border border-[#D9E8D5] bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#1B5E2C]">Recent applications</p>
            <span className="text-xs text-[#8C6B12]">Latest 5</span>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#EFEFE6] text-xs uppercase tracking-wide text-[#8C6B12]">
                  <th className="py-2 pr-4 font-medium">Applicant</th>
                  <th className="py-2 pr-4 font-medium">Grade</th>
                  <th className="py-2 pr-4 font-medium">Strand</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-0 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentApplications.map((app, i) => (
                  <motion.tr key={i} custom={i} initial="hidden" animate="visible" variants={dashboardItemVariants} className="border-b border-[#F5F5EF] last:border-0">
                    <td className="py-3 pr-4 text-[#1B5E2C]">{app.name}</td>
                    <td className="py-3 pr-4 text-[#374151]">{app.grade}</td>
                    <td className="py-3 pr-4 text-[#374151]">{app.strand}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[app.status]}`}>
                        {STATUS_LABEL[app.status]}
                      </span>
                    </td>
                    <td className="py-3 pr-0 text-[#6B7280]">{app.date}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
