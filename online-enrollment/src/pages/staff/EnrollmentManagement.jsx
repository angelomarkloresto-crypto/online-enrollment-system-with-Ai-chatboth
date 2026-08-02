import { useState, useEffect } from "react";

/**
 * EnrollmentManagement.jsx
 * Talks to:
 *  - GET  /staff/get_pending_enrollments.php
 *  - GET  /staff/get_student_details.php?enrollment_id=X
 *  - POST /staff/approve_enrollment.php  { enrollment_id }
 *  - POST /staff/reject_enrollment.php   { enrollment_id }
 *
 * Backend bugs to fix:
 *  - approve_enrollment.php: "applicatio/json" typo, "SELCT" typo,
 *    incomplete SELECT/UPDATE queries, missing bind values. Needs full rewrite.
 *  - reject_enrollment.php: queries table "enrollment" (missing s),
 *    returns "success" => false even on success — fix to true.
 */

const API_BASE = "http://localhost/backend-online-enrollment/staff";

export default function EnrollmentManagement() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [loadError, setLoadError]     = useState(null);

  const [search, setSearch]           = useState("");
  const [levelFilter, setLevelFilter] = useState("All");

  const [selectedId, setSelectedId]   = useState(null); // enrollment_id for detail modal
  const [toast, setToast]             = useState(null);  // { type, text }

  useEffect(() => { loadEnrollments(); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function loadEnrollments() {
    setLoading(true);
    setLoadError(null);
    try {
      const res  = await fetch(`${API_BASE}/get_pending_enrollments.php`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setEnrollments(data.enrollments ?? []);
      } else {
        setLoadError("Could not load enrollments.");
      }
    } catch {
      setLoadError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  function handleActionDone(enrollmentId, action) {
    // Remove from list immediately after approve/reject
    setEnrollments((prev) => prev.filter((e) => e.enrollment_id !== enrollmentId));
    setSelectedId(null);
    setToast({
      type: "success",
      text: action === "approve"
        ? "Enrollment approved and section assigned."
        : "Enrollment rejected.",
    });
  }

  function handleActionError(msg) {
    setToast({ type: "error", text: msg });
  }

  // Filters
  const filtered = enrollments.filter((e) => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || String(e.student_id).includes(q) ||
      e.grade_level?.toString().includes(q) ||
      e.student_type?.toLowerCase().includes(q);
    const matchLevel =
      levelFilter === "All" ||
      (levelFilter === "JHS" && e.level_type === "JHS") ||
      (levelFilter === "SHS" && e.level_type === "SHS");
    return matchSearch && matchLevel;
  });

  return (
    <div className="px-4 sm:px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-[#8C6B12] mb-1">
            Staff Portal
          </p>
          <h2
            className="text-xl sm:text-2xl text-[#1B5E2C]"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            Pending Enrollments
          </h2>
        </div>
        <button
          onClick={loadEnrollments}
          className="inline-flex items-center gap-2 text-sm text-[#1B5E2C] border border-[#D9E8D5] rounded-lg px-3 py-2 hover:bg-[#D9E8D5]/40 transition-colors"
        >
          <RefreshIcon /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by student ID or type…"
          className="w-full sm:w-64 rounded-lg border border-[#CBD9C8] px-4 py-2.5 text-sm text-[#1B5E2C] placeholder:text-[#86A18A] bg-white focus:outline-none focus:ring-2 focus:ring-[#F2BE22]"
        />
        <div className="flex gap-2">
          {["All", "JHS", "SHS"].map((f) => (
            <button
              key={f}
              onClick={() => setLevelFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                levelFilter === f
                  ? "bg-[#1B5E2C] text-white"
                  : "bg-white border border-[#CBD9C8] text-[#5B6478] hover:border-[#1B5E2C]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 text-[#B3492B] text-sm px-4 py-3">
          {loadError}
        </div>
      )}

      {/* Count badge */}
      {!loading && !loadError && (
        <p className="text-sm text-[#86A18A]">
          Showing <span className="font-medium text-[#1B5E2C]">{filtered.length}</span> pending{" "}
          {filtered.length === 1 ? "application" : "applications"}
        </p>
      )}

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border border-[#D9E8D5] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1B5E2C] text-[#FAFAF5] text-left">
              <th className="px-5 py-3 font-medium">Student ID</th>
              <th className="px-5 py-3 font-medium">Grade Level</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Level</th>
              <th className="px-5 py-3 font-medium">Average</th>
              <th className="px-5 py-3 font-medium">OCR Status</th>
              <th className="px-5 py-3 font-medium">Submitted</th>
              <th className="px-5 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-t border-[#EFF4ED]">
                  {[...Array(8)].map((__, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-3.5 rounded bg-[#EFF4ED] animate-pulse" style={{ width: `${50 + (j * 10) % 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-[#86A18A]">
                  No pending enrollments found.
                </td>
              </tr>
            ) : (
              filtered.map((e) => (
                <tr
                  key={e.enrollment_id}
                  className="border-t border-[#EFF4ED] hover:bg-[#FAFAF5] transition-colors"
                >
                  <td className="px-5 py-3.5 text-[#1B5E2C] font-medium">
                    {e.student_id}
                  </td>
                  <td className="px-5 py-3.5 text-[#5B6478]">
                    Grade {e.grade_level}
                  </td>
                  <td className="px-5 py-3.5 text-[#5B6478]">
                    {e.student_type ?? "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <LevelBadge level={e.level_type} />
                  </td>
                  <td className="px-5 py-3.5 text-[#5B6478]">
                    {e.average_grade ?? e.ocr_average ?? "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <OcrBadge status={e.ocr_status} />
                  </td>
                  <td className="px-5 py-3.5 text-[#86A18A] text-xs">
                    {e.submitted_at
                      ? new Date(e.submitted_at).toLocaleDateString("en-PH", {
                          month: "short", day: "numeric", year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setSelectedId(e.enrollment_id)}
                      className="text-[#8C6B12] hover:text-[#6E5410] text-sm font-medium"
                    >
                      Review →
                    </button>
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
            No pending enrollments found.
          </div>
        ) : (
          filtered.map((e) => (
            <div key={e.enrollment_id} className="bg-white rounded-xl border border-[#D9E8D5] p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="text-[#1B5E2C] font-medium text-sm">
                    Student ID: {e.student_id}
                  </p>
                  <p className="text-[#5B6478] text-xs mt-0.5">
                    Grade {e.grade_level} · {e.student_type ?? "—"}
                  </p>
                </div>
                <LevelBadge level={e.level_type} />
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-[#EFF4ED]">
                <div className="flex items-center gap-3">
                  <OcrBadge status={e.ocr_status} />
                  <span className="text-xs text-[#86A18A]">
                    Avg: {e.average_grade ?? e.ocr_average ?? "—"}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedId(e.enrollment_id)}
                  className="text-[#8C6B12] text-sm font-medium"
                >
                  Review →
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail modal */}
      {selectedId !== null && (
        <StudentDetailModal
          enrollmentId={selectedId}
          apiBase={API_BASE}
          onClose={() => setSelectedId(null)}
          onApprove={(id) => handleActionDone(id, "approve")}
          onReject={(id)  => handleActionDone(id, "reject")}
          onError={handleActionError}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm shadow-lg z-50 whitespace-nowrap ${
            toast.type === "success" ? "bg-[#1B5E2C] text-white" : "bg-[#B3492B] text-white"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

/* ── Student Detail Modal ──────────────────────────────────── */
function StudentDetailModal({ enrollmentId, apiBase, onClose, onApprove, onReject, onError }) {
  const [student, setStudent]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [loadErr, setLoadErr]   = useState(null);
  const [acting, setActing]     = useState(null); // "approve" | "reject" | null
  const [confirmReject, setConfirmReject] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(
          `${apiBase}/get_student_details.php?enrollment_id=${enrollmentId}`,
          { credentials: "include" }
        );
        const data = await res.json();
        data.success ? setStudent(data.student) : setLoadErr(data.message ?? "Could not load student.");
      } catch {
        setLoadErr("Could not reach the server.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [enrollmentId]);

  async function handleApprove() {
    setActing("approve");
    try {
      const body = new FormData();
      body.append("enrollment_id", enrollmentId);
      const res  = await fetch(`${apiBase}/approve_enrollment.php`, {
        method: "POST", credentials: "include", body,
      });
      const data = await res.json();
      data.success ? onApprove(enrollmentId) : onError(data.message ?? "Could not approve.");
    } catch {
      onError("Could not reach the server.");
    } finally {
      setActing(null);
    }
  }

  async function handleReject() {
    setActing("reject");
    try {
      const body = new FormData();
      body.append("enrollment_id", enrollmentId);
      const res  = await fetch(`${apiBase}/reject_enrollment.php`, {
        method: "POST", credentials: "include", body,
      });
      const data = await res.json();
      data.success ? onReject(enrollmentId) : onError(data.message ?? "Could not reject.");
    } catch {
      onError("Could not reach the server.");
    } finally {
      setActing(null);
      setConfirmReject(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D9E8D5] shrink-0">
          <h2
            className="text-lg text-[#1B5E2C]"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            Enrollment Review
          </h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg border border-[#D9E8D5] flex items-center justify-center text-[#86A18A] hover:text-[#1B5E2C] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-4 rounded bg-[#EFF4ED] animate-pulse" style={{ width: `${50 + i * 8}%` }} />
              ))}
            </div>
          ) : loadErr ? (
            <div className="text-[#B3492B] text-sm">{loadErr}</div>
          ) : student ? (
            <>
              {/* Student info */}
              <Section title="Student Information">
                <Row label="Full Name"      value={`${student.first_name ?? ""} ${student.middle_name ?? ""} ${student.last_name ?? ""}`.trim() || "—"} />
                <Row label="Student ID"     value={student.student_id} />
                <Row label="Date of Birth"  value={student.date_of_birth ?? "—"} />
                <Row label="Gender"         value={student.gender ?? "—"} />
                <Row label="Contact No."    value={student.contact_number ?? "—"} />
                <Row label="Address"        value={student.address ?? "—"} />
              </Section>

              {/* Enrollment info */}
              <Section title="Enrollment Details">
                <Row label="Grade Level"    value={`Grade ${student.grade_level}`} />
                <Row label="Level Type"     value={student.level_type ?? "—"} />
                <Row label="Student Type"   value={student.student_type ?? "—"} />
                <Row label="Average Grade"  value={student.average_grade ?? "—"} />
                <Row label="OCR Average"    value={student.ocr_average ?? "—"} />
                <Row label="OCR Status"     value={<OcrBadge status={student.ocr_status} />} />
                {student.section_assigned && (
                  <Row label="Section Assigned" value={student.section_assigned} />
                )}
              </Section>

              {/* Requirements / uploaded documents */}
              <Section title="Uploaded Requirements">
                <DocRow label="Report Card (Front)" path={student.report_card_front} enrollmentId={student.enrollment_id} fileType="report_card_front" />
                <DocRow label="Report Card (Back)" path={student.report_card_back} enrollmentId={student.enrollment_id} fileType="report_card_back" />
                <DocRow label="PSA Birth Certificate" path={student.psa_birth_certificate} enrollmentId={student.enrollment_id} fileType="birth_certificate" />
                <DocRow label="Good Moral" path={student.good_moral} enrollmentId={student.enrollment_id} fileType="good_moral" />
                <DocRow label="Certificate of Transfer" path={student.certificate_of_transfer} enrollmentId={student.enrollment_id} fileType="certificate_of_transfer" />
              </Section>
            </>
          ) : null}
        </div>

        {/* Action footer */}
        {!loading && !loadErr && student && (
          <div className="shrink-0 px-6 py-4 border-t border-[#D9E8D5] bg-[#FAFAF5]">
            {confirmReject ? (
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <p className="text-sm text-[#B3492B] flex-1">
                  Reject this application? This cannot be undone.
                </p>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setConfirmReject(false)}
                    className="px-4 py-2 rounded-lg border border-[#CBD9C8] text-sm text-[#5B6478] hover:bg-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={acting === "reject"}
                    className="px-4 py-2 rounded-lg bg-[#B3492B] text-white text-sm font-medium hover:bg-[#963B22] disabled:opacity-60 transition-colors"
                  >
                    {acting === "reject" ? "Rejecting…" : "Confirm Reject"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setConfirmReject(true)}
                  disabled={!!acting}
                  className="flex-1 rounded-lg border border-[#B3492B] text-[#B3492B] text-sm font-medium py-2.5 hover:bg-[#B3492B]/5 disabled:opacity-60 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={handleApprove}
                  disabled={!!acting}
                  className="flex-1 rounded-lg bg-[#1B5E2C] text-white text-sm font-medium py-2.5 hover:bg-[#164A22] disabled:opacity-60 transition-colors"
                >
                  {acting === "approve" ? "Approving…" : "Approve & Assign Section"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Small reusable components ─────────────────────────────── */
function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.15em] text-[#86A18A] mb-2">{title}</p>
      <div className="bg-[#FAFAF5] rounded-xl border border-[#D9E8D5] divide-y divide-[#EFF4ED]">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5">
      <span className="text-xs text-[#86A18A] w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-[#1B5E2C] flex-1">{value ?? "—"}</span>
    </div>
  );
}

function DocRow({ label, path, enrollmentId, fileType }) {
  const [preview, setPreview] = useState(false);

  const uploaded = Boolean(path && String(path).trim() !== "");

  // URL goes through Vite proxy: /staff/view_file.php → XAMPP
  const url = `http://localhost/backend-online-enrollment/staff/view_file.php?enrollment_id=${enrollmentId}&file=${fileType}`;

  if (!uploaded) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="text-xs text-[#86A18A] w-36 shrink-0">{label}</span>
        <span className="text-xs text-[#A8AEBC] italic">Not uploaded</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="text-xs text-[#86A18A] w-36 shrink-0">{label}</span>
        <button
          onClick={() => setPreview(true)}
          className="text-xs text-[#8C6B12] underline underline-offset-2 hover:text-[#6E5410] transition-colors"
        >
          View file →
        </button>
      </div>

      {/* Image preview modal */}
      {preview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70">
          <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#D9E8D5] shrink-0">
              <p className="text-sm font-medium text-[#1B5E2C]">{label}</p>
              <div className="flex items-center gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#8C6B12] border border-[#CBD9C8] rounded px-2 py-1 hover:bg-[#FAFAF5]"
                >
                  Open in new tab
                </a>
                <button
                  onClick={() => setPreview(false)}
                  className="h-7 w-7 rounded-lg border border-[#D9E8D5] flex items-center justify-center text-[#86A18A] hover:text-[#1B5E2C] text-sm"
                >
                  ✕
                </button>
              </div>
            </div>
            {/* Image */}
            <div className="flex-1 overflow-auto flex items-center justify-center bg-[#F7F7F7] p-2">
              <img
                src={url}
                alt={label}
                className="max-w-full max-h-[75vh] object-contain rounded"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "block";
                }}
              />
              <p style={{ display: "none" }} className="text-sm text-[#B3492B] p-4">
                Could not load image. The file may not exist on the server yet.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LevelBadge({ level }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
      level === "SHS"
        ? "bg-[#F2BE22]/20 text-[#8C6B12]"
        : "bg-[#1B5E2C]/10 text-[#1B5E2C]"
    }`}>
      {level ?? "—"}
    </span>
  );
}

function OcrBadge({ status }) {
  const map = {
    Verified:  "bg-[#1B5E2C]/10 text-[#1B5E2C]",
    Pending:   "bg-[#F2BE22]/20 text-[#8C6B12]",
    Failed:    "bg-[#B3492B]/10 text-[#B3492B]",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? "bg-[#EFF4ED] text-[#86A18A]"}`}>
      {status ?? "—"}
    </span>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <path d="M4 10a6 6 0 1 0 1.5-3.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 6v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
