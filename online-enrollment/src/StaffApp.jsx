import { useState, createContext, useContext } from "react";
import {
  BrowserRouter, Routes, Route,
  Navigate, useNavigate, useLocation,
} from "react-router-dom";

import StaffLogin          from "./pages/staff/StaffLogin";
import EnrollmentManagement from "./pages/staff/EnrollmentManagement";
import StrandsAndSections   from "./pages/staff/StrandsAndSections";
import TimetableManagement from "./pages/staff/TimetableManagement";

/**
 * StaffApp.jsx
 * Router + auth state + collapsible sidebar for the Staff portal.
 *
 * Folder structure expected:
 *   src/
 *   ├── App.jsx          ← admin router (already built)
 *   ├── StaffApp.jsx     ← this file
 *   └── pages/
 *       ├── admin/       ← admin pages
 *       └── staff/
 *           ├── StaffLogin.jsx
 *           ├── EnrollmentManagement.jsx
 *           └── StrandsAndSections.jsx
 *
 * Entry point:
 *   If admin and staff run on the same React app, wire this in main.jsx
 *   by path prefix — see bottom of this file for an example.
 */

const LOGOUT_URL = "/staff/staff_logout.php";

/* ── Auth context ─────────────────────────────────────────────── */
const StaffAuthContext = createContext(null);
function useStaffAuth() { return useContext(StaffAuthContext); }

function StaffAuthProvider({ children }) {
  const [staff, setStaff] = useState(() => {
    const id   = localStorage.getItem("staff_id");
    const name = localStorage.getItem("staff_name");
    const email= localStorage.getItem("staff_email");
    return id ? { staff_id: id, full_name: name, email } : null;
  });

  function login(staffData) {
    localStorage.setItem("staff_id",    String(staffData.staff_id));
    localStorage.setItem("staff_name",  staffData.full_name  ?? "Staff");
    localStorage.setItem("staff_email", staffData.email      ?? "");
    setStaff(staffData);
  }

  async function logout() {
    try {
      await fetch(LOGOUT_URL, { method: "POST", credentials: "include" });
    } catch { /* proceed regardless */ }
    localStorage.removeItem("staff_id");
    localStorage.removeItem("staff_name");
    localStorage.removeItem("staff_email");
    setStaff(null);
  }

  return (
    <StaffAuthContext.Provider value={{ staff, isLoggedIn: Boolean(staff), login, logout }}>
      {children}
    </StaffAuthContext.Provider>
  );
}

/* ── Protected route ──────────────────────────────────────────── */
function ProtectedRoute({ children }) {
  const { isLoggedIn } = useStaffAuth();
  return isLoggedIn
    ? children
    : <Navigate to="/staff/login" replace />;
}

/* ── Nav items ────────────────────────────────────────────────── */
const NAV = [
  {
    label: "Timetable",
    path:  "/staff/timetable",
    icon:  (color) => (
      <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="none">
        <rect x="2" y="3" width="16" height="15" rx="1.5" stroke={color} strokeWidth="1.5" />
        <path d="M6 2v2M14 2v2M2 8h16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M6 12h2M10 12h2M6 15h2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Enrollments",
    path:  "/staff/enrollments",
    icon:  (color) => (
      <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="none">
        <path d="M4 4h12v12H4z" rx="1.5" stroke={color} strokeWidth="1.5" />
        <path d="M8 8h4M8 11h4M8 14h2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M4 7h12" stroke={color} strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    label: "Strands & Sections",
    path:  "/staff/strands",
    icon:  (color) => (
      <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="none">
        <rect x="2" y="3" width="7" height="6" rx="1.5" stroke={color} strokeWidth="1.5" />
        <rect x="11" y="3" width="7" height="6" rx="1.5" stroke={color} strokeWidth="1.5" />
        <rect x="2" y="12" width="7" height="5" rx="1.5" stroke={color} strokeWidth="1.5" />
        <rect x="11" y="12" width="7" height="5" rx="1.5" stroke={color} strokeWidth="1.5" />
      </svg>
    ),
  },
];

/* ── Sidebar layout ───────────────────────────────────────────── */
function StaffSidebarLayout({ children }) {
  const { logout, staff }   = useStaffAuth();
  const navigate            = useNavigate();
  const location            = useLocation();

  const [collapsed, setCollapsed]   = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    navigate("/staff/login", { replace: true });
  }

  const currentLabel =
    NAV.find((n) => location.pathname.startsWith(n.path))?.label ?? "Staff Portal";

  const sidebarW = collapsed ? "w-16" : "w-60 lg:w-64";

  /* shared sidebar inner content */
  function SidebarInner({ onNavigate }) {
    return (
      <>
        {/* Logo */}
        <div
          className={`flex items-center gap-3 px-3 py-5 border-b border-white/10 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <img
            src="/assets/gogon-hs-logo.png"
            alt="Gogon High School"
            className="h-9 w-9 rounded-full bg-white object-cover ring-2 ring-[#F2BE22] shrink-0"
          />
          {!collapsed && (
            <div className="leading-tight min-w-0 overflow-hidden">
              <p className="text-sm font-medium truncate">Gogon High School</p>
              <p className="text-xs text-[#CFE3CE]">Staff Portal</p>
            </div>
          )}
        </div>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="mx-auto mt-3 mb-1 hidden md:flex items-center justify-center h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
            {collapsed ? (
              <path d="M7 4l6 6-6 6" stroke="#CFE3CE" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M13 4l-6 6 6 6" stroke="#CFE3CE" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </button>

        {/* Staff name chip */}
        {!collapsed && staff?.full_name && (
          <div className="mx-3 mt-3 mb-1 rounded-lg bg-white/10 px-3 py-2">
            <p className="text-xs text-[#CFE3CE] truncate">Logged in as</p>
            <p className="text-sm font-medium text-[#FAFAF5] truncate">
              {staff.full_name}
            </p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = location.pathname.startsWith(item.path);
            const color  = active ? "#1B5E2C" : "#CFE3CE";
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  if (onNavigate) onNavigate();
                }}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-[#F2BE22] text-[#1B5E2C] font-medium"
                    : "text-[#CFE3CE] hover:bg-white/10"
                } ${collapsed ? "justify-center" : ""}`}
              >
                {item.icon(color)}
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
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
            className={`w-full flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm text-[#CFE3CE] hover:bg-white/10 transition-colors disabled:opacity-50 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogoutIcon />
            {!collapsed && (loggingOut ? "Logging out…" : "Log out")}
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#FAFAF5]">

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-[#1B5E2C] text-[#FAFAF5] shrink-0 fixed top-0 left-0 h-full z-30 transition-all duration-200 ${sidebarW}`}
      >
        <SidebarInner />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[#1B5E2C] text-[#FAFAF5] flex flex-col z-50">
            <SidebarInner onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {/* Page area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          collapsed ? "md:ml-16" : "md:ml-60 lg:ml-64"
        }`}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-[#D9E8D5] bg-white px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile hamburger */}
            <button
              className="md:hidden h-9 w-9 rounded-lg border border-[#D9E8D5] flex items-center justify-center shrink-0"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <HamburgerIcon />
            </button>

            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#8C6B12] hidden sm:block">
                Gogon High School · Staff Portal
              </p>
              <h1
                className="text-base sm:text-lg text-[#1B5E2C] font-medium truncate"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {currentLabel}
              </h1>
            </div>
          </div>

          {/* Staff avatar chip */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex flex-col items-end">
              <p className="text-xs font-medium text-[#1B5E2C] truncate max-w-[120px]">
                {staff?.full_name ?? "Staff"}
              </p>
              <p className="text-[10px] text-[#86A18A] truncate max-w-[120px]">
                {staff?.email ?? ""}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-[#F2BE22] flex items-center justify-center shrink-0">
              <span
                className="text-[#1B5E2C] text-sm font-bold"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {staff?.full_name?.[0]?.toUpperCase() ?? "S"}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

/* ── Root StaffApp ────────────────────────────────────────────── */
export default function StaffApp() {
  return (
    <BrowserRouter>
      <StaffAuthProvider>
        <StaffRoutes />
      </StaffAuthProvider>
    </BrowserRouter>
  );
}

function StaffRoutes() {
  const { isLoggedIn, login } = useStaffAuth();

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/staff/login"
        element={
          isLoggedIn
            ? <Navigate to="/staff/enrollments" replace />
            : <StaffLogin onLoginSuccess={login} />
        }
      />

      {/* Protected */}
      <Route
        path="/staff/enrollments"
        element={
          <ProtectedRoute>
            <StaffSidebarLayout>
              <EnrollmentManagement />
            </StaffSidebarLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/strands"
        element={
          <ProtectedRoute>
            <StaffSidebarLayout>
              <StrandsAndSections />
            </StaffSidebarLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/timetable"
        element={
          <ProtectedRoute>
            <StaffSidebarLayout>
              <TimetableManagement />
            </StaffSidebarLayout>
          </ProtectedRoute>
        }
      />

      {/* Default */}
      <Route
        path="/staff"
        element={
          <Navigate to={isLoggedIn ? "/staff/enrollments" : "/staff/login"} replace />
        }
      />
      <Route
        path="*"
        element={
          <Navigate to={isLoggedIn ? "/staff/enrollments" : "/staff/login"} replace />
        }
      />
    </Routes>
  );
}

/* ── Icons ────────────────────────────────────────────────────── */
function LogoutIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="none">
      <path
        d="M7 3H4a1 1 0 00-1 1v12a1 1 0 001 1h3"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
      />
      <path
        d="M13 14l4-4-4-4M17 10H7"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="#1B5E2C" strokeWidth="1.8" strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * ── HOW TO WIRE BOTH ADMIN + STAFF INTO ONE REACT APP ────────────
 *
 * In your main.jsx, instead of rendering a single <App /> or <StaffApp />,
 * detect the path prefix and render the right router:
 *
 * // main.jsx
 * import React from "react";
 * import ReactDOM from "react-dom/client";
 * import App      from "./App";        // admin
 * import StaffApp from "./StaffApp";   // staff
 *
 * const isStaff = window.location.pathname.startsWith("/staff");
 *
 * ReactDOM.createRoot(document.getElementById("root")).render(
 *   <React.StrictMode>
 *     {isStaff ? <StaffApp /> : <App />}
 *   </React.StrictMode>
 * );
 * ─────────────────────────────────────────────────────────────────
 */
