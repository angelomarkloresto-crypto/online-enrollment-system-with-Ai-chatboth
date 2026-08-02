import React from "react";
import ReactDOM from "react-dom/client";

import App        from "./App";        // Admin portal  → /dashboard, /staff, /profile
import StaffApp   from "./StaffApp";   // Staff portal  → /staff/login, /staff/enrollments, etc.
import StudentApp from "./StudentApp"; // Student portal → /student/login, /student/dashboard, etc.

import "./index.css"; // Tailwind base styles

/**
 * main.jsx
 * Routes between the three portals by URL prefix.
 *
 * /student/* → StudentApp
 * /staff/*   → StaffApp
 * everything else → App (admin)
 *
 * Each portal has its own BrowserRouter, auth state, and sidebar.
 * They share the same Tailwind design system and color palette.
 */

const path = window.location.pathname.toLowerCase();

const RootComponent =
  path.startsWith("/student") ? StudentApp :
  path.startsWith("/staff") ||
  path === "/stafflogin" ||
  path === "/enrollmentmanagement" ||
  path === "/strandsandsections"
    ? StaffApp
    : App;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
);
