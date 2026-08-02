import { useState, useEffect } from "react";

/**
 * TimetableManagement.jsx
 * Talks to: /staff/timetable/
 *  - GET  get_all_timetable.php
 *  - GET  get_section_timetable.php?section_id=X
 *  - POST create_timetable_settings.php
 *  - POST save_timetable_subjects.php
 *  - POST generate_timetable.php
 *  - POST update_timetable.php
 *  - POST delete_timetable.php
 */

const API_BASE = "http://localhost/backend-online-enrollment/staff";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TimetableManagement() {
  const [sections, setSections]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState(null);
  const [gradeFilter, setGradeFilter] = useState("All");

  const [setupSection, setSetupSection]   = useState(null); // section object → open setup wizard
  const [viewSection, setViewSection]     = useState(null); // section object → open view modal
  const [confirmDelete, setConfirmDelete] = useState(null); // section object
  const [toast, setToast]                 = useState(null);

  useEffect(() => { loadSections(); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function loadSections() {
    setLoading(true);
    setLoadError(null);
    try {
      const res  = await fetch(`${API_BASE}/get_all_timetable.php`, {
        credentials: "include",
      });
      const data = await res.json();
      data.success
        ? setSections(data.sections ?? [])
        : setLoadError("Could not load sections.");
    } catch { setLoadError("Could not reach the server."); }
    finally  { setLoading(false); }
  }

  async function handleDelete(section) {
    try {
      const body = new FormData();
      body.append("section_id", section.section_id);
      const res  = await fetch(`${API_BASE}/delete_timetable.php`, {
        method: "POST", credentials: "include", body,
      });
      const data = await res.json();
      if (data.success) {
        setToast({ type: "success", text: `Timetable for ${section.section_name} deleted.` });
        loadSections();
      } else {
        setToast({ type: "error", text: data.message ?? "Could not delete timetable." });
      }
    } catch { setToast({ type: "error", text: "Could not reach the server." }); }
    finally  { setConfirmDelete(null); }
  }

  const grades   = ["All", "7", "8", "9", "10", "11", "12"];
  const filtered = gradeFilter === "All"
    ? sections
    : sections.filter((s) => String(s.grade_level) === gradeFilter);

  return (
    <div className="px-4 sm:px-6 py-6 space-y-5">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.15em] text-[#8C6B12] mb-1">
          Staff Portal
        </p>
        <h2
          className="text-xl sm:text-2xl text-[#1B5E2C]"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          Timetable Management
        </h2>
        <p className="text-sm text-[#86A18A] mt-1">
          Set up and generate class schedules for each section.
        </p>
      </div>

      {/* Grade filter */}
      <div className="flex flex-wrap gap-2">
        {grades.map((g) => (
          <button
            key={g}
            onClick={() => setGradeFilter(g)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              gradeFilter === g
                ? "bg-[#1B5E2C] text-white"
                : "bg-white border border-[#CBD9C8] text-[#5B6478] hover:border-[#1B5E2C]"
            }`}
          >
            {g === "All" ? "All Grades" : `Grade ${g}`}
          </button>
        ))}
      </div>

      {loadError && (
        <div className="rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 text-[#B3492B] text-sm px-4 py-3">
          {loadError}
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border border-[#D9E8D5] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1B5E2C] text-[#FAFAF5] text-left">
              <th className="px-5 py-3 font-medium">Section</th>
              <th className="px-5 py-3 font-medium">Grade</th>
              <th className="px-5 py-3 font-medium">Strand</th>
              <th className="px-5 py-3 font-medium">Schedules</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i} className="border-t border-[#EFF4ED]">
                  {[...Array(6)].map((__, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-3.5 rounded bg-[#EFF4ED] animate-pulse" style={{ width: `${40 + j * 10}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-[#86A18A]">
                  No sections found.
                </td>
              </tr>
            ) : (
              filtered.map((sec) => (
                <tr key={sec.section_id} className="border-t border-[#EFF4ED] hover:bg-[#FAFAF5]">
                  <td className="px-5 py-3.5 text-[#1B5E2C] font-medium">
                    {sec.section_name}
                  </td>
                  <td className="px-5 py-3.5 text-[#5B6478]">
                    Grade {sec.grade_level}
                  </td>
                  <td className="px-5 py-3.5 text-[#5B6478]">
                    {sec.strand_name ?? <span className="text-[#CBD9C8]">JHS</span>}
                  </td>
                  <td className="px-5 py-3.5 text-[#5B6478]">
                    {sec.total_schedule} slot{sec.total_schedule !== 1 ? "s" : ""}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge generated={sec.generated} />
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-3">
                    {sec.generated ? (
                      <>
                        <button
                          onClick={() => setViewSection(sec)}
                          className="text-[#8C6B12] hover:text-[#6E5410] text-sm font-medium"
                        >
                          View
                        </button>
                        <button
                          onClick={() => setSetupSection({ ...sec, mode: "edit" })}
                          className="text-[#1B5E2C] hover:text-[#164A22] text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirmDelete(sec)}
                          className="text-[#B3492B] hover:text-[#963B22] text-sm font-medium"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setSetupSection({ ...sec, mode: "create" })}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#F2BE22] text-[#1B5E2C] text-xs font-medium px-3 py-1.5 hover:bg-[#e0ad1a] transition-colors"
                      >
                        + Setup Timetable
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#D9E8D5] p-4 space-y-2">
              <div className="h-4 w-1/2 rounded bg-[#EFF4ED] animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-[#EFF4ED] animate-pulse" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#D9E8D5] p-8 text-center text-[#86A18A] text-sm">
            No sections found.
          </div>
        ) : (
          filtered.map((sec) => (
            <div key={sec.section_id} className="bg-white rounded-xl border border-[#D9E8D5] p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="text-[#1B5E2C] font-medium">{sec.section_name}</p>
                  <p className="text-xs text-[#5B6478] mt-0.5">
                    Grade {sec.grade_level} · {sec.strand_name ?? "JHS"} · {sec.total_schedule} slots
                  </p>
                </div>
                <StatusBadge generated={sec.generated} />
              </div>
              <div className="flex gap-3 pt-3 border-t border-[#EFF4ED]">
                {sec.generated ? (
                  <>
                    <button onClick={() => setViewSection(sec)} className="text-[#8C6B12] text-sm font-medium">View</button>
                    <button onClick={() => setSetupSection({ ...sec, mode: "edit" })} className="text-[#1B5E2C] text-sm font-medium">Edit</button>
                    <button onClick={() => setConfirmDelete(sec)} className="text-[#B3492B] text-sm font-medium">Delete</button>
                  </>
                ) : (
                  <button
                    onClick={() => setSetupSection({ ...sec, mode: "create" })}
                    className="text-sm font-medium text-[#8C6B12]"
                  >
                    + Setup Timetable
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {setupSection && (
        <TimetableWizard
          section={setupSection}
          apiBase={API_BASE}
          onClose={() => setSetupSection(null)}
          onDone={(msg) => {
            setSetupSection(null);
            setToast({ type: "success", text: msg });
            loadSections();
          }}
          onError={(msg) => setToast({ type: "error", text: msg })}
        />
      )}

      {viewSection && (
        <ViewTimetableModal
          section={viewSection}
          apiBase={API_BASE}
          onClose={() => setViewSection(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete timetable?"
          message={`This will remove all generated schedules for ${confirmDelete.section_name}. You can regenerate it later.`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}

      {toast && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm shadow-lg z-50 whitespace-nowrap ${
          toast.type === "success" ? "bg-[#1B5E2C] text-white" : "bg-[#B3492B] text-white"
        }`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   3-STEP SETUP WIZARD
   Step 1: Timetable Settings
   Step 2: Add Subjects
   Step 3: Generate
══════════════════════════════════════════════ */
function TimetableWizard({ section, apiBase, onClose, onDone, onError }) {
  const isEdit   = section.mode === "edit";
  const [step, setStep]             = useState(1);
  const [settingId, setSettingId]   = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [settings, setSettings] = useState({
    schedule_type:  "Whole Day",
    class_start:    "07:00",
    class_end:      "17:00",
    break_enabled:  "Yes",
    break_start:    "12:00",
    break_duration: "60",
    total_subjects: "8",
    selected_days:  ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  });

  const [subjects, setSubjects] = useState(
    Array.from({ length: Number(settings.total_subjects) || 8 }, () => "")
  );

  const [settingsErrors, setSettingsErrors] = useState({});

  function toggleDay(day) {
    setSettings((prev) => ({
      ...prev,
      selected_days: prev.selected_days.includes(day)
        ? prev.selected_days.filter((d) => d !== day)
        : [...prev.selected_days, day],
    }));
  }

  function handleSettingsChange(e) {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
    if (name === "total_subjects") {
      const n = Math.max(1, Math.min(20, parseInt(value) || 1));
      setSubjects(Array.from({ length: n }, (_, i) => subjects[i] ?? ""));
    }
    setSettingsErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validateSettings() {
    const errs = {};
    if (!settings.class_start) errs.class_start = "Required.";
    if (!settings.class_end)   errs.class_end   = "Required.";
    if (settings.class_start >= settings.class_end) errs.class_end = "End must be after start.";
    if (settings.selected_days.length === 0) errs.selected_days = "Select at least one day.";
    if (!settings.total_subjects || parseInt(settings.total_subjects) < 1)
      errs.total_subjects = "At least 1 subject required.";
    if (settings.break_enabled === "Yes" && !settings.break_start)
      errs.break_start = "Enter break start time.";
    setSettingsErrors(errs);
    return Object.keys(errs).length === 0;
  }

  /* Step 1 → save settings */
  async function handleSaveSettings() {
    if (!validateSettings()) return;
    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("section_id",    section.section_id);
      body.append("schedule_type", settings.schedule_type);
      body.append("class_start",   settings.class_start);
      body.append("class_end",     settings.class_end);
      body.append("break_enabled", settings.break_enabled);
      body.append("break_start",   settings.break_start);
      body.append("break_duration",settings.break_duration);
      body.append("total_subjects",settings.total_subjects);
      body.append("selected_days", settings.selected_days.join(","));

      const url = isEdit
        ? `${apiBase}/update_timetable.php`
        : `${apiBase}/create_timetable_settings.php`;

      // For edit mode we need setting_id
      if (isEdit && settingId) body.append("setting_id", settingId);

      const res  = await fetch(url, { method: "POST", credentials: "include", body });
      const data = await res.json();

      if (!data.success) {
        onError(data.message ?? "Could not save settings.");
        return;
      }
      setSettingId(data.setting_id ?? settingId);
      setStep(2);
    } catch { onError("Could not reach the server."); }
    finally  { setSubmitting(false); }
  }

  /* Step 2 → save subjects */
  async function handleSaveSubjects() {
    const filled = subjects.filter((s) => s.trim() !== "");
    if (filled.length === 0) { onError("Enter at least one subject."); return; }
    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("setting_id", settingId);
      filled.forEach((s) => body.append("subjects[]", s.trim()));
      const res  = await fetch(`${apiBase}/save_timetable_subjects.php`, {
        method: "POST", credentials: "include", body,
      });
      const data = await res.json();
      data.success ? setStep(3) : onError(data.message ?? "Could not save subjects.");
    } catch { onError("Could not reach the server."); }
    finally  { setSubmitting(false); }
  }

  /* Step 3 → generate */
  async function handleGenerate() {
    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("setting_id", settingId);
      const res  = await fetch(`${apiBase}/generate_timetable.php`, {
        method: "POST", credentials: "include", body,
      });
      const data = await res.json();
      if (data.success) {
        onDone(
          `Timetable generated for ${section.section_name} — ${data.total_schedule_created} slots created.`
        );
      } else {
        onError(data.message ?? "Could not generate timetable.");
      }
    } catch { onError("Could not reach the server."); }
    finally  { setSubmitting(false); }
  }

  const STEPS = ["Settings", "Subjects", "Generate"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-xl overflow-hidden">

        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-[#D9E8D5] flex items-center justify-between">
          <div>
            <h2 className="text-lg text-[#1B5E2C]" style={{ fontFamily: "'Fraunces', serif" }}>
              {isEdit ? "Edit" : "Setup"} Timetable — {section.section_name}
            </h2>
            <p className="text-xs text-[#86A18A] mt-0.5">Grade {section.grade_level}</p>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-lg border border-[#D9E8D5] flex items-center justify-center text-[#86A18A] hover:text-[#1B5E2C] text-sm">✕</button>
        </div>

        {/* Step indicators */}
        <div className="shrink-0 flex items-center gap-0 px-6 py-3 border-b border-[#D9E8D5]">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done    = step > n;
            const active  = step === n;
            return (
              <div key={label} className="flex items-center gap-0 flex-1">
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    done   ? "bg-[#1B5E2C] text-white"
                    : active ? "bg-[#F2BE22] text-[#1B5E2C]"
                    : "bg-[#EFF4ED] text-[#86A18A]"
                  }`}>
                    {done ? "✓" : n}
                  </div>
                  <span className={`text-xs font-medium ${active ? "text-[#1B5E2C]" : "text-[#86A18A]"}`}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-2 ${step > n ? "bg-[#1B5E2C]" : "bg-[#D9E8D5]"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── STEP 1: Settings ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#1B5E2C] mb-1.5">Schedule Type</label>
                  <select name="schedule_type" value={settings.schedule_type} onChange={handleSettingsChange} className={inputCls()}>
                    <option>Whole Day</option>
                    <option>Half Day</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1B5E2C] mb-1.5">Total Subjects</label>
                  <input
                    name="total_subjects" type="number" min="1" max="20"
                    value={settings.total_subjects} onChange={handleSettingsChange}
                    className={inputCls(settingsErrors.total_subjects)}
                  />
                  {settingsErrors.total_subjects && <Err msg={settingsErrors.total_subjects} />}
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1B5E2C] mb-1.5">Class Start</label>
                  <input name="class_start" type="time" value={settings.class_start} onChange={handleSettingsChange} className={inputCls(settingsErrors.class_start)} />
                  {settingsErrors.class_start && <Err msg={settingsErrors.class_start} />}
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1B5E2C] mb-1.5">Class End</label>
                  <input name="class_end" type="time" value={settings.class_end} onChange={handleSettingsChange} className={inputCls(settingsErrors.class_end)} />
                  {settingsErrors.class_end && <Err msg={settingsErrors.class_end} />}
                </div>
              </div>

              {/* Break */}
              <div className="rounded-xl border border-[#D9E8D5] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[#1B5E2C]">Break / Lunch</p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => setSettings((p) => ({ ...p, break_enabled: p.break_enabled === "Yes" ? "No" : "Yes" }))}
                      className={`relative h-5 w-9 rounded-full transition-colors ${settings.break_enabled === "Yes" ? "bg-[#1B5E2C]" : "bg-[#CBD9C8]"}`}
                    >
                      <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${settings.break_enabled === "Yes" ? "translate-x-4" : "translate-x-0.5"}`} />
                    </div>
                    <span className="text-xs text-[#5B6478]">{settings.break_enabled === "Yes" ? "Enabled" : "Disabled"}</span>
                  </label>
                </div>
                {settings.break_enabled === "Yes" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#1B5E2C] mb-1.5">Break Start</label>
                      <input name="break_start" type="time" value={settings.break_start} onChange={handleSettingsChange} className={inputCls(settingsErrors.break_start)} />
                      {settingsErrors.break_start && <Err msg={settingsErrors.break_start} />}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#1B5E2C] mb-1.5">Duration (mins)</label>
                      <input name="break_duration" type="number" min="5" max="120" value={settings.break_duration} onChange={handleSettingsChange} className={inputCls()} />
                    </div>
                  </div>
                )}
              </div>

              {/* Days */}
              <div>
                <label className="block text-xs font-medium text-[#1B5E2C] mb-2">School Days</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => {
                    const on = settings.selected_days.includes(day);
                    return (
                      <button
                        key={day} type="button" onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${on ? "bg-[#1B5E2C] text-white" : "bg-white border border-[#CBD9C8] text-[#5B6478]"}`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
                {settingsErrors.selected_days && <Err msg={settingsErrors.selected_days} />}
              </div>
            </div>
          )}

          {/* ── STEP 2: Subjects ── */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-[#5B6478]">
                Enter {settings.total_subjects} subject{settings.total_subjects !== "1" ? "s" : ""}. The timetable will rotate them across sections.
              </p>
              {subjects.map((subj, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-[#86A18A] w-6 text-right shrink-0">{i + 1}.</span>
                  <input
                    value={subj}
                    onChange={(e) => {
                      const next = [...subjects];
                      next[i] = e.target.value;
                      setSubjects(next);
                    }}
                    placeholder={`Subject ${i + 1}`}
                    className={inputCls()}
                  />
                </div>
              ))}
            </div>
          )}

          {/* ── STEP 3: Generate ── */}
          {step === 3 && (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-[#F2BE22]/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="h-8 w-8 text-[#8C6B12]" fill="none">
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-[#1B5E2C]" style={{ fontFamily: "'Fraunces', serif" }}>
                  Ready to generate
                </h3>
                <p className="text-sm text-[#5B6478] mt-1 max-w-xs mx-auto">
                  The system will auto-assign subjects across days and rotate them across related sections with the same grade level.
                </p>
              </div>
              <div className="bg-[#FAFAF5] rounded-xl border border-[#D9E8D5] p-4 text-left text-sm space-y-1.5">
                <p className="text-[#86A18A] text-xs uppercase tracking-wide mb-2">Summary</p>
                <p className="text-[#5B6478]"><span className="font-medium text-[#1B5E2C]">Section:</span> {section.section_name} (Grade {section.grade_level})</p>
                <p className="text-[#5B6478]"><span className="font-medium text-[#1B5E2C]">Schedule:</span> {settings.schedule_type} · {settings.class_start} – {settings.class_end}</p>
                <p className="text-[#5B6478]"><span className="font-medium text-[#1B5E2C]">Days:</span> {settings.selected_days.join(", ")}</p>
                <p className="text-[#5B6478]"><span className="font-medium text-[#1B5E2C]">Subjects:</span> {subjects.filter(Boolean).length} subjects</p>
                <p className="text-[#5B6478]"><span className="font-medium text-[#1B5E2C]">Break:</span> {settings.break_enabled === "Yes" ? `${settings.break_start} (${settings.break_duration} mins)` : "None"}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-[#D9E8D5] flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={submitting}
              className="flex-1 rounded-lg border border-[#CBD9C8] text-[#5B6478] text-sm font-medium py-2.5 hover:bg-[#FAFAF5] transition-colors disabled:opacity-60"
            >
              Back
            </button>
          )}
          {step === 1 && (
            <button onClick={onClose} className="flex-1 rounded-lg border border-[#CBD9C8] text-[#5B6478] text-sm font-medium py-2.5 hover:bg-[#FAFAF5]">
              Cancel
            </button>
          )}
          <button
            onClick={
              step === 1 ? handleSaveSettings
              : step === 2 ? handleSaveSubjects
              : handleGenerate
            }
            disabled={submitting}
            className="flex-1 rounded-lg bg-[#1B5E2C] text-white text-sm font-medium py-2.5 hover:bg-[#164A22] disabled:opacity-60 transition-colors"
          >
            {submitting ? "Saving…"
              : step === 1 ? "Next → Add Subjects"
              : step === 2 ? "Next → Generate"
              : "Generate Timetable"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   VIEW TIMETABLE MODAL
══════════════════════════════════════════════ */
function ViewTimetableModal({ section, apiBase, onClose }) {
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activeDay, setActiveDay] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(
          `${apiBase}/get_section_timetable.php?section_id=${section.section_id}`,
          { credentials: "include" }
        );
        const data = await res.json();
        if (data.success) {
          setTimetable(data.timetable ?? []);
          const days = [...new Set((data.timetable ?? []).map((r) => r.day))];
          if (days.length > 0) setActiveDay(days[0]);
        } else { setError("Could not load timetable."); }
      } catch { setError("Could not reach the server."); }
      finally  { setLoading(false); }
    }
    load();
  }, [section.section_id]);

  const days         = [...new Set(timetable.map((r) => r.day))];
  const daySchedule  = timetable.filter((r) => r.day === activeDay);

  function fmt(t) {
    if (!t) return "—";
    const [h, m] = t.split(":");
    const hh = parseInt(h);
    const ampm = hh >= 12 ? "PM" : "AM";
    return `${hh % 12 || 12}:${m} ${ampm}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl overflow-hidden">

        <div className="shrink-0 px-6 py-4 border-b border-[#D9E8D5] flex items-center justify-between">
          <div>
            <h2 className="text-lg text-[#1B5E2C]" style={{ fontFamily: "'Fraunces', serif" }}>
              {section.section_name} Timetable
            </h2>
            <p className="text-xs text-[#86A18A]">Grade {section.grade_level} · {section.strand_name ?? "JHS"}</p>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-lg border border-[#D9E8D5] flex items-center justify-center text-[#86A18A] hover:text-[#1B5E2C] text-sm">✕</button>
        </div>

        {/* Day tabs */}
        {!loading && days.length > 0 && (
          <div className="shrink-0 flex gap-1 px-4 py-2 border-b border-[#D9E8D5] overflow-x-auto">
            {days.map((day) => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  activeDay === day
                    ? "bg-[#1B5E2C] text-white"
                    : "text-[#86A18A] hover:text-[#1B5E2C]"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-[#EFF4ED] animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <p className="text-[#B3492B] text-sm">{error}</p>
          ) : daySchedule.length === 0 ? (
            <p className="text-[#86A18A] text-sm text-center py-8">No schedule for this day.</p>
          ) : (
            <div className="space-y-2">
              {daySchedule.map((row, i) => (
                <div key={row.timetable_id ?? i} className="flex items-center gap-3 bg-[#FAFAF5] rounded-xl border border-[#D9E8D5] px-4 py-3">
                  <div className="w-24 shrink-0 text-xs text-[#86A18A] tabular-nums">
                    {fmt(row.start_time)} – {fmt(row.end_time)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1B5E2C] truncate">{row.subject_name}</p>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-[#F2BE22] shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Shared small components ─────────────────────────────────── */
function StatusBadge({ generated }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
      generated
        ? "bg-[#1B5E2C]/10 text-[#1B5E2C]"
        : "bg-[#EFF4ED] text-[#86A18A]"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${generated ? "bg-[#1B5E2C]" : "bg-[#CBD9C8]"}`} />
      {generated ? "Generated" : "Not set up"}
    </span>
  );
}

function ConfirmModal({ title, message, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl text-center">
        <h2 className="text-lg text-[#1B5E2C] mb-2" style={{ fontFamily: "'Fraunces', serif" }}>{title}</h2>
        <p className="text-sm text-[#5B6478] mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-lg border border-[#CBD9C8] text-[#5B6478] text-sm font-medium py-2.5 hover:bg-[#FAFAF5]">Cancel</button>
          <button onClick={onConfirm} className="flex-1 rounded-lg bg-[#B3492B] text-white text-sm font-medium py-2.5 hover:bg-[#963B22]">Delete</button>
        </div>
      </div>
    </div>
  );
}

const inputCls = (err) =>
  `w-full rounded-lg border px-3 py-2 text-sm text-[#1B5E2C] placeholder:text-[#A8AEBC] bg-white focus:outline-none focus:ring-2 focus:ring-[#F2BE22] ${
    err ? "border-[#B3492B]" : "border-[#CBD9C8]"
  }`;

function Err({ msg }) {
  return <p className="mt-1 text-xs text-[#B3492B]">{msg}</p>;
}
