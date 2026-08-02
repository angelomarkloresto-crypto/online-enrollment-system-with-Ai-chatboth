import { useState } from "react";
import EnrollmentManagement from "./ErollmentManagement";
import StrandsAndSections from "./StrandAndSection";

export default function StaffDashboard() {
  const [activeView, setActiveView] = useState("enrollments");

  return (
    <div className="min-h-screen bg-[#FAFAF5]">
      <div className="border-b border-[#D9E8D5] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#8C6B12]">Staff Portal</p>
            <h1
              className="text-xl text-[#1B5E2C] sm:text-2xl"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Staff Dashboard
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveView("enrollments")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeView === "enrollments"
                  ? "bg-[#1B5E2C] text-white"
                  : "bg-[#FAFAF5] text-[#1B5E2C] border border-[#D9E8D5]"
              }`}
            >
              Enrollment Management
            </button>
            <button
              type="button"
              onClick={() => setActiveView("strands")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeView === "strands"
                  ? "bg-[#1B5E2C] text-white"
                  : "bg-[#FAFAF5] text-[#1B5E2C] border border-[#D9E8D5]"
              }`}
            >
              Strands & Sections
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {activeView === "enrollments" ? <EnrollmentManagement /> : <StrandsAndSections />}
      </div>
    </div>
  );
}
