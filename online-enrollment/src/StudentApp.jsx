import { useState, useEffect, createContext, useContext } from "react";
import {
  BrowserRouter, Routes, Route,
  Navigate, useNavigate, useLocation,
} from "react-router-dom";

import StudentRegister  from "./pages/student/StudentRegister";
import StudentLogin     from "./pages/student/StudentLogin";
import StudentDashboard from "./pages/student/StudentDashboard";
import EnrollmentForm   from "./pages/student/EnrollmentForm";
import StudentProfile   from "./pages/student/StudentProfile";
import StudentTimetable from "./pages/student/StudentTimetable";
import Hirumi from "./pages/AI assistant/Hirumi";
/**
 * StudentApp.jsx
 * Router + auth + layout for the Student portal.
 *
 * Layout decisions:
 *  - Mobile  → bottom navigation bar (students primarily use phones)
 *  - Desktop → collapsible left sidebar (same pattern as admin/staff)
 *
 * Folder structure:
 *   src/
 *   ├── App.jsx          ← admin
 *   ├── StaffApp.jsx     ← staff
 *   ├── StudentApp.jsx   ← this file
 *   └── pages/
 *       └── student/
 *           ├── StudentRegister.jsx
 *           ├── StudentLogin.jsx
 *           ├── StudentDashboard.jsx
 *           ├── EnrollmentForm.jsx
 *           ├── StudentProfile.jsx
 *           └── StudentTimetable.jsx
 *
 * main.jsx wiring (all three portals in one app):
 *   const path = window.location.pathname;
 *   const root = path.startsWith("/staff")   ? <StaffApp />
 *              : path.startsWith("/student")  ? <StudentApp />
 *              : <App />;
 */

const LOGOUT_URL = "/student/student_logout.php";
const ENROLLMENT_STATUS_URL = "/student/check_enrollment_status.php";

/* ── Auth context ─────────────────────────────────────────────── */
const StudentAuthContext = createContext(null);
function useStudentAuth() { return useContext(StudentAuthContext); }

function StudentAuthProvider({ children }) {
  const [student, setStudent] = useState(() => {
    const id    = localStorage.getItem("student_id");
    const name  = localStorage.getItem("student_name");
    const gmail = localStorage.getItem("student_gmail");
    return id ? { student_id: id, name, gmail } : null;
  });

  // null = not checked yet, true = Approved, false = not approved (or no
  // record at all). Kept separate from `student` since it can change
  // (Pending -> Approved) without the student logging in again.
  const [isEnrolled, setIsEnrolled] = useState(null);

  async function refreshEnrollmentStatus(studentId) {
    if (!studentId) { setIsEnrolled(null); return; }
    try {
      const res = await fetch(`${ENROLLMENT_STATUS_URL}?student_id=${studentId}`, {
        credentials: "include",
      });
      const data = await res.json();
      setIsEnrolled(data?.success ? Boolean(data.is_enrolled) : null);
    } catch {
      // Fails safe: leave the Enroll nav item visible rather than
      // guessing, if the status check itself couldn't be reached.
      setIsEnrolled(null);
    }
  }

  // Check status on initial load too (covers page refresh, not just
  // the moment right after login).
  useEffect(() => {
    if (student?.student_id) refreshEnrollmentStatus(student.student_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function login(studentData) {
    const name = `${studentData.first_name ?? ""} ${studentData.last_name ?? ""}`.trim();
    localStorage.setItem("student_id",    String(studentData.student_id));
    localStorage.setItem("student_name",  name);
    localStorage.setItem("student_gmail", studentData.gmail ?? "");
    setStudent({ student_id: String(studentData.student_id), name, gmail: studentData.gmail });
    refreshEnrollmentStatus(studentData.student_id);
  }

  async function logout() {
    try { await fetch(LOGOUT_URL, { method: "POST", credentials: "include" }); }
    catch { /* proceed */ }
    localStorage.removeItem("student_id");
    localStorage.removeItem("student_name");
    localStorage.removeItem("student_gmail");
    setStudent(null);
    setIsEnrolled(null);
  }

  return (
    <StudentAuthContext.Provider value={{
      student,
      isLoggedIn: Boolean(student),
      isEnrolled,
      refreshEnrollmentStatus: () => refreshEnrollmentStatus(student?.student_id),
      login,
      logout,
    }}>
      {children}
    </StudentAuthContext.Provider>
  );
}

/* ── Protected route ──────────────────────────────────────────── */
function ProtectedRoute({ children }) {
  const { isLoggedIn } = useStudentAuth();
  return isLoggedIn ? children : <Navigate to="/student/login" replace />;
}

/* ── Nav items ────────────────────────────────────────────────── */
function getNavItems() {
  return NAV_ALL.filter((item) => item.path !== "/student/enroll");
}

const NAV_ALL = [
  {
    label: "Home",
    path:  "/student/dashboard",
    icon:  (active) => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path d="M3 12L12 3l9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5 10v11h14V10" stroke={active ? "currentColor" : "none"} strokeWidth="1.8"/>
      </svg>
    ),
  },
  {
    label: "Enroll",
    path:  "/student/enroll",
    icon:  (active) => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M3 8h18" stroke="currentColor" strokeWidth="1.8"/>
      </svg>
    ),
  },
  {
    label: "Timetable",
    path:  "/student/timetable",
    icon:  (active) => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M8 2v2M16 2v2M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Profile",
    path:  "/student/profile",
    icon:  (active) => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M4 20c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
];

/* ── Student layout ───────────────────────────────────────────── */
function StudentLayout({ children }) {
  const { logout, student, isEnrolled } = useStudentAuth();
  const navigate            = useNavigate();
  const location            = useLocation();

  const NAV = getNavItems();

  const [collapsed, setCollapsed]   = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    navigate("/student/login", { replace: true });
  }

  const currentNav  = NAV.find((n) => location.pathname.startsWith(n.path));
  const currentLabel = currentNav?.label ?? "Student Portal";
  const sidebarW    = collapsed ? "w-16" : "w-60 lg:w-64";

  /* ── Sidebar inner (shared between desktop + drawer) ── */
  function SidebarInner({ onNavigate }) {
    return (
      <>
        {/* Logo */}
        <div className={`flex items-center gap-3 px-3 py-5 border-b border-white/10 ${collapsed ? "justify-center" : ""}`}>
          <img
            src="/assets/gogon-hs-logo.png"
            alt="Gogon High School"
            className="h-9 w-9 rounded-full bg-white object-cover ring-2 ring-[#F2BE22] shrink-0"
          />
          {!collapsed && (
            <div className="leading-tight min-w-0 overflow-hidden">
              <p className="text-sm font-medium truncate">Gogon High School</p>
              <p className="text-xs text-[#CFE3CE]">Student Portal</p>
            </div>
          )}
        </div>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="mx-auto mt-3 mb-1 hidden md:flex items-center justify-center h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          title={collapsed ? "Expand" : "Collapse"}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
            {collapsed
              ? <path d="M7 4l6 6-6 6" stroke="#CFE3CE" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              : <path d="M13 4l-6 6 6 6" stroke="#CFE3CE" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>}
          </svg>
        </button>

        {/* Student chip */}
        {!collapsed && student && (
          <div className="mx-3 mt-3 mb-1 rounded-lg bg-white/10 px-3 py-2">
            <p className="text-xs text-[#CFE3CE] truncate">Logged in as</p>
            <p className="text-sm font-medium text-[#FAFAF5] truncate">{student.name}</p>
            <p className="text-xs text-[#CFE3CE] truncate">{student.gmail}</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); onNavigate?.(); }}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm transition-colors ${
                  active ? "bg-[#F2BE22] text-[#1B5E2C] font-medium" : "text-[#CFE3CE] hover:bg-white/10"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <span className={active ? "text-[#1B5E2C]" : "text-[#CFE3CE]"}>
                  {item.icon(active)}
                </span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-2 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            title={collapsed ? "Log out" : undefined}
            className={`w-full flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm text-[#CFE3CE] hover:bg-white/10 transition-colors disabled:opacity-50 ${collapsed ? "justify-center" : ""}`}
          >
            <LogoutIcon />
            {!collapsed && (loggingOut ? "Logging out…" : "Log out")}
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF5]">

      {/* ── Desktop sidebar ── */}
      <aside
        className={`hidden md:flex flex-col bg-[#1B5E2C] text-[#FAFAF5] shrink-0 fixed top-0 left-0 h-full z-30 transition-all duration-200 ${sidebarW}`}
      >
        <SidebarInner />
      </aside>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[#1B5E2C] text-[#FAFAF5] flex flex-col z-50">
            <SidebarInner onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Page wrapper ── */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 pb-16 md:pb-0 ${collapsed ? "md:ml-16" : "md:ml-60 lg:ml-64"}`}>

        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[#D9E8D5] bg-white px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile hamburger */}
            <button
              className="md:hidden h-9 w-9 rounded-lg border border-[#D9E8D5] flex items-center justify-center shrink-0"
              onClick={() => setDrawerOpen(true)}
            >
              <HamburgerIcon />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#8C6B12] hidden sm:block">
                Gogon High School · Student Portal
              </p>
              <h1
                className="text-base sm:text-lg text-[#1B5E2C] font-medium truncate"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {currentLabel}
              </h1>
            </div>
          </div>

          {/* Avatar */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex flex-col items-end">
              <p className="text-xs font-medium text-[#1B5E2C] truncate max-w-[120px]">
                {student?.name ?? "Student"}
              </p>
              <p className="text-[10px] text-[#86A18A] truncate max-w-[120px]">
                {student?.gmail ?? ""}
              </p>
            </div>
            <button
              onClick={() => navigate("/student/profile")}
              className="h-8 w-8 rounded-full bg-[#F2BE22] flex items-center justify-center hover:opacity-90 transition-opacity shrink-0"
              title="My Profile"
            >
              <span className="text-[#1B5E2C] text-sm font-bold" style={{ fontFamily: "'Fraunces', serif" }}>
                {student?.name?.[0]?.toUpperCase() ?? "S"}
              </span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>

      <Hirumi role="student" userId={student?.student_id} />

      {/* ── Mobile bottom navigation ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#D9E8D5] flex items-center">
        {NAV.map((item) => {
          const active = location.pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors ${
                active ? "text-[#1B5E2C]" : "text-[#86A18A]"
              }`}
            >
              {item.icon(active)}
              <span className={`text-[10px] font-medium ${active ? "text-[#1B5E2C]" : "text-[#86A18A]"}`}>
                {item.label}
              </span>
              {active && (
                <span className="absolute bottom-0 h-0.5 w-8 bg-[#1B5E2C] rounded-full" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* ── Root ─────────────────────────────────────────────────────── */
export default function StudentApp() {
  return (
    <BrowserRouter>
      <StudentAuthProvider>
        <StudentRoutes />
      </StudentAuthProvider>
    </BrowserRouter>
  );
}

function StudentRoutes() {
  const { isLoggedIn, isEnrolled, login } = useStudentAuth();
  const navigate = useNavigate?.() ?? null;

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/student/login"
        element={
          isLoggedIn
            ? <Navigate to="/student/dashboard" replace />
            : <StudentLogin
                onLoginSuccess={login}
                onGoRegister={() => window.location.href = "/student/register"}
              />
        }
      />
      <Route
        path="/student/register"
        element={
          isLoggedIn
            ? <Navigate to="/student/dashboard" replace />
            : <StudentRegister
                onGoLogin={() => window.location.href = "/student/login"}
              />
        }
      />

      {/* Protected */}
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute>
            <StudentLayout>
              <StudentDashboard
                onNavigate={(page) => {
                  const map = {
                    enrollment: "/student/enroll",
                    timetable:  "/student/timetable",
                    profile:    "/student/profile",
                  };
                  if (map[page]) window.location.href = map[page];
                }}
              />
            </StudentLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/enroll"
        element={
          <ProtectedRoute>
            {isEnrolled ? (
              <Navigate to="/student/dashboard" replace />
            ) : (
              <StudentLayout>
                <EnrollmentForm
                  onBack={() => window.location.href = "/student/dashboard"}
                />
              </StudentLayout>
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/timetable"
        element={
          <ProtectedRoute>
            <StudentLayout>
              <StudentTimetable />
            </StudentLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/profile"
        element={
          <ProtectedRoute>
            <StudentLayout>
              <StudentProfile />
            </StudentLayout>
          </ProtectedRoute>
        }
      />

      {/* Default */}
      <Route
        path="/student"
        element={<Navigate to={isLoggedIn ? "/student/dashboard" : "/student/login"} replace />}
      />
      <Route
        path="*"
        element={<Navigate to={isLoggedIn ? "/student/dashboard" : "/student/login"} replace />}
      />
    </Routes>
  );
}

/* ── Icons ────────────────────────────────────────────────────── */
function LogoutIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="none">
      <path d="M7 3H4a1 1 0 00-1 1v12a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M13 14l4-4-4-4M17 10H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="#1B5E2C" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
