import { motion } from "framer-motion";

const roles = [
  {
    name: "Admin",
    description: "Manage admission flow, staff, subjects, system status, and school records.",
    accent: "from-[#1B5E2C] via-[#2F6F5E] to-[#1B5E2C]",
    badge: "A",
    action: "/login",
    type: "admin",
  },
  {
    name: "Staff",
    description: "Review enrollments, assign sections, manage student records, and updates.",
    accent: "from-[#8C6B12] via-[#F2BE22] to-[#D9E8D5]",
    badge: "S",
    action: "/staff/login",
    type: "staff",
  },
  {
    name: "Student",
    description: "Register, enroll, check schedules, and track confirmation details anytime.",
    accent: "from-[#2C5D8A] via-[#7AA6C7] to-[#DDEAF6]",
    badge: "ST",
    action: "/student/login",
    type: "student",
  },
  {
    name: "Hirumi AI Assistant",
    description: "A smart support companion for students, staff, and administrators in one place.",
    accent: "from-[#B3492B] via-[#D38A5A] to-[#F4D0B3]",
    badge: "AI",
    action: "/dashboard",
    type: "ai",
  },
];

export default function LandingPage() {
  const openPortal = (path) => {
    window.location.href = path;
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#FAFAF5] text-[#1B5E2C]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-24 -left-12 h-72 w-72 rounded-full bg-[#D9E8D5]/70 blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, 18, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-0 top-32 h-80 w-80 rounded-full bg-[#F2BE22]/20 blur-3xl"
          animate={{ x: [0, -24, 0], y: [0, 22, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-[#CFE3CE]/80 blur-3xl"
          animate={{ x: [0, 16, 0], y: [0, -18, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.header
          className="mb-10 flex items-center justify-between rounded-full border border-[#D9E8D5] bg-white/80 px-4 py-3 shadow-sm backdrop-blur-sm"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-3">
            <img
              src="/assets/gogon-hs-logo.png"
              alt="Gogon High School"
              className="h-10 w-10 rounded-full object-cover ring-2 ring-[#F2BE22]"
            />
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#86A18A]">Gogon High School</p>
              <p className="text-sm font-semibold text-[#1B5E2C]">Enrollment System</p>
            </div>
          </div>

          <button
            onClick={() => openPortal("/login")}
            className="rounded-full bg-[#1B5E2C] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#164A22]"
          >
            Admin Login
          </button>
        </motion.header>

        <main className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
          <motion.section
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.75 }}
            className="space-y-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 rounded-full border border-[#D9E8D5] bg-[#F7F9F6] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-[#8C6B12]"
            >
              <span className="h-2 w-2 rounded-full bg-[#2F6F5E]" />
              Smart enrollment platform
            </motion.div>

            <div className="space-y-4">
              <h1
                className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                Create a smoother path for every learner.
              </h1>
              <p className="max-w-xl text-base text-[#5B6478] sm:text-lg">
                A connected school experience for administrators, staff, students, and Hirumi AI
                assistance — all designed to simplify enrollment and everyday school operations.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => openPortal("/login")}
                className="rounded-xl bg-[#1B5E2C] px-5 py-3 text-sm font-medium text-white shadow-md transition hover:bg-[#164A22]"
              >
                Go to Admin Portal
              </button>
              <button
                onClick={() => openPortal("/student/login")}
                className="rounded-xl border border-[#CBD9C8] bg-white px-5 py-3 text-sm font-medium text-[#1B5E2C] shadow-sm transition hover:border-[#1B5E2C]"
              >
                Student Login
              </button>
            </div>

            <div className="grid max-w-lg grid-cols-3 gap-4 pt-3">
              {[
                { label: "Students", value: "24/7" },
                { label: "Processing", value: "Fast" },
                { label: "Support", value: "AI" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-[#D9E8D5] bg-white p-4 shadow-sm">
                  <p className="text-xl font-semibold text-[#1B5E2C]" style={{ fontFamily: "'Fraunces', serif" }}>
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[#86A18A]">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.75, delay: 0.1 }}
            className="grid gap-4 sm:grid-cols-2"
          >
            {roles.map((role, index) => (
              <motion.button
                key={role.name}
                type="button"
                onClick={() => openPortal(role.action)}
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.55, delay: index * 0.1 }}
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="group relative overflow-hidden rounded-3xl border border-[#D9E8D5] bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-lg"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${role.accent}`} />
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${role.accent} text-lg font-bold text-white`}>
                    {role.badge}
                  </div>
                  <span className="rounded-full bg-[#F7F9F6] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[#86A18A]">
                    {role.type}
                  </span>
                </div>

                <div className="mt-5 space-y-2">
                  <h2 className="text-xl font-semibold text-[#1B5E2C]" style={{ fontFamily: "'Fraunces', serif" }}>
                    {role.name}
                  </h2>
                  <p className="text-sm leading-6 text-[#5B6478]">{role.description}</p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-[#EFF4ED] pt-3">
                  <span className="text-xs uppercase tracking-[0.12em] text-[#86A18A]">
                    {role.type === "ai" ? "Assistant" : "Portal"}
                  </span>
                  <span className="text-sm font-medium text-[#1B5E2C]">Open →</span>
                </div>
              </motion.button>
            ))}
          </motion.section>
        </main>
      </div>
    </div>
  );
}
