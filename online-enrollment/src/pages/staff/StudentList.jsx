import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { apiUrl } from "../../config";

const API_BASE = apiUrl("/backend-online-enrollment/staff");
const JUNIOR_HIGH_GRADES = [7, 8, 9, 10];
const SENIOR_HIGH_GRADES = [11, 12];

function formatSchoolYear(schoolYear) {
  return String(schoolYear ?? "").replace(/^(\d{4})-(\d{4})$/, "$1–$2");
}

function disclosureStatus(value) {
  return value === "Yes" || value === "No" ? value : "Not recorded";
}

function periodCoverageLabel(period) {
  const coverage = period.coverage === "shs_second_semester"
    ? "Senior High School"
    : "All Grade Levels";
  const semester = period.semester === "2nd sem" ? "2nd Semester" : "1st Semester";
  return `${coverage} · ${semester}`;
}

export default function StudentList({ onSessionExpired }) {
  const location = useLocation();
  const onSiteEnrollmentSuccess = location.state?.onSiteEnrollmentSuccess;
  const [periods, setPeriods] = useState([]);
  const [students, setStudents] = useState([]);
  const [recordsWithoutPeriod, setRecordsWithoutPeriod] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedSchoolYear, setSelectedSchoolYear] = useState(null);
  const [levelSelection, setLevelSelection] = useState(null);
  const [selectedSectionKey, setSelectedSectionKey] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pwdFilter, setPwdFilter] = useState("All");
  const [fourPsFilter, setFourPsFilter] = useState("All");

  const [detailsFor, setDetailsFor] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_BASE}/get_enrolled_students.php`, {
          credentials: "include",
        });

        if (response.status === 401) {
          if (typeof onSessionExpired === "function") {
            await onSessionExpired();
            return;
          }
          throw new Error("Your staff session has expired. Please sign in again.");
        }

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Could not load student enrollment records.");
        }

        if (active) {
          setPeriods(Array.isArray(data.periods) ? data.periods : []);
          setStudents(Array.isArray(data.students) ? data.students : []);
          setRecordsWithoutPeriod(Number(data.records_without_enrollment_period) || 0);
        }
      } catch (loadError) {
        if (active) {
          setPeriods([]);
          setStudents([]);
          setError(loadError instanceof Error ? loadError.message : "Could not reach the server.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => { active = false; };
  }, [onSessionExpired, refreshKey]);

  const schoolYearGroups = useMemo(() => {
    const groups = new Map();
    periods.forEach((period) => {
      const schoolYear = String(period.school_year ?? "");
      if (!schoolYear) return;
      if (!groups.has(schoolYear)) groups.set(schoolYear, []);
      groups.get(schoolYear).push(period);
    });

    return [...groups.entries()]
      .map(([school_year, groupPeriods]) => ({
        school_year,
        periods: groupPeriods.slice().sort((a, b) =>
          String(a.semester).localeCompare(String(b.semester)),
        ),
      }))
      .sort((a, b) => b.school_year.localeCompare(a.school_year));
  }, [periods]);

  const currentYearGroup = schoolYearGroups.find(
    (group) => group.school_year === selectedSchoolYear,
  );
  const allGradePeriod = currentYearGroup?.periods.find(
    (period) => period.coverage === "all_grade_levels",
  );
  const secondSemesterPeriod = currentYearGroup?.periods.find(
    (period) => period.coverage === "shs_second_semester",
  );

  const gradeStudents = useMemo(() => {
    if (!levelSelection || !currentYearGroup) return [];
    return students.filter((student) =>
      String(student.school_year) === currentYearGroup.school_year
      && String(student.enrollment_period_id) === String(levelSelection.periodId)
      && Number(student.grade_level) === levelSelection.grade
      && (!levelSelection.semester || student.semester === levelSelection.semester),
    );
  }, [students, levelSelection, currentYearGroup]);

  const sections = useMemo(() => {
    const sectionMap = new Map();
    const seenStudents = new Set();

    gradeStudents.forEach((student) => {
      const studentKey = String(student.student_id);
      if (seenStudents.has(studentKey)) return;
      seenStudents.add(studentKey);

      const key = student.section_id === null || student.section_id === undefined
        ? "unassigned"
        : String(student.section_id);
      if (!sectionMap.has(key)) {
        sectionMap.set(key, {
          key,
          sectionId: student.section_id,
          sectionName: student.section_name || "Unassigned section",
          strandName: student.strand_name || null,
          students: [],
        });
      }
      sectionMap.get(key).students.push(student);
    });

    return [...sectionMap.values()].sort((a, b) => {
      if (a.key === "unassigned") return 1;
      if (b.key === "unassigned") return -1;
      return a.sectionName.localeCompare(b.sectionName);
    });
  }, [gradeStudents]);

  const selectedSection = sections.find((section) => section.key === selectedSectionKey);
  const visibleStudents = useMemo(() => {
    if (!selectedSection) return [];
    const query = searchTerm.trim().toLowerCase();
    return selectedSection.students
      .filter((student) => {
        if (pwdFilter !== "All" && student.is_pwd !== pwdFilter) return false;
        if (fourPsFilter !== "All" && student.is_4ps_beneficiary !== fourPsFilter) return false;
        if (!query) return true;
        return [
          student.name,
          student.student_id,
          student.lrn,
        ].some((value) => String(value ?? "").toLowerCase().includes(query));
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedSection, searchTerm, pwdFilter, fourPsFilter]);

  async function openDetails(enrollmentId) {
    if (!enrollmentId) return;
    setDetailsFor(enrollmentId);
    setDetails(null);
    setDetailsError("");
    setDetailsLoading(true);

    try {
      const query = new URLSearchParams({ enrollment_id: String(enrollmentId) });
      const response = await fetch(`${API_BASE}/get_student_details.php?${query}`, {
        credentials: "include",
      });

      if (response.status === 401) {
        if (typeof onSessionExpired === "function") {
          await onSessionExpired();
          return;
        }
        throw new Error("Your staff session has expired. Please sign in again.");
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not load this enrollment record.");
      }
      setDetails(data.student);
    } catch (detailError) {
      setDetailsError(detailError instanceof Error
        ? detailError.message
        : "Could not reach the server.");
    } finally {
      setDetailsLoading(false);
    }
  }

  function closeDetails() {
    setDetailsFor(null);
    setDetails(null);
    setDetailsError("");
  }

  function selectSchoolYear(schoolYear) {
    closeDetails();
    setSelectedSchoolYear(schoolYear);
    setLevelSelection(null);
    setSelectedSectionKey(null);
    setSearchTerm("");
  }

  function selectGrade(grade, semester, period) {
    if (!period) return;
    closeDetails();
    setLevelSelection({
      grade,
      semester,
      periodId: period.enrollment_period_id,
    });
    setSelectedSectionKey(null);
    setSearchTerm("");
  }

  function downloadCurrentSection() {
    if (visibleStudents.length === 0 || !currentYearGroup || !levelSelection || !selectedSection) return;

    const rows = [
      ["Student ID", "Student Name", "School Year", "Semester", "Grade Level", "Section", "Enrollment Status"],
      ...visibleStudents.map((student) => [
        student.student_id,
        student.name,
        currentYearGroup.school_year,
        levelSelection.semester || "Not applicable",
        `Grade ${levelSelection.grade}`,
        selectedSection.sectionName,
        student.enrollment_status,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) =>
        `"${String(value ?? "").replace(/"/g, '""')}"`,
      ).join(","))
      .join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentYearGroup.school_year}-grade-${levelSelection.grade}-${selectedSection.sectionName}`
      .replace(/[^a-z0-9.-]+/gi, "-")
      .replace(/^-|-$/g, "")
      + ".csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const breadcrumb = (
    <nav aria-label="Student management path" className="flex flex-wrap items-center gap-2 text-sm">
      <button
        type="button"
        onClick={() => selectSchoolYear(null)}
        className="font-medium text-[#1B5E2C] hover:underline"
      >
        School Years
      </button>
      {currentYearGroup && (
        <>
          <span className="text-[#86A18A]" aria-hidden="true">/</span>
          <button
            type="button"
            onClick={() => {
              closeDetails();
              setLevelSelection(null);
              setSelectedSectionKey(null);
            }}
            className={`font-medium ${levelSelection ? "text-[#1B5E2C] hover:underline" : "text-[#5B6478]"}`}
            disabled={!levelSelection}
          >
            {formatSchoolYear(currentYearGroup.school_year)}
          </button>
        </>
      )}
      {levelSelection && (
        <>
          <span className="text-[#86A18A]" aria-hidden="true">/</span>
          <button
            type="button"
            onClick={() => {
              closeDetails();
              setSelectedSectionKey(null);
            }}
            className={`font-medium ${selectedSectionKey ? "text-[#1B5E2C] hover:underline" : "text-[#5B6478]"}`}
            disabled={!selectedSectionKey}
          >
            Grade {levelSelection.grade}{levelSelection.semester ? ` · ${levelSelection.semester}` : ""}
          </button>
        </>
      )}
      {selectedSection && (
        <>
          <span className="text-[#86A18A]" aria-hidden="true">/</span>
          <span className="text-[#5B6478]">{selectedSection.sectionName}</span>
        </>
      )}
    </nav>
  );

  return (
    <div className="space-y-5 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.15em] text-[#8C6B12]">Staff Portal</p>
          <h2 className="text-xl text-[#1B5E2C] sm:text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>
            Student Management
          </h2>
          <p className="mt-1 text-sm text-[#86A18A]">
            Browse current enrollment records by school year, grade, semester, and section.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((key) => key + 1)}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-[#D9E8D5] px-3 py-2 text-sm text-[#1B5E2C] transition-colors hover:bg-[#D9E8D5]/40 disabled:opacity-50 sm:self-auto"
        >
          <RefreshIcon />
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {recordsWithoutPeriod > 0 && (
        <p role="status" className="rounded-xl border border-[#8C6B12]/30 bg-[#FBF0DA] px-4 py-3 text-sm text-[#765B12]">
          {recordsWithoutPeriod} enrollment record{recordsWithoutPeriod === 1 ? "" : "s"} have no associated enrollment period.
          They are not placed into a school-year group because their period cannot be verified.
        </p>
      )}

      {onSiteEnrollmentSuccess && (
        <p role="status" className="rounded-xl border border-[#1B5E2C]/30 bg-[#1B5E2C]/10 px-4 py-3 text-sm text-[#1B5E2C]">
          On-Site enrollment for LRN {onSiteEnrollmentSuccess.lrn} was saved and approved for Grade {onSiteEnrollmentSuccess.grade_level}. Student enrollment records are loading below.
        </p>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-[#B3492B]/30 bg-[#B3492B]/10 px-4 py-3 text-sm text-[#B3492B]">
          {error}
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            className="ml-2 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {selectedSchoolYear && breadcrumb}

      {loading ? (
        <div className="rounded-2xl border border-[#D9E8D5] bg-white px-4 py-12 text-center text-sm text-[#86A18A]">
          Loading school-year groups…
        </div>
      ) : !error && !selectedSchoolYear ? (
        schoolYearGroups.length === 0 ? (
          <div className="rounded-2xl border border-[#D9E8D5] bg-white px-4 py-12 text-center text-sm text-[#86A18A]">
            No enrollment periods are available for Student Management.
          </div>
        ) : (
          <section aria-labelledby="school-years-heading">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h3 id="school-years-heading" className="text-base font-semibold text-[#1B5E2C]">
                  School Year Groups
                </h3>
                <p className="mt-1 text-sm text-[#86A18A]">
                  Periods with the same school year are grouped together.
                </p>
              </div>
              <span className="rounded-full bg-[#D9E8D5] px-3 py-1 text-xs font-medium text-[#1B5E2C]">
                {schoolYearGroups.length} school year{schoolYearGroups.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {schoolYearGroups.map((group) => (
                <button
                  key={group.school_year}
                  type="button"
                  onClick={() => selectSchoolYear(group.school_year)}
                  className="rounded-2xl border border-[#D9E8D5] bg-white p-5 text-left shadow-sm transition hover:border-[#1B5E2C] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#F2BE22]"
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8C6B12]">
                    School Year
                  </span>
                  <span className="mt-1 block text-2xl font-semibold text-[#1B5E2C]" style={{ fontFamily: "'Fraunces', serif" }}>
                    {formatSchoolYear(group.school_year)}
                  </span>
                  <span className="mt-4 flex flex-wrap gap-2">
                    {group.periods.map((period) => (
                      <span key={period.enrollment_period_id} className="rounded-full bg-[#F0F5EF] px-2.5 py-1 text-xs text-[#426147]">
                        {periodCoverageLabel(period)}
                      </span>
                    ))}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )
      ) : null}

      {currentYearGroup && !loading && !error && !levelSelection && (
        <div className="space-y-5">
          <section className="rounded-2xl border border-[#D9E8D5] bg-white p-4 sm:p-5">
            <h3 className="mb-3 text-base font-semibold text-[#1B5E2C]">
              Enrollment Periods · {formatSchoolYear(currentYearGroup.school_year)}
            </h3>
            <div className="flex flex-wrap gap-2">
              {currentYearGroup.periods.map((period) => (
                <span key={period.enrollment_period_id} className="rounded-lg border border-[#D9E8D5] bg-[#FAFAF5] px-3 py-2 text-sm text-[#426147]">
                  {periodCoverageLabel(period)}
                  <span className="ml-2 text-xs text-[#86A18A]">· {period.status}</span>
                </span>
              ))}
            </div>
          </section>

          <GradeHierarchy
            allGradePeriod={allGradePeriod}
            secondSemesterPeriod={secondSemesterPeriod}
            onSelect={selectGrade}
          />
        </div>
      )}

      {levelSelection && !loading && !error && !selectedSectionKey && (
        <section className="rounded-2xl border border-[#D9E8D5] bg-white p-4 sm:p-5">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.15em] text-[#86A18A]">Section List</p>
            <h3 className="mt-1 text-lg font-semibold text-[#1B5E2C]">
              Grade {levelSelection.grade}
              {levelSelection.semester ? ` · ${levelSelection.semester}` : ""}
            </h3>
          </div>
          {sections.length === 0 ? (
            <p className="rounded-xl bg-[#FAFAF5] px-4 py-8 text-center text-sm text-[#86A18A]">
              No section enrollment records were found for this grade and term.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {sections.map((section) => (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => {
                    closeDetails();
                    setSelectedSectionKey(section.key);
                    setSearchTerm("");
                  }}
                  className="flex items-center justify-between gap-4 rounded-xl border border-[#D9E8D5] bg-[#FAFAF5] p-4 text-left transition hover:border-[#1B5E2C] hover:bg-[#F0F5EF] focus:outline-none focus:ring-2 focus:ring-[#F2BE22]"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-[#1B5E2C]">{section.sectionName}</span>
                    {section.strandName && <span className="mt-1 block text-xs text-[#86A18A]">{section.strandName}</span>}
                  </span>
                  <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-medium text-[#1B5E2C]">
                    {section.students.length} student{section.students.length === 1 ? "" : "s"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {selectedSection && levelSelection && !loading && !error && (
        <section className="overflow-hidden rounded-2xl border border-[#D9E8D5] bg-white">
          <div className="flex flex-col gap-3 border-b border-[#D9E8D5] bg-[#F7F9F6] px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-[#86A18A]">Student List</p>
              <h3 className="mt-1 text-lg font-semibold text-[#1B5E2C]">
                Grade {levelSelection.grade}
                {levelSelection.semester ? ` · ${levelSelection.semester}` : ""}
                {" · "}{selectedSection.sectionName}
              </h3>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor="student-management-search">Search students</label>
              <input
                id="student-management-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search name, ID, or LRN"
                className="min-w-0 rounded-lg border border-[#CBD9C8] bg-white px-3 py-2 text-sm text-[#1B5E2C] outline-none focus:ring-2 focus:ring-[#F2BE22] sm:w-64"
              />
              <button
                type="button"
                onClick={downloadCurrentSection}
                disabled={visibleStudents.length === 0}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#1B5E2C] px-3 py-2 text-sm font-medium text-[#1B5E2C] hover:bg-[#D9E8D5] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <DownloadIcon />
                Download CSV
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3 border-b border-[#D9E8D5] px-4 py-3">
            <label className="text-xs font-medium text-[#5B6478]" htmlFor="student-management-pwd-filter">
              PWD Status
              <select
                id="student-management-pwd-filter"
                value={pwdFilter}
                onChange={(event) => setPwdFilter(event.target.value)}
                className="mt-1 block rounded-lg border border-[#CBD9C8] bg-white px-3 py-2 text-sm text-[#1B5E2C]"
              >
                <option>All</option>
                <option>Yes</option>
                <option>No</option>
              </select>
            </label>
            <label className="text-xs font-medium text-[#5B6478]" htmlFor="student-management-4ps-filter">
              4Ps Beneficiary Status
              <select
                id="student-management-4ps-filter"
                value={fourPsFilter}
                onChange={(event) => setFourPsFilter(event.target.value)}
                className="mt-1 block rounded-lg border border-[#CBD9C8] bg-white px-3 py-2 text-sm text-[#1B5E2C]"
              >
                <option>All</option>
                <option>Yes</option>
                <option>No</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                setPwdFilter("All");
                setFourPsFilter("All");
                setSearchTerm("");
              }}
              disabled={pwdFilter === "All" && fourPsFilter === "All" && !searchTerm}
              className="rounded-lg border border-[#CBD9C8] px-3 py-2 text-sm font-medium text-[#1B5E2C] hover:bg-[#F7F9F6] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear Filters
            </button>
            <p className="ml-auto self-center text-xs text-[#5B6478]">
              Showing {visibleStudents.length} of {selectedSection.students.length} students
            </p>
          </div>

          {visibleStudents.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-[#86A18A]">
              {selectedSection.students.length === 0
                ? "No students are assigned to this section."
                : "No students match the current filters or search."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-white text-xs uppercase tracking-wide text-[#86A18A]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Student ID</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">PWD</th>
                    <th className="px-4 py-3 font-medium">4Ps</th>
                    <th className="px-4 py-3 font-medium">Submitted</th>
                    <th className="px-4 py-3 font-medium text-right">Record</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFF4ED]">
                  {visibleStudents.map((student) => (
                    <tr key={student.enrollment_id} className="text-[#1B5E2C]">
                      <td className="px-4 py-3 font-medium">{student.name}</td>
                      <td className="px-4 py-3 text-[#5B6478]">{student.student_id}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={student.enrollment_status} />
                      </td>
                      <td className="px-4 py-3 text-[#5B6478]">{disclosureStatus(student.is_pwd)}</td>
                      <td className="px-4 py-3 text-[#5B6478]">{disclosureStatus(student.is_4ps_beneficiary)}</td>
                      <td className="px-4 py-3 text-[#5B6478]">
                        {student.submitted_at ? new Date(student.submitted_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openDetails(student.enrollment_id)}
                          className="rounded-lg border border-[#D9E8D5] px-3 py-1.5 text-xs font-medium text-[#1B5E2C] hover:bg-[#F7F9F6]"
                        >
                          View Record
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {detailsFor && (
        <StudentDetailsModal
          loading={detailsLoading}
          error={detailsError}
          student={details}
          onClose={closeDetails}
        />
      )}
    </div>
  );
}

function GradeHierarchy({ allGradePeriod, secondSemesterPeriod, onSelect }) {
  const gradeButton = (grade, semester, period, label) => (
    <button
      key={`${grade}-${semester ?? "annual"}`}
      type="button"
      onClick={() => onSelect(grade, semester, period)}
      disabled={!period}
      title={!period ? "No enrollment period exists for this school year and term." : undefined}
      className="rounded-xl border border-[#D9E8D5] bg-[#FAFAF5] px-4 py-3 text-sm font-semibold text-[#1B5E2C] transition hover:border-[#1B5E2C] hover:bg-[#F0F5EF] focus:outline-none focus:ring-2 focus:ring-[#F2BE22] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-[#D9E8D5] bg-white p-4 sm:p-5">
        <h3 className="mb-3 text-base font-semibold text-[#1B5E2C]">Junior High School</h3>
        <div className="flex flex-wrap gap-2">
          {JUNIOR_HIGH_GRADES.map((grade) => gradeButton(grade, null, allGradePeriod, `Grade ${grade}`))}
        </div>
      </section>
      <section className="rounded-2xl border border-[#D9E8D5] bg-white p-4 sm:p-5">
        <h3 className="mb-3 text-base font-semibold text-[#1B5E2C]">Senior High School</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {SENIOR_HIGH_GRADES.map((grade) => (
            <div key={grade} className="space-y-2">
              <p className="text-sm font-medium text-[#5B6478]">Grade {grade}</p>
              <div className="flex flex-wrap gap-2">
                {gradeButton(grade, "1st sem", allGradePeriod, "1st Semester")}
                {gradeButton(grade, "2nd sem", secondSemesterPeriod, "2nd Semester")}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = status === "Approved"
    ? "bg-[#E7F4E8] text-[#1B5E2C]"
    : status === "Pending"
      ? "bg-[#FBF0DA] text-[#765B12]"
      : "bg-[#FDEBE7] text-[#B3492B]";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>
      {status || "Unknown"}
    </span>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M16.5 8A6.5 6.5 0 0 0 5 5.2L3.5 7M3.5 7V3.5M3.5 7H7M3.5 12A6.5 6.5 0 0 0 15 14.8l1.5-1.8M16.5 13v3.5M16.5 13H13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 2.5v10m0 0 3.5-3.5M10 12.5 6.5 9M3.5 14.5v1.25A1.75 1.75 0 0 0 5.25 17.5h9.5a1.75 1.75 0 0 0 1.75-1.75V14.5" />
    </svg>
  );
}

function StudentDetailsModal({ loading, error, student, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium text-[#1B5E2C]" style={{ fontFamily: "'Fraunces', serif" }}>
            Student Record
          </h3>
          <button type="button" onClick={onClose} className="text-[#86A18A] hover:text-[#1B5E2C]" aria-label="Close">
            ✕
          </button>
        </div>

        {loading && <p className="py-6 text-center text-sm text-[#86A18A]">Loading record…</p>}
        {error && !loading && <p role="alert" className="py-6 text-center text-sm text-[#B3492B]">{error}</p>}

        {!loading && !error && student && (
          <div className="space-y-5">
            <InfoSection title="Personal Information">
              <InfoRow label="Full Name" value={[student.first_name, student.middle_name, student.last_name, student.extension_name].filter(Boolean).join(" ")} />
              <InfoRow label="LRN" value={student.lrn} />
              <InfoRow label="Date of Birth" value={student.date_of_birth} />
              <InfoRow label="Contact No." value={student.contact_no} />
              <InfoRow label="Email" value={student.gmail} />
              <InfoRow label="Address" value={[student.house_number_street, student.barangay, student.city_municipality, student.province].filter(Boolean).join(", ")} />
            </InfoSection>

            <InfoSection title="Guardian">
              <InfoRow label="Name" value={student.guardian_fullname || student.guardian_name} />
              <InfoRow label="Contact No." value={student.guardian_contact_no || student.guardian_contact_number} />
            </InfoSection>

            <InfoSection title="Enrollment">
              <InfoRow label="School Year" value={student.school_year ? formatSchoolYear(student.school_year) : "Enrollment period not recorded"} />
              <InfoRow label="Semester" value={student.semester} />
              <InfoRow label="Grade Level" value={student.grade_level ? `Grade ${student.grade_level}` : null} />
              <InfoRow label="Section" value={student.section_assigned || student.section_name} />
              <InfoRow label="Strand" value={student.strand_name} />
              <InfoRow label="Student Type" value={student.student_type} />
              <InfoRow label="Status" value={student.enrollment_status} />
              <InfoRow label="PWD status" value={disclosureStatus(student.is_pwd)} />
              {student.is_pwd === "Yes" && <InfoRow label="PWD specification" value={student.pwd_specification} />}
              <InfoRow label="4Ps beneficiary" value={disclosureStatus(student.is_4ps_beneficiary)} />
              {student.is_4ps_beneficiary === "Yes" && (
                <InfoRow label="4Ps Household ID Number" value={student.four_ps_household_id} />
              )}
            </InfoSection>

            <InfoSection title="Requirements">
              <InfoRow label="Report Card (Front)" value={student.report_card_front ? "Uploaded" : "Not uploaded"} />
              <InfoRow label="Report Card (Back)" value={student.report_card_back ? "Uploaded" : "Not uploaded"} />
              <InfoRow label="PSA Birth Certificate" value={student.psa_birth_certificate ? "Uploaded" : "Not uploaded"} />
              <InfoRow label="Good Moral" value={student.good_moral ? "Uploaded" : "Not uploaded"} />
              <InfoRow label="Certificate of Transfer" value={student.certificate_of_transfer ? "Uploaded" : "Not uploaded"} />
            </InfoSection>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoSection({ title, children }) {
  return (
    <section>
      <p className="mb-2 text-xs uppercase tracking-[0.12em] text-[#86A18A]">{title}</p>
      <div className="divide-y divide-[#EFF4ED] rounded-xl border border-[#D9E8D5] bg-[#FAFAF5]">
        {children}
      </div>
    </section>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="w-36 shrink-0 text-xs text-[#86A18A]">{label}</span>
      <span className="text-sm font-medium text-[#1B5E2C]">{value || "—"}</span>
    </div>
  );
}
