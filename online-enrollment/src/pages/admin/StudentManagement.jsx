import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "../../config";
import { useLocation, useNavigate, useParams } from "react-router-dom";

const ADMIN_API = apiUrl("/backend-online-enrollment/admin");
const GRADE_LEVELS = [7, 8, 9, 10, 11, 12];

async function getJson(url, options = {}) {
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

function studentName(student) {
  return [
    student.first_name,
    student.middle_name,
    student.last_name,
    student.extension_name,
  ]
    .filter((part) => typeof part === "string" && part.trim())
    .map((part) => part.trim())
    .join(" ");
}

function enrollmentPeriodLabel(period) {
  if (!period) return "Enrollment Period";
  const coverage = period.coverage === "shs_second_semester"
    ? "SHS 2nd Semester"
    : "All Grade Levels";
  return `${period.school_year} · ${coverage} · ${period.semester || "—"}`;
}

export default function StudentManagement() {
  const { sectionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [gradeFilter, setGradeFilter] = useState("all");
  const [enrollmentPeriods, setEnrollmentPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [periodsError, setPeriodsError] = useState("");
  const [sectionsReload, setSectionsReload] = useState(0);
  const [sections, setSections] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [sectionsError, setSectionsError] = useState("");
  const [section, setSection] = useState(location.state?.section ?? null);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(Boolean(sectionId));
  const [studentsError, setStudentsError] = useState("");
  const [resetStudent, setResetStudent] = useState(null);
  const [pendingStudentId, setPendingStudentId] = useState(null);
  const [downloadingSectionId, setDownloadingSectionId] = useState(null);
  const [toast, setToast] = useState(null);
  const submitLock = useRef(false);

  const requestedPeriodId = new URLSearchParams(location.search).get("enrollment_period_id") || "";

  useEffect(() => {
    let active = true;
    setPeriodsLoading(true);
    setPeriodsError("");
    getJson(`${ADMIN_API}/get_enrollment_periods.php`)
      .then((data) => {
        const periods = Array.isArray(data.periods) ? data.periods : [];
        if (!active) return;
        setEnrollmentPeriods(periods);
        const requestedPeriod = periods.find(
          (period) => String(period.enrollment_period_id) === requestedPeriodId,
        );
        setSelectedPeriodId(
          String(requestedPeriod?.enrollment_period_id ?? periods[0]?.enrollment_period_id ?? ""),
        );
      })
      .catch((error) => {
        if (!active) return;
        setEnrollmentPeriods([]);
        setSelectedPeriodId("");
        setPeriodsError(error.message || "Enrollment periods could not be loaded.");
      })
      .finally(() => {
        if (active) setPeriodsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [location.search, requestedPeriodId]);

  const activePeriodId = sectionId
    ? requestedPeriodId || selectedPeriodId
    : selectedPeriodId;
  const selectedPeriod = enrollmentPeriods.find(
    (period) => String(period.enrollment_period_id) === String(activePeriodId),
  );

  const loadSectionGroups = useCallback(async (grade, periodId) => {
    if (!periodId) return [];
    const grades = grade === "all" ? GRADE_LEVELS : [Number(grade)];
    const groups = await Promise.all(
      grades.map(async (gradeLevel) => {
        const params = new URLSearchParams({
          grade_level: String(gradeLevel),
          enrollment_period_id: String(periodId),
        });
        const data = await getJson(
          `${ADMIN_API}/get_student_sections.php?${params.toString()}`,
        );
        return data.sections.map((item) => ({
          ...item,
          grade_level: Number(item.grade_level),
          student_count: Number(item.student_count),
        }));
      }),
    );
    return groups.flat();
  }, []);

  useEffect(() => {
    if (periodsLoading) return undefined;
    if (!activePeriodId) {
      setSections([]);
      setSectionsLoading(false);
      return undefined;
    }
    let active = true;
    setSectionsLoading(true);
    setSectionsError("");
    loadSectionGroups(gradeFilter, activePeriodId)
      .then((result) => {
        if (active) setSections(result);
      })
      .catch((error) => {
        if (active) {
          setSections([]);
          setSectionsError(error.message || "Could not load sections.");
        }
      })
      .finally(() => {
        if (active) setSectionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activePeriodId, gradeFilter, loadSectionGroups, periodsLoading, sectionsReload]);

  const loadStudents = useCallback(async (id, periodId) => {
    const params = new URLSearchParams({
      section_id: String(id),
      enrollment_period_id: String(periodId),
    });
    const data = await getJson(
      `${ADMIN_API}/get_section_students.php?${params.toString()}`,
    );
    setStudents(Array.isArray(data.students) ? data.students : []);
  }, []);

  useEffect(() => {
    if (!sectionId) {
      setSection(null);
      setStudents([]);
      setStudentsError("");
      setStudentsLoading(false);
      return undefined;
    }
    if (periodsLoading || !activePeriodId) return undefined;

    let active = true;
    const id = Number(sectionId);
    setSection(location.state?.section ?? null);
    setStudentsLoading(true);
    setStudentsError("");

    const rosterRequest = loadStudents(id, activePeriodId).catch((error) => {
      if (active) setStudentsError(error.message || "Could not load students.");
    });

    const sectionRequest = location.state?.section
      ? Promise.resolve(location.state.section)
      : loadSectionGroups("all", activePeriodId).then((items) =>
          items.find((item) => Number(item.section_id) === id) ?? null,
        );

    sectionRequest
      .then((item) => {
        if (active) setSection(item);
      })
      .catch((error) => {
        if (active) setStudentsError(error.message || "Could not load section details.");
      });

    Promise.all([rosterRequest, sectionRequest])
      .catch(() => {})
      .finally(() => {
        if (active) setStudentsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activePeriodId, periodsLoading, sectionId, location.state, loadSectionGroups, loadStudents]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleDownload(sectionItem) {
    setDownloadingSectionId(sectionItem.section_id);
    try {
      const response = await fetch(
        `${ADMIN_API}/export_section_students.php?${new URLSearchParams({
          section_id: String(sectionItem.section_id),
          enrollment_period_id: String(activePeriodId),
        }).toString()}`,
        { credentials: "include" },
      );
      if (!response.ok) {
        let message = "Student list could not be downloaded.";
        try {
          const error = await response.json();
          message = error.message || message;
        } catch {
          // Keep the user-facing fallback for non-JSON server errors.
        }
        throw new Error(message);
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const error = await response.json();
        throw new Error(error.message || "Student list could not be downloaded.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `section-${sectionItem.section_id}-students.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      setToast({ type: "success", text: "Student list downloaded." });
    } catch (error) {
      setToast({ type: "error", text: error.message || "Student list could not be downloaded." });
    } finally {
      setDownloadingSectionId(null);
    }
  }

  async function handleResetPassword() {
    if (!resetStudent || submitLock.current) return;
    submitLock.current = true;
    const selectedStudent = resetStudent;
    setPendingStudentId(selectedStudent.student_id);
    try {
      const data = await getJson(`${ADMIN_API}/reset_student_password.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: selectedStudent.student_id }),
      });
      setResetStudent(null);
      setToast({
        type: "success",
        text: data.message || "Password reset. The student must create a new password on next login.",
      });
      try {
        await loadStudents(sectionId, activePeriodId);
      } catch (error) {
        setStudentsError(error.message || "The password was reset, but the student list could not be refreshed.");
      }
    } catch (error) {
      setToast({ type: "error", text: error.message || "Password reset failed." });
    } finally {
      submitLock.current = false;
      setPendingStudentId(null);
    }
  }

  const isSectionDetail = Boolean(sectionId);
  const visibleSections = sections.filter((item) => item.student_count > 0);

  return (
    <div className="min-h-full min-w-0 bg-[#FAFAF5] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-6">
          <p className="mb-1 text-xs uppercase tracking-[0.15em] text-[#8C6B12]">
            Gogon High School
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1
                className="text-2xl text-[#1B5E2C] sm:text-3xl"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                Student Management
              </h1>
              <p className="mt-1 text-sm text-[#5B6478]">
                {isSectionDetail
                  ? "View the students assigned to this section."
                  : "Browse sections and their enrolled student lists."}
              </p>
            </div>
            {isSectionDetail && (
              <button
                type="button"
                onClick={() => navigate(`/students?enrollment_period_id=${encodeURIComponent(activePeriodId)}`)}
                className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#CBD9C8] bg-white px-4 py-2.5 text-sm font-medium text-[#1B5E2C] transition-colors hover:bg-[#EFF4ED]"
              >
                <span aria-hidden="true">←</span> All sections
              </button>
            )}
          </div>
        </header>

        {!isSectionDetail ? (
          <>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <label className="block w-full max-w-sm text-sm font-medium text-[#1B5E2C]">
                Enrollment Period
                <select
                  value={selectedPeriodId}
                  onChange={(event) => {
                    const periodId = event.target.value;
                    setSelectedPeriodId(periodId);
                    navigate(`/students?enrollment_period_id=${encodeURIComponent(periodId)}`, { replace: true });
                  }}
                  disabled={periodsLoading || enrollmentPeriods.length === 0}
                  className="mt-1.5 w-full rounded-lg border border-[#CBD9C8] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1B5E2C] disabled:opacity-60"
                >
                  {enrollmentPeriods.map((period) => (
                    <option key={period.enrollment_period_id} value={period.enrollment_period_id}>
                      {enrollmentPeriodLabel(period)}
                    </option>
                  ))}
                </select>
              </label>
              <p className="max-w-xl text-xs text-[#5B6478]">
                Select one enrollment period to filter sections, student lists, and CSV downloads.
              </p>
            </div>
            {periodsError && (
              <p role="alert" className="mb-4 rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 px-4 py-3 text-sm text-[#B3492B]">
                {periodsError}
              </p>
            )}
            {!periodsLoading && enrollmentPeriods.length === 0 && !periodsError && (
              <p className="mb-4 rounded-lg border border-[#CBD9C8] bg-white px-4 py-3 text-sm text-[#5B6478]">
                No enrollment periods are available.
              </p>
            )}
            <div className="mb-5 flex flex-wrap gap-2" aria-label="Filter by grade">
              <GradeFilterButton
                selected={gradeFilter === "all"}
                onClick={() => setGradeFilter("all")}
              >
                All Grades
              </GradeFilterButton>
              {GRADE_LEVELS.map((grade) => (
                <GradeFilterButton
                  key={grade}
                  selected={gradeFilter === String(grade)}
                  onClick={() => setGradeFilter(String(grade))}
                >
                  Grade {grade}
                </GradeFilterButton>
              ))}
            </div>

            {sectionsError && (
              <ErrorNotice message={sectionsError} onRetry={() => setSectionsReload((current) => current + 1)} />
            )}

            <div className="overflow-hidden rounded-2xl border border-[#D9E8D5] bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="bg-[#1B5E2C] text-[#FAFAF5]">
                      <th className="px-5 py-3 font-medium">Section Name</th>
                      <th className="px-5 py-3 font-medium">Grade Level</th>
                      <th className="px-5 py-3 font-medium">Strand</th>
                      <th className="px-5 py-3 font-medium">Total Students</th>
                      <th className="px-5 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionsLoading ? (
                      Array.from({ length: 4 }, (_, index) => (
                        <tr key={index} className="border-t border-[#EFF4ED]">
                          <td className="px-5 py-4" colSpan={5}>
                            <div className="h-4 max-w-md animate-pulse rounded bg-[#EFF4ED]" />
                          </td>
                        </tr>
                      ))
                    ) : sectionsError ? (
                      <tr className="border-t border-[#EFF4ED]">
                        <td colSpan={5} className="px-5 py-10 text-center text-sm text-[#5B6478]">
                          Sections could not be loaded.
                        </td>
                      </tr>
                    ) : visibleSections.length === 0 ? (
                      <tr className="border-t border-[#EFF4ED]">
                        <td colSpan={5} className="px-5 py-12 text-center text-[#5B6478]">
                          <p className="font-medium text-[#1B5E2C]">
                            No enrolled students found for this period
                          </p>
                          <p className="mt-1 text-sm">
                            {`No approved students were returned for ${selectedPeriod?.school_year || "this period"} and this grade filter.`}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      visibleSections.map((item) => (
                        <tr
                          key={item.section_id}
                          className="border-t border-[#EFF4ED] transition-colors hover:bg-[#FAFAF5]"
                        >
                          <td className="px-5 py-3.5 font-medium text-[#1B5E2C]">{item.section_name}</td>
                          <td className="px-5 py-3.5 text-[#5B6478]">Grade {item.grade_level}</td>
                          <td className="px-5 py-3.5 text-[#5B6478]" title="The section API does not provide strand data.">
                            —
                          </td>
                          <td className="px-5 py-3.5 text-[#5B6478]">{item.student_count}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const periodQuery = `?enrollment_period_id=${encodeURIComponent(activePeriodId)}`;
                                  navigate(`/students/sections/${item.section_id}${periodQuery}`, { state: { section: item } });
                                }}
                                className="rounded-lg border border-[#CBD9C8] px-3 py-2 text-xs font-medium text-[#1B5E2C] transition-colors hover:bg-[#EFF4ED]"
                              >
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownload(item)}
                                disabled={downloadingSectionId === item.section_id}
                                aria-label={`Download student list for ${item.section_name}`}
                                title="Download student list as CSV"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B5E2C] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#164A22] disabled:cursor-wait disabled:opacity-60"
                              >
                                <DownloadIcon />
                                {downloadingSectionId === item.section_id ? "Downloading…" : "Download"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="mt-3 text-xs text-[#5B6478]">
              Strand information is not included in the Admin sections API response.
            </p>
          </>
        ) : (
          <section aria-labelledby="section-roster-title">
            <div className="mb-5 rounded-2xl border border-[#D9E8D5] bg-white p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#8C6B12]">
                    {section
                      ? `Grade ${section.grade_level} · ${enrollmentPeriodLabel(selectedPeriod)}`
                      : "Section"}
                  </p>
                  <h2 id="section-roster-title" className="mt-1 text-xl font-semibold text-[#1B5E2C]">
                    {section?.section_name || "Loading section…"}
                  </h2>
                </div>
                <div className="rounded-xl bg-[#EFF4ED] px-4 py-3 sm:min-w-40">
                  <p className="text-xs text-[#5B6478]">Total Students</p>
                  <p className="mt-0.5 text-xl font-semibold text-[#1B5E2C]">
                    {studentsLoading ? "…" : students.length}
                  </p>
                </div>
              </div>
            </div>

            {studentsError && (
              <ErrorNotice
                message={studentsError}
                onRetry={async () => {
                  setStudentsLoading(true);
                  setStudentsError("");
                  try {
                    await loadStudents(sectionId, activePeriodId);
                  } catch (error) {
                    setStudentsError(error.message || "Could not load students.");
                  } finally {
                    setStudentsLoading(false);
                  }
                }}
              />
            )}

            <div className="overflow-hidden rounded-2xl border border-[#D9E8D5] bg-white">
              <div className="border-b border-[#EFF4ED] px-5 py-4">
                <h3 className="font-semibold text-[#1B5E2C]">Student List</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead>
                    <tr className="bg-[#1B5E2C] text-[#FAFAF5]">
                      <th className="px-4 py-3 font-medium">LRN</th>
                      <th className="px-4 py-3 font-medium">Student Name</th>
                      <th className="px-4 py-3 font-medium">Grade Level</th>
                      <th className="px-4 py-3 font-medium">Section</th>
                      <th className="px-4 py-3 font-medium">Enrollment Status</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsLoading ? (
                      Array.from({ length: 4 }, (_, index) => (
                        <tr key={index} className="border-t border-[#EFF4ED]">
                          <td className="px-4 py-4" colSpan={6}>
                            <div className="h-4 max-w-md animate-pulse rounded bg-[#EFF4ED]" />
                          </td>
                        </tr>
                      ))
                    ) : studentsError ? (
                      <tr className="border-t border-[#EFF4ED]">
                        <td colSpan={6} className="px-5 py-10 text-center text-[#5B6478]">
                          Student records could not be loaded.
                        </td>
                      </tr>
                    ) : students.length === 0 ? (
                      <tr className="border-t border-[#EFF4ED]">
                        <td colSpan={6} className="px-5 py-12 text-center text-[#5B6478]">
                          <p className="font-medium text-[#1B5E2C]">No students assigned</p>
                          <p className="mt-1 text-sm">This section does not currently have enrolled students.</p>
                        </td>
                      </tr>
                    ) : (
                      students.map((student) => (
                        <tr key={student.student_id} className="border-t border-[#EFF4ED] hover:bg-[#FAFAF5]">
                          <td className="whitespace-nowrap px-4 py-3.5 font-medium text-[#1B5E2C]">{student.lrn}</td>
                          <td className="px-4 py-3.5 text-[#263238]">{studentName(student)}</td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-[#5B6478]">Grade {student.grade_level}</td>
                          <td className="px-4 py-3.5 text-[#5B6478]">{student.section_name}</td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex rounded-full bg-[#1B5E2C]/10 px-2.5 py-1 text-xs font-medium text-[#1B5E2C]">
                              {student.enrollment_status || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => setResetStudent(student)}
                              disabled={pendingStudentId === student.student_id}
                              className="whitespace-nowrap rounded-lg border border-[#B3492B]/30 px-3 py-2 text-xs font-medium text-[#B3492B] transition-colors hover:bg-[#B3492B]/5 disabled:cursor-wait disabled:opacity-60"
                            >
                              Reset Password
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="mt-3 text-xs text-[#5B6478]">
              Cellphone number and Gmail are not included in the Admin roster API response.
            </p>
          </section>
        )}
      </div>

      {resetStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !pendingStudentId) setResetStudent(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-dialog-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6"
          >
            <h2 id="reset-dialog-title" className="text-lg font-semibold text-[#1B5E2C]">
              Reset student password?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#5B6478]">
              Are you sure you want to reset this student&apos;s password? The password will be reset to their LRN.
              The student will be required to create a new password on their next login.
            </p>
            <p className="mt-3 rounded-lg bg-[#EFF4ED] px-3 py-2 text-sm font-medium text-[#1B5E2C]">
              {studentName(resetStudent)}
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setResetStudent(null)}
                disabled={Boolean(pendingStudentId)}
                className="rounded-lg border border-[#CBD9C8] px-4 py-2.5 text-sm font-medium text-[#1B5E2C] hover:bg-[#EFF4ED] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={Boolean(pendingStudentId)}
                className="rounded-lg bg-[#B3492B] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#963A22] disabled:cursor-wait disabled:opacity-60"
              >
                {pendingStudentId ? "Resetting…" : "Confirm Reset"}
              </button>
            </div>
          </section>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className={`fixed bottom-4 right-4 z-[60] max-w-sm rounded-xl px-4 py-3 text-sm text-white shadow-lg ${
            toast.type === "success" ? "bg-[#1B5E2C]" : "bg-[#B3492B]"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

function GradeFilterButton({ selected, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        selected
          ? "border-[#1B5E2C] bg-[#1B5E2C] text-white"
          : "border-[#CBD9C8] bg-white text-[#1B5E2C] hover:bg-[#EFF4ED]"
      }`}
    >
      {children}
    </button>
  );
}

function ErrorNotice({ message, onRetry }) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 px-4 py-3 text-sm text-[#B3492B] sm:flex-row sm:items-center sm:justify-between">
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="w-fit rounded-md border border-[#B3492B]/30 px-3 py-1.5 font-medium hover:bg-white/60"
      >
        Retry
      </button>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M10 2.5v9m0 0 3.5-3.5M10 11.5 6.5 8M3.5 13.5v2A1.5 1.5 0 0 0 5 17h10a1.5 1.5 0 0 0 1.5-1.5v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
