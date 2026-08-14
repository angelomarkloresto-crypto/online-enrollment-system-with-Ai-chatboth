import { useEffect, useMemo, useState } from "react";

const gradeOptions = [7, 8, 9, 10, 11, 12];
const API_BASE = "http://localhost/backend-online-enrollment/staff";

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [strands, setStrands] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState(7);
  // For JHS this is the "section"; for SHS this is the "block" — both are
  // just sections.section_name, filtered differently. Kept as one piece of
  // state since they're the same underlying selection, just labeled
  // differently in the UI per grade level.
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedStrand, setSelectedStrand] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Student details modal ──
  const [detailsFor, setDetailsFor] = useState(null); // enrollment_id or null
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [studentRes, sectionRes, strandRes] = await Promise.all([
          fetch(`${API_BASE}/get_enrolled_students.php`, { credentials: "include" }),
          fetch(`${API_BASE}/get_sections.php`, { credentials: "include" }),
          fetch(`${API_BASE}/get_strand.php`, { credentials: "include" }),
        ]);

        const [studentRaw, sectionRaw, strandRaw] = await Promise.all([
          studentRes.text(),
          sectionRes.text(),
          strandRes.text(),
        ]);

        if (!mounted) return;

        let studentData = {};
        let sectionData = {};
        let strandData = {};

        try { studentData = studentRaw ? JSON.parse(studentRaw) : {}; } catch {
          throw new Error(studentRaw || "Student list response was not valid JSON.");
        }

        try { sectionData = sectionRaw ? JSON.parse(sectionRaw) : {}; } catch {
          throw new Error(sectionRaw || "Section list response was not valid JSON.");
        }

        try { strandData = strandRaw ? JSON.parse(strandRaw) : {}; } catch {
          throw new Error(strandRaw || "Strand list response was not valid JSON.");
        }

        if (studentData && Array.isArray(studentData.students)) {
          setStudents(studentData.students);
        } else {
          setStudents([]);
          if (studentData && studentData.message) {
            setError(studentData.message);
          }
        }

        if (sectionData && Array.isArray(sectionData.sections)) {
          setSections(sectionData.sections);
        } else {
          setSections([]);
        }

        if (strandData && Array.isArray(strandData.strands)) {
          setStrands(strandData.strands);
        } else {
          setStrands([]);
        }
      } catch (err) {
        if (!mounted) return;
        setStudents([]);
        setSections([]);
        setStrands([]);
        setError(err instanceof Error ? err.message : "Could not load student list from the server.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => { mounted = false; };
  }, []);

  const isSeniorHigh = selectedGrade >= 11;

  // Sections for the currently selected grade. For SHS, further narrowed to
  // the currently selected strand — a strand+grade combo can have more than
  // one section (what the wireframe calls "blocks": Block A, Block B, ...),
  // and those are just rows in the same `sections` table, not a separate
  // concept.
  const sectionOptions = useMemo(() => {
    const items = sections
      .filter((section) => Number(section.grade_level) === Number(selectedGrade))
      .filter((section) => !isSeniorHigh || !selectedStrand || section.strand_name === selectedStrand)
      .map((section) => section.section_name)
      .filter(Boolean);

    return [...new Set(items)];
  }, [sections, selectedGrade, isSeniorHigh, selectedStrand]);

  const strandOptions = useMemo(() => {
    const items = strands
      .map((strand) => strand.strand_name)
      .filter(Boolean);

    return [...new Set(items)];
  }, [strands]);

  const normalizedStudents = useMemo(() =>
    students.map((student) => {
      const rawId = student.student_id ?? student.id ?? 0;
      const rawGrade = student.grade_level ?? student.grade ?? 0;
      const rawSection = student.section_name ?? student.section_assigned ?? student.section ?? "";
      const rawStrand = student.strand_name ?? student.strand ?? null;
      const fullName =
        [student.first_name, student.middle_name, student.last_name]
          .filter(Boolean)
          .join(" ") || student.name || "Student";

      return {
        id: Number(rawId),
        enrollmentId: student.enrollment_id ?? null,
        name: fullName,
        grade: Number(rawGrade),
        section: String(rawSection || ""),
        strand: rawStrand ? String(rawStrand) : null,
      };
    }),
    [students]
  );

  // Reset the section/block choice to the first available option whenever
  // the pool of valid options changes (grade or strand switched).
  useEffect(() => {
    setSelectedSection(sectionOptions[0] ?? "");
  }, [sectionOptions]);

  useEffect(() => {
    if (isSeniorHigh && !selectedStrand && strandOptions.length) {
      setSelectedStrand(strandOptions[0]);
    }
  }, [isSeniorHigh, strandOptions, selectedStrand]);

  const filteredStudents = useMemo(() => {
    return normalizedStudents.filter((student) => {
      const matchesGrade = student.grade === selectedGrade;
      const matchesStrand = !isSeniorHigh || !selectedStrand || student.strand === selectedStrand;
      const matchesSection = !selectedSection || student.section === selectedSection;
      const matchesSearch = !searchTerm
        || student.name.toLowerCase().includes(searchTerm.toLowerCase())
        || String(student.id).includes(searchTerm);

      return matchesGrade && matchesStrand && matchesSection && matchesSearch;
    });
  }, [normalizedStudents, selectedGrade, selectedStrand, selectedSection, searchTerm, isSeniorHigh]);

  const currentGradeLabel = `Grade ${selectedGrade}`;

  async function openDetails(enrollmentId) {
    if (!enrollmentId) return;
    setDetailsFor(enrollmentId);
    setDetails(null);
    setDetailsError("");
    setDetailsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/get_student_details.php?enrollment_id=${enrollmentId}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (data.success) {
        setDetails(data.student);
      } else {
        setDetailsError(data.message || "Could not load student details.");
      }
    } catch {
      setDetailsError("Could not reach the server.");
    } finally {
      setDetailsLoading(false);
    }
  }

  function closeDetails() {
    setDetailsFor(null);
    setDetails(null);
    setDetailsError("");
  }

  return (
    <div className="px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-[#8C6B12] mb-1">Staff Portal</p>
          <h2
            className="text-xl sm:text-2xl text-[#1B5E2C]"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            Student List
          </h2>
        </div>
        <div className="w-full sm:max-w-sm">
          <label className="block text-xs font-medium uppercase tracking-[0.12em] text-[#5B6478] mb-2">
            Search student
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or ID"
            className="w-full rounded-xl border border-[#CBD9C8] bg-white px-4 py-2.5 text-sm text-[#1B5E2C] placeholder:text-[#86A18A] focus:outline-none focus:ring-2 focus:ring-[#F2BE22]"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[#B3492B]/30 bg-[#B3492B]/10 px-4 py-3 text-sm text-[#B3492B]">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-[#D9E8D5] bg-white p-4 sm:p-5 shadow-sm">
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-[#1B5E2C] mb-3">Choose grade level</p>
            <div className="flex flex-wrap gap-3">
              {gradeOptions.map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => {
                    setSelectedGrade(grade);
                    setSelectedSection("");
                    if (grade < 11) setSelectedStrand("");
                  }}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                    selectedGrade === grade
                      ? "border-[#1B5E2C] bg-[#1B5E2C] text-white shadow-sm"
                      : "border-[#B7CDB5] bg-[#FAFAF5] text-[#1B5E2C] hover:border-[#1B5E2C]"
                  }`}
                >
                  Grade {grade}
                </button>
              ))}
            </div>
          </div>

          {isSeniorHigh && (
            <div>
              <p className="text-sm font-medium text-[#1B5E2C] mb-3">Choose strand</p>
              <div className="flex flex-wrap gap-3">
                {strandOptions.map((strand) => (
                  <button
                    key={strand}
                    type="button"
                    onClick={() => { setSelectedStrand(strand); setSelectedSection(""); }}
                    className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                      selectedStrand === strand
                        ? "border-[#1B5E2C] bg-[#D9E8D5] text-[#1B5E2C]"
                        : "border-[#B7CDB5] bg-white text-[#5B6478] hover:border-[#1B5E2C]"
                    }`}
                  >
                    {strand}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-[#1B5E2C] mb-3">
              {isSeniorHigh ? "Choose block" : "Choose section"}
            </p>
            <div className="flex flex-wrap gap-3">
              {sectionOptions.length === 0 ? (
                <p className="text-sm text-[#86A18A]">
                  No {isSeniorHigh ? "blocks" : "sections"} found for this selection.
                </p>
              ) : (
                sectionOptions.map((section) => (
                  <button
                    key={section}
                    type="button"
                    onClick={() => setSelectedSection(section)}
                    className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                      selectedSection === section
                        ? "border-[#1B5E2C] bg-[#F2BE22] text-[#1B5E2C]"
                        : "border-[#B7CDB5] bg-white text-[#5B6478] hover:border-[#1B5E2C]"
                    }`}
                  >
                    {section}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#D9E8D5] bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#D9E8D5] bg-[#F7F9F6] px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-[#86A18A]">Current View</p>
            <h3 className="text-base text-[#1B5E2C] font-medium">
              {currentGradeLabel}
              {isSeniorHigh && selectedStrand ? ` · ${selectedStrand}` : ""}
              {selectedSection ? ` · ${selectedSection}` : ""}
            </h3>
          </div>
          <span className="rounded-full bg-[#D9E8D5] px-3 py-1 text-xs font-medium text-[#1B5E2C]">
            {loading ? "Loading..." : `${filteredStudents.length} students`}
          </span>
        </div>

        <div className="divide-y divide-[#EFF4ED]">
          {loading ? (
            <div className="px-4 py-10 text-center text-[#86A18A] text-sm">
              Loading enrolled students...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="px-4 py-10 text-center text-[#86A18A] text-sm">
              No student record found for this selection.
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div
                key={student.enrollmentId || `${student.name}-${student.section}`}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F2BE22] text-[#1B5E2C] font-bold text-sm">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[#1B5E2C] font-medium">{student.name}</p>
                    <p className="text-xs text-[#86A18A]">
                      ID: {student.id} · {isSeniorHigh ? (student.strand || "Unassigned") : student.section}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {isSeniorHigh ? (
                    <>
                      <span className="rounded-full bg-[#D9E8D5] px-2.5 py-1 text-[11px] font-medium text-[#1B5E2C]">
                        {student.strand || "No Strand"}
                      </span>
                      <span className="rounded-full bg-[#E9F2EA] px-2.5 py-1 text-[11px] font-medium text-[#1B5E2C]">
                        {student.section || "No Block"}
                      </span>
                    </>
                  ) : (
                    <span className="rounded-full bg-[#E6EEF4] px-2.5 py-1 text-[11px] font-medium text-[#2C5D8A]">
                      {student.section}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => openDetails(student.enrollmentId)}
                    disabled={!student.enrollmentId}
                    className="rounded-lg border border-[#D9E8D5] bg-white px-3 py-1.5 text-xs font-medium text-[#1B5E2C] hover:bg-[#F7F9F6] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    View
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

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

/* ── Student details modal ────────────────────────────────────── */
function StudentDetailsModal({ loading, error, student, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg text-[#1B5E2C] font-medium" style={{ fontFamily: "'Fraunces', serif" }}>
            Student Details
          </h3>
          <button onClick={onClose} className="text-[#86A18A] hover:text-[#1B5E2C]" aria-label="Close">✕</button>
        </div>

        {loading && <p className="text-sm text-[#86A18A] py-6 text-center">Loading details…</p>}
        {error && !loading && (
          <p className="text-sm text-[#B3492B] py-6 text-center">{error}</p>
        )}

        {!loading && !error && student && (
          <div className="space-y-5">
            <Section title="Personal Info">
              <Row label="Full Name" value={[student.first_name, student.middle_name, student.last_name, student.suffix].filter(Boolean).join(" ")} />
              <Row label="LRN" value={student.lrn} />
              <Row label="Date of Birth" value={student.date_of_birth} />
              <Row label="Contact No." value={student.contact_no} />
              <Row label="Email" value={student.gmail} />
              <Row label="Address" value={[student.street_house_no, student.barangay, student.city_municipality, student.province].filter(Boolean).join(", ")} />
            </Section>

            <Section title="Guardian">
              <Row label="Name" value={student.guardian_fullname} />
              <Row label="Relationship" value={student.guardian_relationship} />
              <Row label="Contact No." value={student.guardian_contact_no} />
            </Section>

            <Section title="Enrollment">
              <Row label="Student Type" value={student.student_type} />
              <Row label="Grade Level" value={student.grade_level ? `Grade ${student.grade_level}` : null} />
              <Row label="Section" value={student.section_assigned} />
              <Row label="Average" value={student.average_grade ?? student.ocr_average} />
              <Row label="Status" value={student.enrollment_status} />
            </Section>

            <Section title="Requirements">
              <Row label="Report Card (Front)" value={student.report_card_front ? "Uploaded" : "Not uploaded"} />
              <Row label="Report Card (Back)" value={student.report_card_back ? "Uploaded" : "Not uploaded"} />
              <Row label="PSA Birth Certificate" value={student.psa_birth_certificate ? "Uploaded" : "Not uploaded"} />
              <Row label="Good Moral" value={student.good_moral ? "Uploaded" : "Not uploaded"} />
              <Row label="Certificate of Transfer" value={student.certificate_of_transfer ? "Uploaded" : "Not uploaded"} />
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.12em] text-[#86A18A] mb-2">{title}</p>
      <div className="rounded-xl border border-[#D9E8D5] bg-[#FAFAF5] divide-y divide-[#EFF4ED]">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="text-xs text-[#86A18A] w-36 shrink-0">{label}</span>
      <span className="text-sm text-[#1B5E2C] font-medium">{value || "—"}</span>
    </div>
  );
}
