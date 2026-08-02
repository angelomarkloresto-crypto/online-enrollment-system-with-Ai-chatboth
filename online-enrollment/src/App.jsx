// import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, createContext, useContext } from "react";
import {
  BrowserRouter, Routes, Route,
  Navigate, useNavigate, useLocation,
} from "react-router-dom";

import AdminRegister   from "./pages/admin/AdminRegister";
import AdminLogin      from "./pages/admin/AdminLogin";
import AdminDashboard  from "./pages/admin/AdminDashboard";
import StaffManagement from "./pages/admin/StaffManagement";
import AdminProfile    from "./pages/admin/AdminProfile";
import AdminLayout     from "./pages/layouts/AdminLayouts";


// import AdminLayout from "./pages/layouts/AdminLayouts";
// import AdminRegister from "./pages/admin/AdminRegister";
// import AdminLogin from "./pages/admin/AdminLogin";
// import StudentLogin from "./pages/student/StudentLogin";
// import AdminDashboard from "./pages/admin/AdminDashboard";
// import StaffManagement from "./pages/admin/StaffManagement";
// import StudentRegister from "./pages/student/StudentRegister";
// import AdminProfile from "./pages/admin/AdminProfile";
// // import StaffLogin from "./pages/staff/StaffLogin";
// // import StaffDashboard from "./pages/staff/StaffDashboard";
import './App.css';

// function App() {
//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route element={<AdminLayout />}>
//           <Route path="/AdminDashboard" element={<AdminDashboard />} />
//           <Route path="/StaffManagement" element={<StaffManagement />} />
//           <Route path="/AdminProfile" element={<AdminProfile />} />
//         </Route>

//         {/* <Route path="/" element={<AdminLogin />} /> */}
//         <Route path="/AdminRegister" element={<AdminRegister />} />
//         <Route path="/AdminLogin" element={<AdminLogin />} />
//         {/* <Route path="/StudentLogin" element={<StudentLogin />} />
//         <Route path="/StudentRegister" element={<StudentRegister />} /> */}
//         {/* <Route path="*" element={<AdminLogin />} /> */}
//         {/* <Route path="/StaffLogin" element={<StaffLogin />} />
//         <Route path="/StaffDashboard" element={<StaffDashboard />} />
//         <Route path="/EnrollmentManagement" element={<StaffDashboard />} />
//         <Route path="/StrandsAndSections" element={<StaffDashboard />} />
//         <Route path="/StaffDashboard" element={<StaffDashboard />} /> */}
//       </Routes>
//     </BrowserRouter>
//   );
// }

// export default App;
const AuthContext = createContext(null);
function useAuth() { return useContext(AuthContext); }

function AuthProvider({ children }) {
  const [adminId, setAdminId] = useState(() => localStorage.getItem("admin_id") ?? null);

  function login(id) {
    localStorage.setItem("admin_id", String(id));
    setAdminId(String(id));
  }

  async function logout() {
    try { await fetch("/admin/admin_logout.php", { method: "POST", credentials: "include" }); }
    catch { /* proceed regardless */ }
    localStorage.removeItem("admin_id");
    setAdminId(null);
  }

  return (
    <AuthContext.Provider value={{ adminId, isLoggedIn: Boolean(adminId), login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/* ── Protected route ──────────────────────────────────────────── */
function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

/* ── Nav items ────────────────────────────────────────────────── */
const NAV = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: (color) => (
      <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    label: "Staff Management",
    path: "/staff",
    icon: (color) => (
      <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="none">
        <circle cx="7" cy="6" r="3" stroke={color} strokeWidth="1.5" />
        <path d="M1 17c0-3.314 2.686-6 6-6h.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M13 13l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Profile",
    path: "/profile",
    icon: (color) => (
      <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="none">
        <circle cx="10" cy="7" r="3.5" stroke={color} strokeWidth="1.5" />
        <path d="M2.5 18c0-4.142 3.358-7.5 7.5-7.5s7.5 3.358 7.5 7.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

/* ── Sidebar layout ───────────────────────────────────────────── */
function SidebarLayout({ children }) {
  const { logout, adminId } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [collapsed, setCollapsed]   = useState(false); // desktop collapsed state
  const [drawerOpen, setDrawerOpen] = useState(false); // mobile drawer
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    navigate("/login", { replace: true });
  }

  const currentLabel = NAV.find(n => location.pathname.startsWith(n.path))?.label ?? "Admin Panel";
  const sidebarW = collapsed ? "w-16" : "w-60 lg:w-64";

  return (
    <div className="min-h-screen flex bg-[#FAFAF5]">

      {/* ── Desktop sidebar ── */}
      <aside
        className={`hidden md:flex flex-col bg-[#1B5E2C] text-[#FAFAF5] shrink-0 fixed top-0 left-0 h-full z-30 transition-all duration-200 ${sidebarW}`}
      >
        {/* Logo row */}
        <div className={`flex items-center gap-3 px-3 py-5 border-b border-white/10 ${collapsed ? "justify-center" : ""}`}>
          <img
            src="/assets/gogon-hs-logo.png"
            alt="Gogon High School"
            className="h-9 w-9 rounded-full bg-white object-cover ring-2 ring-[#F2BE22] shrink-0"
          />
          {!collapsed && (
            <div className="leading-tight min-w-0 overflow-hidden">
              <p className="text-sm font-medium truncate">Gogon High School</p>
              <p className="text-xs text-[#CFE3CE]">Admin Panel</p>
            </div>
          )}
        </div>

        {/* Collapse toggle button */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className={`mx-auto mt-3 mb-1 flex items-center justify-center h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 transition-colors`}
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

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = location.pathname.startsWith(item.path);
            const color  = active ? "#1B5E2C" : "#CFE3CE";
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm transition-colors ${
                  active ? "bg-[#F2BE22] text-[#1B5E2C] font-medium" : "text-[#CFE3CE] hover:bg-white/10"
                } ${collapsed ? "justify-center" : ""}`}
              >
                {item.icon(color)}
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
      </aside>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[#1B5E2C] text-[#FAFAF5] flex flex-col z-50">
            <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
              <img
                src="/assets/gogon-hs-logo.png"
                alt="Gogon High School"
                className="h-9 w-9 rounded-full bg-white object-cover ring-2 ring-[#F2BE22] shrink-0"
              />
              <div className="leading-tight">
                <p className="text-sm font-medium">Gogon High School</p>
                <p className="text-xs text-[#CFE3CE]">Admin Panel</p>
              </div>
            </div>

            <nav className="flex-1 px-2 py-4 space-y-1">
              {NAV.map((item) => {
                const active = location.pathname.startsWith(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setDrawerOpen(false); }}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      active ? "bg-[#F2BE22] text-[#1B5E2C] font-medium" : "text-[#CFE3CE] hover:bg-white/10"
                    }`}
                  >
                    {item.icon(active ? "#1B5E2C" : "#CFE3CE")}
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="px-2 py-4 border-t border-white/10">
              <p className="px-3 text-xs text-[#86A18A] mb-2 truncate">ID: {adminId}</p>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#CFE3CE] hover:bg-white/10 disabled:opacity-50"
              >
                <LogoutIcon />
                {loggingOut ? "Logging out…" : "Log out"}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Page area ── */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${collapsed ? "md:ml-16" : "md:ml-60 lg:ml-64"}`}>
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
                Gogon High School
              </p>
              <h1 className="text-base sm:text-lg text-[#1B5E2C] font-medium truncate"
                style={{ fontFamily: "'Fraunces', serif" }}>
                {currentLabel}
              </h1>
            </div>
          </div>

          {/* Right — avatar → profile */}
          <button
            onClick={() => navigate("/profile")}
            className="h-8 w-8 rounded-full bg-[#F2BE22] flex items-center justify-center hover:opacity-90 transition-opacity shrink-0"
            title="My Profile"
          >
            <span className="text-[#1B5E2C] text-sm font-bold" style={{ fontFamily: "'Fraunces', serif" }}>
              A
            </span>
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

/* ── Root ─────────────────────────────────────────────────────── */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

function AppRoutes() {
  const { isLoggedIn, login } = useAuth();

  return (
    <Routes>
      <Route path="/register" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <AdminRegister />} />
      <Route path="/login"    element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <AdminLogin onLoginSuccess={login} />} />

      <Route path="/dashboard" element={<ProtectedRoute><SidebarLayout><AdminDashboard /></SidebarLayout></ProtectedRoute>} />
      <Route path="/staff"     element={<ProtectedRoute><SidebarLayout><StaffManagement /></SidebarLayout></ProtectedRoute>} />
      <Route path="/profile"   element={<ProtectedRoute><SidebarLayout><AdminProfile /></SidebarLayout></ProtectedRoute>} />

      <Route path="*" element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}

/* ── Icons ────────────────────────────────────────────────────── */
function LogoutIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="none">
      <path d="M7 3H4a1 1 0 00-1 1v12a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 14l4-4-4-4M17 10H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="#1B5E2C" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
