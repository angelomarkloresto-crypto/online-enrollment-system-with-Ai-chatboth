import { useState, useEffect } from "react";



const TIMETABLE_BASE = "/backend-online-enrollment/student";
const STUDENT_BASE   = "/backend-online-enrollment/student";

const DAY_ORDER = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function fmt12(time) {
  if (!time) return "—";
  const [h, m] = time.split(":");
  const hh   = parseInt(h);
  const ampm = hh >= 12 ? "PM" : "AM";
  return `${hh % 12 || 12}:${m} ${ampm}`;
}

export default function StudentTimetable() {
  const studentId = localStorage.getItem("student_id");

  const [activeTab, setActiveTab] = useState("timetable");

  /* timetable state */
  const [timetable, setTimetable]       = useState(null); // full response
  const [ttLoading, setTtLoading]       = useState(true);
  const [ttError, setTtError]           = useState(null);
  const [activeDay, setActiveDay]       = useState(null);

  /* subjects state */
  const [subjects, setSubjects]         = useState(null);
  const [subLoading, setSubLoading]     = useState(true);
  const [subError, setSubError]         = useState(null);

  /* QR state */
  const [qrData, setQrData]             = useState(null);
  const [qrLoading, setQrLoading]       = useState(true);
  const [qrError, setQrError]           = useState(null);

  useEffect(() => {
    if (!studentId) return;
    loadTimetable();
    loadSubjects();
    loadQr();
  }, []);

  async function loadTimetable() {
    setTtLoading(true); setTtError(null);
    try {
      const res  = await fetch(
        `${TIMETABLE_BASE}/get_student_timetable.php?student_id=${studentId}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (data.success) {
        setTimetable(data);
        const days = [...new Set((data.timetable ?? []).map((r) => r.day))]
          .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
        if (days.length > 0) setActiveDay(days[0]);
      } else {
        setTtError(data.message ?? "Could not load timetable.");
      }
    } catch { setTtError("Could not reach the server."); }
    finally  { setTtLoading(false); }
  }

  async function loadSubjects() {
    setSubLoading(true); setSubError(null);
    try {
      const res  = await fetch(
        `${TIMETABLE_BASE}/get_student_subjects.php?student_id=${studentId}`,
        { credentials: "include" }
      );
      const data = await res.json();
      data.success ? setSubjects(data) : setSubError(data.message ?? "Could not load subjects.");
    } catch { setSubError("Could not reach the server."); }
    finally  { setSubLoading(false); }
  }

  async function loadQr() {
    setQrLoading(true); setQrError(null);
    try {
      const res  = await fetch(
        `${STUDENT_BASE}/get_section_qr.php?student_id=${studentId}`,
        { credentials: "include" }
      );
      const data = await res.json();
      data.success ? setQrData(data.data) : setQrError(data.message ?? "No QR code available.");
    } catch { setQrError("Could not reach the server."); }
    finally  { setQrLoading(false); }
  }

  /* derived */
  const days        = timetable
    ? [...new Set((timetable.timetable ?? []).map((r) => r.day))]
        .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
    : [];
  const daySchedule = (timetable?.timetable ?? []).filter((r) => r.day === activeDay);

  const TABS = [
    { key: "timetable", label: "Timetable" },
    { key: "subjects",  label: "Subjects"  },
    { key: "qr",        label: "Adviser QR" },
  ];

  return (
    <div className="px-4 sm:px-6 py-6 space-y-5">

      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.15em] text-[#163832] mb-1">
          Student Portal
        </p>
        <h2
          className="text-xl sm:text-2xl text-[#0B2B26]"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          My Timetable
        </h2>
      </div>

      {/* Section info card */}
      {timetable && !ttError && (
        <div className="bg-[#0B2B26] rounded-2xl p-4 sm:p-5 flex flex-wrap gap-4 text-white">
          <InfoChip label="Grade Level" value={`Grade ${timetable.grade_level}`} />
          {timetable.strand && <InfoChip label="Strand" value={timetable.strand} />}
          <InfoChip label="Section"     value={timetable.section} />
          <InfoChip label="Total Subjects" value={`${timetable.total_subjects} subjects`} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#235347]/15">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-[#0B2B26] text-[#0B2B26]"
                : "border-transparent text-[#0B2B26]/45 hover:text-[#0B2B26]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: TIMETABLE ── */}
      {activeTab === "timetable" && (
        <div className="space-y-4">
          {ttError ? (
            <NotApproved message={ttError} />
          ) : ttLoading ? (
            <TimetableSkeleton />
          ) : (
            <>
              {/* Day tabs */}
              <div className="flex gap-1.5 flex-wrap">
                {days.map((day) => (
                  <button
                    key={day}
                    onClick={() => setActiveDay(day)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeDay === day
                        ? "bg-[#0B2B26] text-white"
                        : "bg-white border border-[#235347]/25 text-[#0B2B26]/70 hover:border-[#0B2B26]"
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>

              {/* Schedule list */}
              {daySchedule.length === 0 ? (
                <p className="text-sm text-[#0B2B26]/45 text-center py-8">
                  No classes on {activeDay}.
                </p>
              ) : (
                <div className="space-y-2">
                  {daySchedule.map((row, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-xl border border-[#235347]/15 flex items-center gap-3 sm:gap-4 px-4 py-3"
                    >
                      {/* Time block */}
                      <div className="shrink-0 w-24 sm:w-28">
                        <p className="text-xs font-medium text-[#0B2B26] tabular-nums">
                          {fmt12(row.start_time)}
                        </p>
                        <p className="text-xs text-[#0B2B26]/45 tabular-nums">
                          {fmt12(row.end_time)}
                        </p>
                      </div>

                      {/* Divider dot */}
                      <div className="h-8 w-px bg-[#235347]/15 shrink-0" />

                      {/* Subject */}
                      <div className="flex-1 min-w-0 flex items-center gap-2.5">
                        <div className="h-2 w-2 rounded-full bg-[#8EB69B] shrink-0" />
                        <p className="text-sm font-medium text-[#0B2B26] truncate">
                          {row.subject_name}
                        </p>
                      </div>

                      {/* Duration */}
                      <div className="shrink-0 text-right hidden sm:block">
                        <p className="text-xs text-[#0B2B26]/45">
                          {getDuration(row.start_time, row.end_time)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Full week summary — desktop table */}
              <div className="hidden md:block mt-4">
                <p className="text-xs uppercase tracking-[0.15em] text-[#0B2B26]/45 mb-3">
                  Full Week Overview
                </p>
                <div className="bg-white rounded-2xl border border-[#235347]/15 overflow-x-auto">
                  <table className="w-full text-xs min-w-[600px]">
                    <thead>
                      <tr className="bg-[#0B2B26] text-white">
                        <th className="px-4 py-2.5 font-medium text-left w-28">Time</th>
                        {days.map((d) => (
                          <th key={d} className="px-3 py-2.5 font-medium">{d.slice(0,3)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {buildWeekGrid(timetable.timetable ?? [], days).map((row, ri) => (
                        <tr key={ri} className="border-t border-[#DAF1DE]/60">
                          <td className="px-4 py-2.5 text-[#0B2B26]/45 tabular-nums whitespace-nowrap">
                            {fmt12(row.time)}
                          </td>
                          {days.map((d) => (
                            <td key={d} className="px-3 py-2.5 text-center">
                              {row.cells[d] ? (
                                <span className="inline-block bg-[#0B2B26]/8 text-[#0B2B26] rounded px-2 py-1 leading-tight">
                                  {row.cells[d]}
                                </span>
                              ) : (
                                <span className="text-[#235347]/25">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: SUBJECTS ── */}
      {activeTab === "subjects" && (
        <div className="space-y-3">
          {subError ? (
            <NotApproved message={subError} />
          ) : subLoading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-[#DAF1DE]/60 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <p className="text-sm text-[#0B2B26]/45">
                <span className="font-medium text-[#0B2B26]">{subjects?.total_subjects ?? 0}</span> subjects
                {timetable?.section ? ` in ${timetable.section}` : ""}
              </p>
              <div className="space-y-2">
                {(subjects?.subjects ?? []).map((subj, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-[#235347]/15 flex items-center gap-3 px-4 py-3"
                  >
                    <div className="h-8 w-8 rounded-lg bg-[#8EB69B]/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-[#163832]">{i + 1}</span>
                    </div>
                    <p className="text-sm font-medium text-[#0B2B26]">{subj}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: ADVISER QR ── */}
      {activeTab === "qr" && (
        <div className="max-w-xs mx-auto space-y-4">
          {qrError ? (
            <NotApproved message={qrError} />
          ) : qrLoading ? (
            <div className="space-y-3">
              <div className="h-64 rounded-2xl bg-[#DAF1DE]/60 animate-pulse" />
              <div className="h-4 w-1/2 mx-auto rounded bg-[#DAF1DE]/60 animate-pulse" />
            </div>
          ) : qrData ? (
            <div className="text-center">
              <div className="bg-white rounded-2xl border border-[#235347]/15 p-5 inline-block">
                <img
                  src={`/backend-online-enrollment/uploads/${qrData.qr_code}`}
                  alt="Adviser QR Code"
                  className="h-52 w-52 object-contain mx-auto"
                />
              </div>
              <div className="mt-4 space-y-1">
                <p className="text-base font-medium text-[#0B2B26]">
                  {qrData.adviser_name ?? "Class Adviser"}
                </p>
                <p className="text-sm text-[#0B2B26]/45">
                  {qrData.section_name} · Grade {qrData.grade_level}
                </p>
                {qrData.updated_at && (
                  <p className="text-xs text-[#235347]/25">
                    Updated {new Date(qrData.updated_at).toLocaleDateString("en-PH", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </p>
                )}
              </div>
              <a
                href={`/backend-online-enrollment/uploads/${qrData.qr_code}`}
                download
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#235347]/15 text-sm text-[#0B2B26] px-4 py-2 hover:bg-[#DAF1DE]/40 transition-colors"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
                  <path d="M10 4v8M10 12l-3-3M10 12l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Save QR Code
              </a>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */
function getDuration(start, end) {
  if (!start || !end) return "";
  const s = start.split(":").reduce((a, b, i) => a + (i === 0 ? Number(b) * 60 : Number(b)), 0);
  const e = end.split(":").reduce((a, b, i) => a + (i === 0 ? Number(b) * 60 : Number(b)), 0);
  const diff = e - s;
  if (diff <= 0) return "";
  return diff >= 60 ? `${Math.floor(diff / 60)}h ${diff % 60 > 0 ? diff % 60 + "m" : ""}`.trim()
    : `${diff}m`;
}

function buildWeekGrid(rows, days) {
  const times = [...new Set(rows.map((r) => r.start_time))].sort();
  return times.map((time) => {
    const cells = {};
    days.forEach((day) => {
      const match = rows.find((r) => r.day === day && r.start_time === time);
      cells[day] = match?.subject_name ?? null;
    });
    return { time, cells };
  });
}

function InfoChip({ label, value }) {
  return (
    <div>
      <p className="text-xs text-[#DAF1DE]">{label}</p>
      <p className="text-sm font-medium text-white">{value ?? "—"}</p>
    </div>
  );
}

function NotApproved({ message }) {
  return (
    <div className="bg-white rounded-2xl border border-[#235347]/15 p-8 text-center">
      <div className="h-14 w-14 rounded-full bg-[#8EB69B]/20 flex items-center justify-center mx-auto mb-4">
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#163832]" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <p className="text-sm font-medium text-[#0B2B26] mb-1">Not Available</p>
      <p className="text-sm text-[#0B2B26]/45 max-w-xs mx-auto">{message}</p>
    </div>
  );
}

function TimetableSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-[#235347]/15 flex items-center gap-4 px-4 py-3">
          <div className="w-24 space-y-1.5">
            <div className="h-3 rounded bg-[#DAF1DE]/60 animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-[#DAF1DE]/60 animate-pulse" />
          </div>
          <div className="h-8 w-px bg-[#235347]/15" />
          <div className="flex-1 h-3 rounded bg-[#DAF1DE]/60 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
