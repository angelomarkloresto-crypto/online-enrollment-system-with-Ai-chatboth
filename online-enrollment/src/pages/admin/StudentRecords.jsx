import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const ADMIN_API = "/backend-online-enrollment/admin";
const GRADES = ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];

async function requestJson(url, options = {}) {
  const response = await fetch(url, { credentials: "include", ...options });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }
  if (!response.ok || !data.success) {
    throw new Error(data.message || "The request could not be completed.");
  }
  return data;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

function periodLabel(period) {
  if (period.kind === "period") {
    const coverage = period.coverage === "shs_second_semester"
      ? "SHS 2nd Semester"
      : "All Grade Levels";
    return `${period.school_year} · ${coverage} · ${period.semester || "—"}`;
  }
  const periodName = period.period_not_recorded
    ? "Period Not Recorded"
    : `${period.semester || "Semester unavailable"} · Legacy Records`;
  return `${period.school_year || "School year unavailable"} · ${periodName}`;
}

function periodParams(period) {
  const params = new URLSearchParams();
  if (period.kind === "period") {
    params.set("enrollment_period_id", period.enrollment_period_id);
  } else {
    params.set("legacy", "1");
    if (period.period_not_recorded) {
      params.set("period_not_recorded", "1");
    } else {
      params.set("school_year", period.school_year);
      params.set("semester", period.semester);
    }
  }
  return params;
}

function gradeNumber(value) {
  const match = String(value || "").match(/\d+/);
  return match ? match[0] : "";
}

function displayValue(value) {
  return value === null || value === undefined || value === "" ? "—" : value;
}

function studentName(student) {
  return [
    student.first_name,
    student.middle_name,
    student.last_name,
    student.extension_name,
  ].filter(Boolean).join(" ") || "—";
}

export default function StudentRecords() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedPeriodId = searchParams.get("period_id");
  const [periods, setPeriods] = useState([]);
  const [legacyGroups, setLegacyGroups] = useState([]);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [periodsError, setPeriodsError] = useState("");
  const [periodReload, setPeriodReload] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [gradeFilter, setGradeFilter] = useState("All Grades");
  const [selectedSection, setSelectedSection] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentRecord, setStudentRecord] = useState(null);
  const [studentRecordLoading, setStudentRecordLoading] = useState(false);
  const [studentRecordError, setStudentRecordError] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [deletionPreview, setDeletionPreview] = useState(null);
  const [deletionLoadingId, setDeletionLoadingId] = useState(null);
  const [deletionPending, setDeletionPending] = useState(false);
  const [deletionConfirmation, setDeletionConfirmation] = useState("");
  const [deletionError, setDeletionError] = useState("");
  const [deletionNotice, setDeletionNotice] = useState(null);

  const periodOptions = useMemo(() => [
    ...periods.map((period) => ({ ...period, kind: "period" })),
    ...legacyGroups.map((group, index) => ({
      ...group,
      kind: "legacy",
      period_not_recorded: Boolean(group.period_not_recorded) || !group.school_year || !group.semester,
      key: `legacy-${group.school_year || "unknown"}-${group.semester || index}`,
    })),
  ], [periods, legacyGroups]);

  useEffect(() => {
    let active = true;
    async function loadPeriods() {
      setPeriodsLoading(true);
      setPeriodsError("");
      try {
        const data = await requestJson(`${ADMIN_API}/get_enrollment_periods.php`);
        if (!active) return;
        setPeriods(Array.isArray(data.periods) ? data.periods : []);
        const groups = data.legacy_enrollment_records?.groups;
        setLegacyGroups(Array.isArray(groups) ? groups : []);
      } catch (error) {
        if (!active) return;
        setPeriodsError(error.message || "Student records could not be loaded.");
      } finally {
        if (active) setPeriodsLoading(false);
      }
    }
    loadPeriods();
    return () => { active = false; };
  }, [periodReload]);

  useEffect(() => () => {
    if (preview?.objectUrl) URL.revokeObjectURL(preview.objectUrl);
  }, [preview]);

  const openPeriod = useCallback(async (period) => {
    setSelectedPeriod(period);
    setDashboard(null);
    setSelectedSection(null);
    setStudents([]);
    setDashboardLoading(true);
    setDashboardError("");
    setGradeFilter("All Grades");
    try {
      const params = periodParams(period);
      const data = await requestJson(`${ADMIN_API}/get_enrollment_period_dashboard.php?${params.toString()}`);
      setDashboard(data);
    } catch (error) {
      setDashboardError(error.message || "The selected student records could not be loaded.");
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (periodsLoading || !requestedPeriodId || selectedPeriod) return;
    const match = periodOptions.find((period) =>
      period.kind === "period" && String(period.enrollment_period_id) === String(requestedPeriodId));
    if (match) openPeriod(match);
  }, [openPeriod, periodOptions, periodsLoading, requestedPeriodId, selectedPeriod]);

  async function openSection(section) {
    if (!selectedPeriod) return;
    setSelectedSection(section);
    setStudents([]);
    setStudentsLoading(true);
    setStudentsError("");
    try {
      const params = periodParams(selectedPeriod);
      params.set("section_id", section.section_id ?? 0);
      const data = await requestJson(`${ADMIN_API}/get_enrollment_period_students.php?${params.toString()}`);
      setStudents(Array.isArray(data.students) ? data.students : []);
    } catch (error) {
      setStudentsError(error.message || "The student list could not be loaded.");
    } finally {
      setStudentsLoading(false);
    }
  }

  async function openStudent(student) {
    setSelectedStudent(student);
    setStudentRecord(null);
    setStudentRecordError("");
    setStudentRecordLoading(true);
    try {
      const params = new URLSearchParams({ enrollment_id: student.enrollment_id });
      const data = await requestJson(`${ADMIN_API}/get_enrollment_record.php?${params.toString()}`);
      setStudentRecord(data.student_enrollment);
    } catch (error) {
      setStudentRecordError(error.message || "The enrollment record could not be loaded.");
    } finally {
      setStudentRecordLoading(false);
    }
  }

    async function previewPeriodDeletion(period) {
      setDeletionLoadingId(period.enrollment_period_id);
      setDeletionPreview(null);
      setDeletionError("");
      setDeletionConfirmation("");
      setDeletionNotice(null);
      try {
        const data = await requestJson(`${ADMIN_API}/manage_enrollment_period_records.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "preview",
            enrollment_period_id: period.enrollment_period_id,
          }),
        });
        setDeletionPreview(data);
      } catch (error) {
        setDeletionError(error.message || "The deletion preview could not be loaded.");
      } finally {
        setDeletionLoadingId(null);
      }
    }

    async function deletePeriodRecords() {
      if (!deletionPreview?.can_delete || deletionPending || !deletionConfirmation
        || deletionConfirmation.trim() !== deletionPreview.period.school_year) {
        return;
      }
      setDeletionPending(true);
      setDeletionError("");
      try {
        const data = await requestJson(`${ADMIN_API}/manage_enrollment_period_records.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete",
            enrollment_period_id: deletionPreview.period.enrollment_period_id,
            confirmation_token: deletionPreview.confirmation_token,
          }),
        });
        setDeletionPreview(null);
        setDeletionConfirmation("");
        setDeletionNotice({ type: "success", text: data.message || "Enrollment period records were deleted." });
        setPeriodReload((key) => key + 1);
      } catch (error) {
        setDeletionError(error.message || "Enrollment period records could not be deleted.");
        if (error.message?.includes("preview expired") || error.message?.includes("changed")) {
          setDeletionPreview(null);
        }
      } finally {
        setDeletionPending(false);
      }
    }

    function closeDeletionPreview() {
      if (deletionPending) return;
      setDeletionPreview(null);
      setDeletionConfirmation("");
      setDeletionError("");
    }

  function closeStudent() {
    setSelectedStudent(null);
    setStudentRecord(null);
    setPreview(null);
    setFileError("");
  }

  function returnToPeriods() {
    setSelectedPeriod(null);
    setDashboard(null);
    setSelectedSection(null);
    setStudents([]);
    navigate("/student-records", { replace: true });
  }

  function requirementUrl(requirement, download = false) {
    if (!requirement?.view_url) return null;
    const url = new URL(requirement.view_url, `${ADMIN_API}/`);
    if (download) url.searchParams.set("download", "1");
    return url.toString();
  }

  async function previewRequirement(requirement) {
    const url = requirementUrl(requirement);
    if (!url) return;
    setPreviewLoading(true);
    setFileError("");
    setPreview(null);
    try {
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        let message = "The requirement file could not be opened.";
        try {
          const data = await response.json();
          message = data.message || message;
        } catch {
          // The authorized endpoint may return a non-JSON error body.
        }
        throw new Error(message);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setPreview({
        label: requirement.label || requirement.type || "Requirement",
        mimeType: blob.type,
        objectUrl,
      });
    } catch (error) {
      setFileError(error.message || "The requirement file could not be opened.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function downloadRequirement(requirement) {
    const url = requirementUrl(requirement, true);
    if (!url) return;
    setFileError("");
    try {
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        let message = "The requirement file could not be downloaded.";
        try {
          const data = await response.json();
          message = data.message || message;
        } catch {
          // The authorized endpoint may return a non-JSON error body.
        }
        throw new Error(message);
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      const disposition = response.headers.get("Content-Disposition") || "";
      const filename = disposition.match(/filename="([^"]+)"/i)?.[1]
        || `${requirement.type || "requirement"}.file`;
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      setFileError(error.message || "The requirement file could not be downloaded.");
    }
  }

  const sections = Array.isArray(dashboard?.sections) ? dashboard.sections : [];
  const filteredSections = gradeFilter === "All Grades"
    ? sections
    : sections.filter((section) => gradeNumber(section.grade_level) === gradeNumber(gradeFilter));

  return (
    <div className="min-h-full min-w-0 bg-[#FAFAF5] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-6">
          <p className="mb-1 text-xs uppercase tracking-[0.15em] text-[#8C6B12]">Gogon High School</p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl text-[#1B5E2C] sm:text-3xl" style={{ fontFamily: "'Fraunces', serif" }}>
                Student Records
              </h1>
              <p className="mt-1 text-sm text-[#5B6478]">Browse enrollment records by school year and section.</p>
            </div>
            {selectedPeriod && (
              <button
                type="button"
                onClick={returnToPeriods}
                className="rounded-lg border border-[#CBD9C8] px-3 py-2 text-sm font-medium text-[#1B5E2C] hover:bg-[#EFF4ED]"
              >
                Back to periods
              </button>
            )}
          </div>
        </header>

        {periodsError && (
          <div role="alert" className="mb-4 rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 px-4 py-3 text-sm text-[#B3492B]">
            {periodsError}
          </div>
        )}
        {deletionNotice && (
          <div
            role="status"
            className={`mb-4 rounded-lg px-4 py-3 text-sm ${
              deletionNotice.type === "success"
                ? "border border-[#1B5E2C]/20 bg-[#1B5E2C]/10 text-[#1B5E2C]"
                : "border border-[#B3492B]/30 bg-[#B3492B]/10 text-[#B3492B]"
            }`}
          >
            {deletionNotice.text}
          </div>
        )}
        {deletionError && !deletionPreview && (
          <div role="alert" className="mb-4 rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 px-4 py-3 text-sm text-[#B3492B]">
            {deletionError}
          </div>
        )}

        {!selectedPeriod ? (
          <section className="overflow-hidden rounded-2xl border border-[#D9E8D5] bg-white">
            <div className="border-b border-[#EFF4ED] px-4 py-4 sm:px-5">
              <h2 className="font-semibold text-[#1B5E2C]">Available Enrollment Records</h2>
            </div>
            {periodsLoading ? (
              <p className="px-5 py-12 text-center text-sm text-[#5B6478]">Loading enrollment records…</p>
            ) : periodsError ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-[#5B6478]">Enrollment records could not be loaded.</p>
                <button type="button" onClick={() => setPeriodReload((key) => key + 1)} className="mt-3 text-sm font-medium text-[#1B5E2C] underline">Retry</button>
              </div>
            ) : periodOptions.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-[#5B6478]">No enrollment periods or legacy records are available.</p>
            ) : (
              <div className="divide-y divide-[#EFF4ED]">
                {periodOptions.map((period) => {
                  const key = period.kind === "period" ? `period-${period.enrollment_period_id}` : period.key;
                  return (
                    <div key={key} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <div>
                        <p className="font-medium text-[#1B5E2C]">{periodLabel(period)}</p>
                        <p className="mt-1 text-xs text-[#5B6478]">
                          {period.kind === "period" ? `Period status: ${period.status}` : "Read-only legacy records"}
                          {period.kind === "period" && period.enrolled_students != null ? ` · ${period.enrolled_students} enrolled` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openPeriod(period)}
                          className="w-fit rounded-lg bg-[#1B5E2C] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#164A22]"
                        >
                          View Records
                        </button>
                        {period.kind === "period" && (
                          <button
                            type="button"
                            onClick={() => previewPeriodDeletion(period)}
                            disabled={deletionLoadingId !== null}
                            className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#B3492B]/40 px-4 py-2.5 text-sm font-medium text-[#B3492B] hover:bg-[#B3492B]/5 disabled:cursor-wait disabled:opacity-60"
                          >
                            <TrashIcon />
                            {deletionLoadingId === period.enrollment_period_id ? "Preparing…" : "Delete Records"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : selectedSection ? (
          <section className="overflow-hidden rounded-2xl border border-[#D9E8D5] bg-white">
            <div className="flex flex-col gap-3 border-b border-[#EFF4ED] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <button type="button" onClick={() => { setSelectedSection(null); setStudents([]); }} className="mb-2 text-sm font-medium text-[#1B5E2C] underline">← Sections</button>
                <h2 className="text-lg font-semibold text-[#1B5E2C]">{selectedSection.section_name || "Unassigned Students"}</h2>
                <p className="mt-1 text-sm text-[#5B6478]">{periodLabel(selectedPeriod)} · {studentsLoading ? "Loading student records…" : `${students.length} student record${students.length === 1 ? "" : "s"}`}</p>
              </div>
              <span className="rounded-full bg-[#EFF4ED] px-3 py-1.5 text-xs font-medium text-[#1B5E2C]">
                {selectedSection.grade_level || "Grade unavailable"}
              </span>
            </div>
            {studentsError && <p role="alert" className="m-4 rounded-lg bg-[#B3492B]/10 px-3 py-2 text-sm text-[#B3492B]">{studentsError}</p>}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-[#1B5E2C] text-[#FAFAF5]">
                  <tr>
                    <th className="px-4 py-3 font-medium">LRN</th>
                    <th className="px-4 py-3 font-medium">Student Name</th>
                    <th className="px-4 py-3 font-medium">Grade Level</th>
                    <th className="px-4 py-3 font-medium">Section</th>
                    <th className="px-4 py-3 font-medium">Strand</th>
                    <th className="px-4 py-3 font-medium">Application Status</th>
                    <th className="px-4 py-3 font-medium">Attempt</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsLoading ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-[#5B6478]">Loading student records…</td></tr>
                  ) : studentsError ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-[#5B6478]">Student records could not be loaded.</td></tr>
                  ) : students.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-[#5B6478]">No student records are available for this section.</td></tr>
                  ) : students.map((student) => (
                    <tr key={student.enrollment_id} className="border-t border-[#EFF4ED]">
                      <td className="px-4 py-3.5 text-[#5B6478]">{displayValue(student.lrn)}</td>
                      <td className="px-4 py-3.5 font-medium text-[#1B5E2C]">{studentName(student)}</td>
                      <td className="px-4 py-3.5 text-[#5B6478]">{displayValue(student.grade_level)}</td>
                      <td className="px-4 py-3.5 text-[#5B6478]">{displayValue(student.section_name)}</td>
                      <td className="px-4 py-3.5 text-[#5B6478]">{displayValue(student.strand_name)}</td>
                      <td className="px-4 py-3.5"><span className="rounded-full bg-[#EFF4ED] px-2.5 py-1 text-xs text-[#1B5E2C]">{displayValue(student.enrollment_status)}</span></td>
                      <td className="px-4 py-3.5 text-[#5B6478]">{displayValue(student.attempt_number)}</td>
                      <td className="px-4 py-3.5 text-right">
                        <button type="button" onClick={() => openStudent(student)} className="rounded-lg border border-[#CBD9C8] px-3 py-2 text-xs font-medium text-[#1B5E2C] hover:bg-[#EFF4ED]">View Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-[#D9E8D5] bg-white">
            <div className="flex flex-col gap-4 border-b border-[#EFF4ED] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <button type="button" onClick={returnToPeriods} className="mb-2 text-sm font-medium text-[#1B5E2C] underline">← Enrollment periods</button>
                <h2 className="font-semibold text-[#1B5E2C]">{periodLabel(selectedPeriod)}</h2>
                {dashboard?.period && <p className="mt-1 text-sm text-[#5B6478]">Status: {dashboard.period.status || "Legacy history"}</p>}
              </div>
              <div className="flex flex-wrap gap-2" aria-label="Filter sections by grade">
                {["All Grades", ...GRADES].map((grade) => (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => setGradeFilter(grade)}
                    aria-pressed={gradeFilter === grade}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${gradeFilter === grade ? "border-[#1B5E2C] bg-[#1B5E2C] text-white" : "border-[#CBD9C8] text-[#1B5E2C] hover:bg-[#EFF4ED]"}`}
                  >
                    {grade}
                  </button>
                ))}
              </div>
            </div>
            {dashboardError && <p role="alert" className="m-4 rounded-lg bg-[#B3492B]/10 px-3 py-2 text-sm text-[#B3492B]">{dashboardError}</p>}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-[#1B5E2C] text-[#FAFAF5]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Section Name</th>
                    <th className="px-4 py-3 font-medium">Grade Level</th>
                    <th className="px-4 py-3 font-medium">Strand</th>
                    <th className="px-4 py-3 font-medium">Enrolled Students</th>
                    <th className="px-4 py-3 font-medium">Application Attempts</th>
                    <th className="px-4 py-3 font-medium">Capacity</th>
                    <th className="px-4 py-3 font-medium">Total Subjects</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardLoading ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-[#5B6478]">Loading sections…</td></tr>
                  ) : dashboardError ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-[#5B6478]">Sections could not be loaded.</td></tr>
                  ) : filteredSections.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-[#5B6478]">No sections or student records are available for this grade.</td></tr>
                  ) : filteredSections.map((section, index) => (
                    <tr key={section.section_id ?? `unassigned-${section.grade_level}-${index}`} className="border-t border-[#EFF4ED]">
                      <td className="px-4 py-3.5 font-medium text-[#1B5E2C]">{section.section_name || "Unassigned Students"}</td>
                      <td className="px-4 py-3.5 text-[#5B6478]">{displayValue(section.grade_level)}</td>
                      <td className="px-4 py-3.5 text-[#5B6478]">{displayValue(section.strand_name)}</td>
                      <td className="px-4 py-3.5 text-[#5B6478]">{section.enrolled_students ?? 0}</td>
                      <td className="px-4 py-3.5 text-[#5B6478]">{section.application_attempts ?? 0}</td>
                      <td className="px-4 py-3.5 text-[#5B6478]">{section.capacity ?? "Unavailable"}</td>
                      <td className="px-4 py-3.5 text-[#5B6478]">{section.total_subjects ?? "Unavailable"}</td>
                      <td className="px-4 py-3.5 text-right">
                        <button type="button" onClick={() => openSection(section)} className="rounded-lg border border-[#CBD9C8] px-3 py-2 text-xs font-medium text-[#1B5E2C] hover:bg-[#EFF4ED]">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-[#EFF4ED] px-4 py-3 text-xs text-[#5B6478]">
              Historical capacity and subject totals are shown as unavailable when they were not recorded at enrollment time.
            </p>
          </section>
        )}
      </div>

      {deletionPreview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-period-title"
            className="my-auto w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl sm:p-6"
          >
            <h2 id="delete-period-title" className="text-lg font-semibold text-[#B3492B]">
              Delete enrollment records?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#5B6478]">
              This permanently removes enrollment attempts for the selected period and their linked requirements,
              email logs, application mappings, on-site item donation records, and safe-to-remove uploads.
            </p>
            <div className="mt-4 rounded-xl bg-[#FAFAF5] p-4">
              <p className="font-semibold text-[#1B5E2C]">{periodLabel(deletionPreview.period)}</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                <DeletionCount label="Enrollment attempts" value={deletionPreview.counts.enrollments} />
                <DeletionCount label="Pending applications" value={deletionPreview.counts.pending} />
                <DeletionCount label="Approved records" value={deletionPreview.counts.approved} />
                <DeletionCount label="Rejected records" value={deletionPreview.counts.rejected} />
                <DeletionCount label="Requirement records" value={deletionPreview.counts.requirements} />
                <DeletionCount label="Email logs" value={deletionPreview.counts.email_logs} />
                <DeletionCount label="Application mappings" value={deletionPreview.counts.applications} />
                <DeletionCount label="On-site item donations" value={deletionPreview.counts.item_donations} />
                <DeletionCount label="Stored files" value={deletionPreview.files_to_remove} />
              </dl>
            </div>
            <p className="mt-3 text-xs leading-5 text-[#5B6478]">
              Student accounts and profiles, sections, strands, timetables, GCash donation records, other enrollment
              periods, and legacy records are preserved.
            </p>
            {!deletionPreview.can_delete && (
              <p role="alert" className="mt-3 rounded-lg bg-[#B3492B]/10 px-3 py-2 text-sm text-[#B3492B]">
                {deletionPreview.blocked_reason || "This period cannot be deleted yet."}
              </p>
            )}
            {deletionError && (
              <p role="alert" className="mt-3 rounded-lg bg-[#B3492B]/10 px-3 py-2 text-sm text-[#B3492B]">
                {deletionError}
              </p>
            )}
            {deletionPreview.can_delete && (
              <label className="mt-4 block text-sm font-medium text-[#1B5E2C]">
                Type <span className="font-bold">{deletionPreview.period.school_year}</span> to confirm
                <input
                  type="text"
                  autoComplete="off"
                  value={deletionConfirmation}
                  onChange={(event) => setDeletionConfirmation(event.target.value)}
                  disabled={deletionPending}
                  className="mt-1.5 w-full rounded-lg border border-[#CBD9C8] px-3 py-2.5 text-sm outline-none focus:border-[#1B5E2C] disabled:opacity-60"
                />
              </label>
            )}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeletionPreview}
                disabled={deletionPending}
                className="rounded-lg border border-[#CBD9C8] px-4 py-2.5 text-sm font-medium text-[#1B5E2C] hover:bg-[#EFF4ED] disabled:opacity-60"
              >
                Cancel
              </button>
              {deletionPreview.can_delete && (
                <button
                  type="button"
                  onClick={deletePeriodRecords}
                  disabled={deletionPending || deletionConfirmation.trim() !== deletionPreview.period.school_year}
                  className="rounded-lg bg-[#B3492B] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#963A22] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletionPending ? "Deleting records…" : "Confirm Delete"}
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-3 sm:p-5">
          <section role="dialog" aria-modal="true" aria-labelledby="student-record-title" className="my-auto max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#D9E8D5] bg-white px-4 py-4 sm:px-6">
              <div>
                <h2 id="student-record-title" className="text-lg font-semibold text-[#1B5E2C]">Enrollment Record</h2>
                <p className="mt-1 text-sm text-[#5B6478]">{studentName(selectedStudent)} · {selectedStudent.lrn || "LRN unavailable"}</p>
              </div>
              <button type="button" onClick={closeStudent} aria-label="Close record" className="rounded-lg border border-[#CBD9C8] px-3 py-1.5 text-sm text-[#1B5E2C]">Close</button>
            </div>
            {studentRecordLoading ? (
              <p className="px-6 py-12 text-center text-sm text-[#5B6478]">Loading enrollment details…</p>
            ) : studentRecordError ? (
              <p role="alert" className="m-5 rounded-lg bg-[#B3492B]/10 px-4 py-3 text-sm text-[#B3492B]">{studentRecordError}</p>
            ) : studentRecord ? (
              <div className="space-y-5 p-4 sm:p-6">
                <section>
                  <h3 className="mb-3 font-semibold text-[#1B5E2C]">Student Information</h3>
                  <dl className="grid gap-3 rounded-xl bg-[#FAFAF5] p-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      ["LRN", studentRecord.lrn],
                      ["Student Name", studentName(studentRecord)],
                      ["Date of Birth", studentRecord.date_of_birth],
                      ["Cellphone", studentRecord.cellphone_no],
                      ["Gmail", studentRecord.email],
                      ["Grade Level", studentRecord.grade_level],
                      ["Section", studentRecord.section_name],
                      ["Strand", studentRecord.strand_name],
                      ["School Year", studentRecord.school_year],
                      ["Semester", studentRecord.semester],
                      ["Status", studentRecord.enrollment_status],
                      ["Submitted", formatDate(studentRecord.submitted_at)],
                      ["Average Grade", studentRecord.average_grade],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-xs text-[#5B6478]">{label}</dt>
                        <dd className="mt-0.5 break-words text-sm font-medium text-[#1B5E2C]">{displayValue(value)}</dd>
                      </div>
                    ))}
                    {studentRecord.rejection_reason && (
                      <div className="sm:col-span-2 lg:col-span-3">
                        <dt className="text-xs text-[#5B6478]">Rejection Reason</dt>
                        <dd className="mt-0.5 text-sm text-[#B3492B]">{studentRecord.rejection_reason}</dd>
                      </div>
                    )}
                  </dl>
                </section>
                <section>
                  <h3 className="mb-3 font-semibold text-[#1B5E2C]">Learner Information</h3>
                  <dl className="grid gap-3 rounded-xl bg-[#FAFAF5] p-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-[#5B6478]">Person with disability (PWD)</dt>
                      <dd className="mt-0.5 break-words text-sm font-medium text-[#1B5E2C]">{displayValue(studentRecord.is_pwd ?? "Not recorded")}</dd>
                    </div>
                    {studentRecord.is_pwd === "Yes" && (
                      <div>
                        <dt className="text-xs text-[#5B6478]">PWD specification</dt>
                        <dd className="mt-0.5 break-words text-sm font-medium text-[#1B5E2C]">{displayValue(studentRecord.pwd_specification)}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-xs text-[#5B6478]">4Ps beneficiary</dt>
                      <dd className="mt-0.5 break-words text-sm font-medium text-[#1B5E2C]">{displayValue(studentRecord.is_4ps_beneficiary ?? "Not recorded")}</dd>
                    </div>
                    {studentRecord.is_4ps_beneficiary === "Yes" && (
                      <div>
                        <dt className="text-xs text-[#5B6478]">4Ps Household ID Number</dt>
                        <dd className="mt-0.5 break-words text-sm font-medium text-[#1B5E2C]">{displayValue(studentRecord.four_ps_household_id)}</dd>
                      </div>
                    )}
                  </dl>
                </section>
                <section>
                  <h3 className="mb-3 font-semibold text-[#1B5E2C]">Submitted Requirements</h3>
                  {Array.isArray(studentRecord.requirements) && studentRecord.requirements.length > 0 ? (
                    <div className="divide-y divide-[#EFF4ED] rounded-xl border border-[#D9E8D5]">
                      {studentRecord.requirements.map((requirement) => (
                        <div key={requirement.type} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-[#1B5E2C]">{requirement.label || requirement.type}</p>
                            <p className="text-xs text-[#5B6478]">{requirement.submitted ? "Submitted" : "Not submitted"}</p>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" disabled={!requirement.submitted || !requirement.view_url || previewLoading} onClick={() => previewRequirement(requirement)} className="rounded-lg border border-[#CBD9C8] px-3 py-2 text-xs font-medium text-[#1B5E2C] disabled:opacity-50">View</button>
                            <button type="button" disabled={!requirement.submitted || !requirement.view_url} onClick={() => downloadRequirement(requirement)} className="rounded-lg bg-[#1B5E2C] px-3 py-2 text-xs font-medium text-white disabled:opacity-50">Download</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-[#FAFAF5] px-4 py-3 text-sm text-[#5B6478]">No requirement details were returned for this record.</p>
                  )}
                  {fileError && <p role="alert" className="mt-3 rounded-lg bg-[#B3492B]/10 px-3 py-2 text-sm text-[#B3492B]">{fileError}</p>}
                </section>
                {Array.isArray(studentRecord.attempt_history) && studentRecord.attempt_history.length > 0 && (
                  <section>
                    <h3 className="mb-3 font-semibold text-[#1B5E2C]">Attempt History</h3>
                    <div className="overflow-x-auto rounded-xl border border-[#D9E8D5]">
                      <table className="w-full min-w-[500px] text-left text-sm">
                        <thead className="bg-[#EFF4ED] text-[#1B5E2C]"><tr><th className="px-4 py-2.5">Attempt</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">Submitted</th><th className="px-4 py-2.5">Reason</th></tr></thead>
                        <tbody>{studentRecord.attempt_history.map((attempt, index) => (
                          <tr key={attempt.enrollment_id || index} className="border-t border-[#EFF4ED]">
                            <td className="px-4 py-2.5">{displayValue(attempt.attempt_number)}</td>
                            <td className="px-4 py-2.5">{displayValue(attempt.enrollment_status)}</td>
                            <td className="px-4 py-2.5">{formatDate(attempt.submitted_at)}</td>
                            <td className="px-4 py-2.5">{displayValue(attempt.rejection_reason)}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </section>
                )}
              </div>
            ) : null}
          </section>
        </div>
      )}

      {(preview || previewLoading) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-3 sm:p-6">
          <section role="dialog" aria-modal="true" aria-label="Requirement preview" className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-[#D9E8D5] px-4 py-3">
              <p className="truncate text-sm font-medium text-[#1B5E2C]">{preview?.label || "Loading requirement…"}</p>
              <button type="button" onClick={() => setPreview(null)} className="rounded-lg border border-[#CBD9C8] px-3 py-1.5 text-sm text-[#1B5E2C]">Close</button>
            </div>
            {previewLoading ? (
              <p className="flex flex-1 items-center justify-center text-sm text-[#5B6478]">Loading requirement…</p>
            ) : preview?.mimeType?.startsWith("image/") ? (
              <div className="flex flex-1 items-center justify-center overflow-auto bg-[#FAFAF5] p-3"><img src={preview.objectUrl} alt={preview.label} className="max-h-full max-w-full object-contain" /></div>
            ) : preview?.mimeType === "application/pdf" ? (
              <iframe title={preview.label} src={preview.objectUrl} className="min-h-0 flex-1" />
            ) : (
              <p className="flex flex-1 items-center justify-center px-5 text-center text-sm text-[#5B6478]">This file type cannot be previewed. Use Download from the enrollment record.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function DeletionCount({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-[#5B6478]">{label}</dt>
      <dd className="font-semibold text-[#1B5E2C]">{Number(value) || 0}</dd>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M3.5 5.5h13m-11.5 0 .7 10.1a1 1 0 0 0 1 .9h6.6a1 1 0 0 0 1-.9l.7-10.1M7.5 5.5V3.8a.8.8 0 0 1 .8-.8h3.4a.8.8 0 0 1 .8.8v1.7M8 8.5v5m4-5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
