import { useEffect, useState } from "react";

// const API_BASE = "http://localhost/backend-online-enrollment/student";
export const getApiBase = () => {
  return "/backend-online-enrollment/student";
};

export default function DownloadConfirmation() {
  const studentId = localStorage.getItem("student_id");
  const [profile, setProfile] = useState(null);
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!studentId) {
      setError("Student session is missing. Please log in again.");
      setLoading(false);
      return;
    }

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [profileRes, timetableRes] = await Promise.all([
          fetch(`${getApiBase()}/get_student_profile.php?student_id=${studentId}`, { credentials: "include" }),
          fetch(`${getApiBase()}/get_student_timetable.php?student_id=${studentId}`, { credentials: "include" }),
        ]);

        const [profileData, timetableData] = await Promise.all([
          profileRes.json().catch(() => ({ success: false, message: "Profile response was invalid." })),
          timetableRes.json().catch(() => ({ success: false, message: "Timetable response was invalid." })),
        ]);

        if (!profileData.success) {
          setError(profileData.message ?? "Could not load student profile.");
        } else {
          setProfile(profileData.student);
        }

        if (!timetableData.success) {
          setError((prev) => prev || timetableData.message || "Could not load timetable.");
        } else {
          setTimetable(timetableData);
        }
      } catch (err) {
        console.error("Failed to load confirmation data:", err);
        setError("Could not reach the server. Please try again in a moment.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [studentId]);

  const handleDownload = () => {
    if (!profile || !timetable) {
      setError("Student profile and timetable are still loading. Please wait a moment.");
      return;
    }

    setDownloading(true);

    const fullName = [
      profile.first_name,
      profile.middle_name ? `${profile.middle_name[0]}.` : "",
      profile.last_name,
      profile.suffix,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    const timetableRows = timetable.timetable ?? [];
    const grouped = {};
    (timetableRows || []).forEach((row) => {
      if (!grouped[row.day]) grouped[row.day] = [];
      grouped[row.day].push(row);
    });

    const days = Object.keys(grouped);
    const scheduleHtml = days.length
      ? days
          .map((day) => {
            const rows = grouped[day]
              .slice()
              .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
            return `
              <tr>
                <td colspan="3" style="background:#DAF1DE; font-weight:bold; padding:8px;">${day}</td>
              </tr>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td style="padding:8px; border:1px solid #8EB69B;">${formatTime(row.start_time)} - ${formatTime(row.end_time)}</td>
                      <td style="padding:8px; border:1px solid #8EB69B;">${row.subject_name || "—"}</td>
                      <td style="padding:8px; border:1px solid #8EB69B;">${row.teacher_name || "—"}</td>
                    </tr>
                  `
                )
                .join("")}
            `;
          })
          .join("")
      : "<tr><td colspan='3' style='padding:8px;'>No timetable entries available.</td></tr>";

    const docHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <title>Enrollment Confirmation</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; color: #0B2B26; margin: 32px; }
          h1 { font-size: 24px; margin-bottom: 6px; }
          h2 { font-size: 18px; margin-top: 22px; margin-bottom: 10px; }
          .meta { margin: 10px 0 20px; line-height: 1.6; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #8EB69B; padding: 8px 10px; text-align: left; }
          th { background: #0B2B26; color: white; }
          .box { border: 1px solid #8EB69B; padding: 16px; border-radius: 10px; background: #F5FBF7; }
        </style>
      </head>
      <body>
        <h1>Enrollment Confirmation</h1>
        <div class="meta">
          <strong>Student Name:</strong> ${fullName}<br />
          <strong>LRN:</strong> ${profile.lrn || "—"}<br />
          <strong>Email:</strong> ${profile.gmail || "—"}<br />
          <strong>Grade Level:</strong> ${timetable.grade_level || "—"}<br />
          <strong>Section:</strong> ${timetable.section || "—"}<br />
          <strong>Strand:</strong> ${timetable.strand || "—"}<br />
          <strong>Enrollment Status:</strong> Confirmed / Approved
        </div>

        <div class="box">
          This document confirms that the student has been officially enrolled in the listed section and schedule for the current academic term.
        </div>

        <h2>Class Timetable</h2>
        <table>
          <thead>
            <tr>
              <th style="width:35%;">Time</th>
              <th style="width:35%;">Subject</th>
              <th style="width:30%;">Teacher</th>
            </tr>
          </thead>
          <tbody>
            ${scheduleHtml}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([docHtml], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fullName.replace(/\s+/g, "_")}_Enrollment_Confirmation.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloading(false);
  };

  return (
    <div className="px-4 sm:px-6 py-6 space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.15em] text-[#163832] mb-1">Student Portal</p>
        <h2 className="text-xl sm:text-2xl text-[#0B2B26]" style={{ fontFamily: "'Fraunces', serif" }}>
          Enrollment Confirmation
        </h2>
      </div>

      {error && (
        <div className="rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 text-[#B3492B] text-sm px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-[#235347]/15 p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 rounded bg-[#DAF1DE]/60 animate-pulse" style={{ width: `${50 + i * 10}%` }} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#235347]/15 p-5 sm:p-6">
          <div className="space-y-4">
            <div className="rounded-xl bg-[#0B2B26] p-4 text-white">
              <p className="text-xs text-[#DAF1DE] uppercase tracking-[0.12em]">Student record</p>
              <p className="mt-2 text-lg font-medium">
                {profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Student" : "Student"}
              </p>
              <p className="text-sm text-[#DAF1DE]">
                {profile?.lrn ? `LRN: ${profile.lrn}` : "LRN not available"}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-[#0B2B26]">
              <InfoRow label="Grade Level" value={timetable?.grade_level ? `Grade ${timetable.grade_level}` : "—"} />
              <InfoRow label="Section" value={timetable?.section || "—"} />
              <InfoRow label="Strand" value={timetable?.strand || "—"} />
              <InfoRow label="Status" value="Confirmed / Approved" />
            </div>

            <button
              type="button"
              onClick={handleDownload}
              disabled={loading || downloading || !profile || !timetable}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0B2B26] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#051F20] disabled:opacity-60 transition-colors"
            >
              <DownloadIcon />
              {downloading ? "Preparing document..." : "DL Confirmation"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-lg border border-[#235347]/15 bg-[#DAF1DE]/40 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[#0B2B26]/45">{label}</p>
      <p className="mt-1 text-sm font-medium text-[#0B2B26]">{value}</p>
    </div>
  );
}

function formatTime(value) {
  if (!value) return "—";
  const [h, m] = String(value).split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m || "00"} ${suffix}`;
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <path d="M10 3v8M10 12l-3-3M10 12l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 14.5v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
