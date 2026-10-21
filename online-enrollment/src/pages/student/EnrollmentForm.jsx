import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";



// const OCR_BASE     = "http://localhost/backend-online-enrollment/ocr";
// const STUDENT_BASE = "http://localhost/backend-online-enrollment/student";
// const STAFF_BASE   = "http://localhost/backend-online-enrollment/staff";
export const getOcrApiBase = () => "/backend-online-enrollment/ocr";
export const getStudentApiBase = () => "/backend-online-enrollment/student";
export const getApiBase = () => "/backend-online-enrollment/student";


const STUDENT_TYPES = [
  { value: "New Jr High", label: "New Jr. High (Grade 7)" },
  { value: "Old Jr High",  label: "Old Jr. High" },
  { value: "Senior High",  label: "Senior High" },
  { value: "Returning",    label: "Returning" },
];

const SHS_GRADES = ["11","12"];

// Which grade-level buttons are offered for each student type.
const GRADE_OPTIONS_BY_TYPE = {
  "New Jr High": ["7"],
  "Old Jr High":  ["8","9","10"],
  "Senior High":  ["11","12"],
  "Returning":    ["7","8","9","10","11","12"],
};

const STEP_META = {
  info:         { label: "Enrollment Info",  desc: "Student type & grade level" },
  scan:         { label: "Report Card Scan", desc: "Upload & scan your report card" },
  requirements: { label: "Requirements",     desc: "Upload supporting documents" },
  review:       { label: "Review & Submit",  desc: "Confirm and submit" },
};

export default function EnrollmentForm({ onBack }) {
  const studentId = localStorage.getItem("student_id");

  const [step, setStep] = useState(1);

  /* ── Step 1 state ── */
  const [enrollInfo, setEnrollInfo] = useState({
    student_type: "New Jr High",
    grade_level:  "7",
    strand_id:    "",
  });
  const [strands, setStrands]       = useState([]);
  const [infoErrors, setInfoErrors] = useState({});

  /* ── Step 2 state ── */
  const [frontFile, setFrontFile]   = useState(null);  // File object
  const [frontName, setFrontName]   = useState("");    // temp filename from server
  const [backFile, setBackFile]     = useState(null);
  const [backName, setBackName]     = useState("");
  const [ocrAverage, setOcrAverage] = useState("");    // extracted or manual
  const [ocrStatus, setOcrStatus]   = useState("idle"); // idle|uploading|scanning|done|error
  const [ocrMsg, setOcrMsg]         = useState("");
  const [scanErrors, setScanErrors] = useState({});
  const frontInputRef = useRef(null);
  const backInputRef  = useRef(null);

  /* ── Step 3 state ── */
  const [psaFile, setPsaFile]           = useState(null);
  const [psaName, setPsaName]           = useState("");
  const [goodMoralFile, setGoodMoralFile]   = useState(null);
  const [goodMoralName, setGoodMoralName]   = useState("");
  const [cotFile, setCotFile]           = useState(null);
  const [cotName, setCotName]           = useState("");
  const [reqErrors, setReqErrors]       = useState({});
  const [uploading, setUploading]       = useState({});  // { psa: bool, etc }

  /* ── Step 4 state ── */
  const [assignedSection, setAssignedSection] = useState(null);
  const [assigning, setAssigning]   = useState(false);
  const [assignError, setAssignError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null); // {success, message}
  const [enrollmentStatus, setEnrollmentStatus] = useState(null); // 'Approved', 'Rejected', 'Pending', or null
  const [statusCheckError, setStatusCheckError] = useState(null);

  const isSHS         = SHS_GRADES.includes(enrollInfo.grade_level);
  const isNewJrHigh   = enrollInfo.student_type === "New Jr High";
  const isTransferee  = enrollInfo.student_type === "Transferee";
  const isFirstTimeEnrollment = isNewJrHigh || enrollInfo.student_type === "Senior High";

  // Requirements (PSA Birth Certificate + Good Moral) are only needed for
  // students who don't already have a record with the school: a brand new
  // Grade 7, a transferee coming from elsewhere, or a student stepping into
  // Senior High for the first time (Grade 11). Old Jr High, Returning, and
  // continuing Grade 12 students already have these on file.
  const needsRequirements = isFirstTimeEnrollment || isTransferee;

  // Requirements step only appears in the wizard when it's actually needed.
  const activeStepKeys = needsRequirements ? ["info","scan","requirements","review"] : ["info","scan","review"];
  const STEPS    = activeStepKeys.map((k) => STEP_META[k]);
  const stepKey  = activeStepKeys[step - 1];
  const gradeOptions = GRADE_OPTIONS_BY_TYPE[enrollInfo.student_type] ?? [];

  function handleStudentTypeChange(type) {
    const opts = GRADE_OPTIONS_BY_TYPE[type] ?? [];
    // New Jr High is always Grade 7 — auto-select it. Everything else
    // requires an explicit grade pick, so clear the previous selection if
    // it isn't valid for the newly chosen type.
    const nextGrade = type === "New Jr High" ? "7" : (opts.includes(enrollInfo.grade_level) ? enrollInfo.grade_level : "");
    setEnrollInfo({ student_type: type, grade_level: nextGrade, strand_id: "" });
    setInfoErrors({});
  }

  useEffect(() => { fetchStrands(); }, []);

  async function fetchStrands() {
    try {
      const res  = await fetch(`${getApiBase()}/get_strand.php`, { credentials: "include" });
      const data = await res.json();
      if (data.success) setStrands(data.strands ?? []);
    } catch { /* silently ignore */ }
  }

  /* ══════════════════════════════════
     STEP 1 — validate & next
  ══════════════════════════════════ */
  function validateInfo() {
    const errs = {};
    if (!enrollInfo.student_type) errs.student_type = "Required.";
    if (!enrollInfo.grade_level)  errs.grade_level  = "Required.";
    if (isSHS && !enrollInfo.strand_id) errs.strand_id = "Select a strand for SHS.";
    setInfoErrors(errs);
    return Object.keys(errs).length === 0;
  }

  /* ══════════════════════════════════
     STEP 2 — upload + OCR
  ══════════════════════════════════ */
  async function uploadToTemp(file) {
    const body = new FormData();
    body.append("report_card", file);
    const res  = await fetch(`${getOcrApiBase()}/scan_report_card.php`, {
      method: "POST", credentials: "include", body,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message ?? "Upload failed.");
    return data.filename;
  }

  async function handleFrontUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFrontFile(file);
    setFrontName("");
    setOcrStatus("uploading");
    setOcrMsg("Uploading report card…");
    setOcrAverage("");
    setScanErrors({});
    try {
      const filename = await uploadToTemp(file);
      setFrontName(filename);
      setOcrStatus("scanning");
      setOcrMsg("Scanning for your average grade…");

      const ocrBody = JSON.stringify({ filename });
      const ocrRes  = await fetch(`${getOcrApiBase()}/process_ocr.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: ocrBody,
      });
      const ocrData = await ocrRes.json();
      if (ocrData.success) {
        const average = Number(
          ocrData.average ?? ocrData.extracted_data?.average_grade
        );
        if (Number.isFinite(average) && average >= 60 && average <= 100) {
          setOcrAverage(String(average));
          setOcrStatus("done");
          setOcrMsg(`Average detected: ${average}`);
        } else {
          setOcrStatus("error");
          setOcrMsg("Could not detect a valid average. Enter it manually.");
        }
      } else {
        setOcrStatus("error");
        setOcrMsg(ocrData.message ?? "Could not detect average. Enter it manually.");
      }
    } catch (err) {
      setOcrStatus("error");
      setOcrMsg(err.message ?? "Could not process image.");
    }
  }

  async function handleBackUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackFile(file);
    try {
      const filename = await uploadToTemp(file);
      setBackName(filename);
    } catch { setScanErrors((p) => ({ ...p, back: "Could not upload back image." })); }
  }

  function validateScan() {
    const errs = {};
    if (!frontName) errs.front = "Upload report card front.";
    if (!backName)  errs.back  = "Upload report card back.";
    if (!ocrAverage || isNaN(ocrAverage) || Number(ocrAverage) < 60 || Number(ocrAverage) > 100)
      errs.average = "Enter a valid average (60–100).";
    setScanErrors(errs);
    return Object.keys(errs).length === 0;
  }

  /* ══════════════════════════════════
     STEP 3 — upload requirements
  ══════════════════════════════════ */
  async function handleReqUpload(fileKey, file, setFile, setName) {
    setFile(file);
    setUploading((p) => ({ ...p, [fileKey]: true }));
    setReqErrors((p) => ({ ...p, [fileKey]: undefined }));
    try {
      const filename = await uploadToTemp(file);
      setName(filename);
    } catch {
      setReqErrors((p) => ({ ...p, [fileKey]: "Upload failed. Try again." }));
    } finally { setUploading((p) => ({ ...p, [fileKey]: false })); }
  }

  function validateRequirements() {
    const errs = {};
    if (!psaName)       errs.psa       = "PSA Birth Certificate is required.";
    if (!goodMoralName) errs.goodMoral = "Good Moral is required.";
    if (isTransferee && !cotName) errs.cot = "Certificate of Transfer is required for transferees.";
    setReqErrors(errs);
    return Object.keys(errs).length === 0;
  }

  /* ══════════════════════════════════
     STEP 4 — assign section + submit
  ══════════════════════════════════ */
  async function checkEnrollmentStatus() {
    try {
      const res = await fetch(`${getStudentApiBase()}/check_enrollment_status.php?student_id=${studentId}`, { credentials: "include" });
      const data = await res.json();
      if (data.success && data.has_enrollment) {
        setEnrollmentStatus(data.enrollment_status);
        return data.enrollment_status;
      }
      setEnrollmentStatus(null);
      return null;
    } catch (err) {
      setStatusCheckError(err.message ?? "Could not check enrollment status.");
      return null;
    }
  }

  async function handleGoToReview() {
    if (needsRequirements && !validateRequirements()) return;
    
    // Check if student is already approved/enrolled
    setAssigning(true);
    setAssignError(null);
    setStatusCheckError(null);
    
    const currentStatus = await checkEnrollmentStatus();
    if (currentStatus === "Approved") {
      setAssigning(false);
      setAssignError("You are already enrolled. Contact your administrator if you need to modify your enrollment.");
      return;
    }
    
    setStep(activeStepKeys.length); // jump to the "review" step, wherever it lands
    setAssignedSection(null);
    try {
      const res  = await fetch(`${getOcrApiBase()}/assign_section.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade_level: enrollInfo.grade_level,
          average:     Number(ocrAverage),
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Store both section_id (for capacity) and section_name (for section_assigned column)
        setAssignedSection({ section_id: data.section_id, section_name: data.section_name });
      } else {
        setAssignError(data.message ?? "No available section found for your average.");
      }
    } catch { setAssignError("Could not reach the server."); }
    finally  { setAssigning(false); }
  }

  async function handleSubmit() {
    if (!assignedSection) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const payload = {
        student_id:        studentId,
        student_type:      enrollInfo.student_type, // "New Jr High" | "Old Jr High" | "Senior High" | "Transferee" | "Returning" — NOTE: confirm backend enum/mapping accepts these exact values
        grade_level:       enrollInfo.grade_level,
        strand_id:         isSHS ? enrollInfo.strand_id : null,
        average_grade:     Number(ocrAverage),
        section_id:        assignedSection.section_id,   // for capacity update
        section_name:      assignedSection.section_name, // stored in section_assigned column
        report_card_front: frontName,
        report_card_back:  backName,
        birth_certificate: psaName       || null,
        good_moral:        goodMoralName || null,
        certificate_of_transfer: cotName || null,
      };
      const res  = await fetch(`${getStudentApiBase()}/submit_enrollment.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setSubmitResult({ success: data.success, message: data.message });

      if (data.success) {
        localStorage.removeItem("student_id");
        localStorage.removeItem("student_name");
        localStorage.removeItem("student_gmail");

        setTimeout(() => {
          window.location.href = "/student/login";
        }, 1200);
      }
    } catch { setSubmitResult({ success: false, message: "Could not reach the server." }); }
    finally  { setSubmitting(false); }
  }

  const pctW = `${(step / STEPS.length) * 100}%`;

  /* ══════════════════════════════════
     RENDER
  ══════════════════════════════════ */
  return (
    <div className="px-4 sm:px-6 py-6">
      <div className="max-w-xl mx-auto">

        {/* Back */}
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-[#0B2B26]/45 hover:text-[#0B2B26] mb-5 transition-colors">
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Dashboard
        </button>

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.15em] text-[#163832] mb-1">Student Portal</p>
          <h2 className="text-2xl text-[#0B2B26]" style={{ fontFamily: "'Fraunces', serif" }}>
            Enrollment Form
          </h2>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-[#8BA77F]/40">
            <motion.div className="h-full rounded-full bg-[#155000]" animate={{ width: pctW }} transition={{ duration: 0.45 }} />
          </div>
          <div className={`grid gap-1 ${STEPS.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
            {STEPS.map((s, i) => {
              const n = i + 1;
              const active = step === n;
              const done   = step > n;
              return (
                <div key={s.label} className="flex min-w-0 flex-col items-center text-center">
                  <motion.div
                    animate={active ? { y: [0, -5, 0] } : { y: 0 }}
                    transition={active ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                    className={`mb-1 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors sm:h-10 sm:w-10 ${
                      done ? "bg-[#155000] text-white" : active ? "bg-[#155000] text-white ring-2 ring-[#a8bd00] ring-offset-2" : "bg-[#8BA77F] text-white"
                    }`}
                  >
                    {done ? "✓" : n}
                  </motion.div>
                  <p className={`w-full truncate px-0.5 text-[9px] font-semibold leading-tight sm:px-1 sm:text-xs ${active ? "text-[#155000]" : "text-[#0B2B26]/65"}`}>
                    {s.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card */}
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-[#718e68] bg-[#8BA77F] p-4 shadow-[5px_7px_0_rgba(45,55,40,0.35)] sm:p-6"
        >
          <div className="mb-5">
            <h3 className="text-lg font-medium text-[#0B2B26]" style={{ fontFamily: "'Fraunces', serif" }}>
              Step {step} — {STEPS[step-1].label}
            </h3>
            <p className="text-sm text-[#0B2B26]/45">{STEPS[step-1].desc}</p>
          </div>

          {/* ── STEP: info ── */}
          {stepKey === "info" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0B2B26] mb-1.5">Student Type *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STUDENT_TYPES.map((t) => (
                    <button
                      key={t.value} type="button"
                      onClick={() => handleStudentTypeChange(t.value)}
                      className={`rounded-lg border py-2.5 px-3 text-sm font-medium text-left transition-colors ${
                        enrollInfo.student_type === t.value
                          ? "bg-[#0B2B26] text-white border-[#0B2B26]"
                          : "border-[#235347]/25 text-[#0B2B26]/70 hover:border-[#0B2B26]"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {infoErrors.student_type && <Err msg={infoErrors.student_type} />}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0B2B26] mb-1.5">Grade Level *</label>
                {isNewJrHigh ? (
                  <div className="rounded-lg border border-[#0B2B26] bg-[#0B2B26]/5 px-4 py-2.5 text-sm font-medium text-[#0B2B26]">
                    Grade 7 — fixed for new junior high enrollees
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {gradeOptions.map((g) => (
                      <button
                        key={g} type="button"
                        onClick={() => { setEnrollInfo((p) => ({ ...p, grade_level: g, strand_id: "" })); setInfoErrors((p) => ({ ...p, grade_level: undefined })); }}
                        className={`rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                          enrollInfo.grade_level === g
                            ? "bg-[#0B2B26] text-white border-[#0B2B26]"
                            : "border-[#235347]/25 text-[#0B2B26]/70 hover:border-[#0B2B26]"
                        }`}
                      >
                        G{g}
                      </button>
                    ))}
                  </div>
                )}
                {infoErrors.grade_level && <Err msg={infoErrors.grade_level} />}
              </div>

              {needsRequirements && (
                <p className="text-xs text-[#163832] bg-[#8EB69B]/10 border border-[#8EB69B]/30 rounded-lg px-3 py-2">
                  {isTransferee
                    ? "As a transferee, you'll need to upload your report card and requirements (PSA Birth Certificate, Good Moral, and Certificate of Transfer)."
                    : "First-time enrollment requires a PSA Birth Certificate and Good Moral Certificate, in addition to your report card."}
                </p>
              )}

              {isSHS && (
                <div>
                  <label className="block text-sm font-medium text-[#0B2B26] mb-1.5">Strand *</label>
                  {strands.length === 0 ? (
                    <p className="text-sm text-[#0B2B26]/45">Loading strands…</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {strands.map((s) => (
                        <button
                          key={s.strand_id} type="button"
                          onClick={() => { setEnrollInfo((p) => ({ ...p, strand_id: String(s.strand_id) })); setInfoErrors((p) => ({ ...p, strand_id: undefined })); }}
                          className={`rounded-lg border py-2.5 px-3 text-sm font-medium text-left transition-colors ${
                            enrollInfo.strand_id === String(s.strand_id)
                              ? "bg-[#0B2B26] text-white border-[#0B2B26]"
                              : "border-[#235347]/25 text-[#0B2B26]/70 hover:border-[#0B2B26]"
                          }`}
                        >
                          {s.strand_name}
                        </button>
                      ))}
                    </div>
                  )}
                  {infoErrors.strand_id && <Err msg={infoErrors.strand_id} />}
                </div>
              )}
            </div>
          )}

          {/* ── STEP: scan ── */}
          {stepKey === "scan" && (
            <div className="space-y-5">
              {/* Front upload */}
              <div>
                <label className="block text-sm font-medium text-[#0B2B26] mb-1.5">
                  Report Card — Front *
                </label>
                <p className="text-xs text-[#0B2B26]/45 mb-2">
                  The system will scan this to detect your average grade. Use a clear, well-lit photo.
                </p>
                <UploadBox
                  file={frontFile}
                  accept="image/jpeg,image/png"
                  inputRef={frontInputRef}
                  onChange={handleFrontUpload}
                  label="Upload front of report card"
                />
                {scanErrors.front && <Err msg={scanErrors.front} />}

                {/* OCR status */}
                {ocrStatus !== "idle" && (
                  <div className={`mt-3 rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${
                    ocrStatus === "done"  ? "bg-[#0B2B26]/10 text-[#0B2B26]"
                    : ocrStatus === "error" ? "bg-[#B3492B]/10 text-[#B3492B]"
                    : "bg-[#8EB69B]/10 text-[#163832]"
                  }`}>
                    {(ocrStatus === "uploading" || ocrStatus === "scanning") && (
                      <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />
                    )}
                    <span>{ocrMsg}</span>
                  </div>
                )}
              </div>

              {/* Manual average input — always shown after scan attempt */}
              {(ocrStatus === "done" || ocrStatus === "error") && (
                <div>
                  <label className="block text-sm font-medium text-[#0B2B26] mb-1.5">
                    General Average *
                    {ocrStatus === "done" && (
                      <span className="ml-2 text-xs font-normal text-[#0B2B26]/45">(auto-detected — you can correct it)</span>
                    )}
                    {ocrStatus === "error" && (
                      <span className="ml-2 text-xs font-normal text-[#B3492B]">(enter manually)</span>
                    )}
                  </label>
                  <input
                    type="number" min="60" max="100" step="0.01"
                    value={ocrAverage}
                    onChange={(e) => { setOcrAverage(e.target.value); setScanErrors((p) => ({ ...p, average: undefined })); }}
                    placeholder="e.g. 88.5"
                    className={inputCls(scanErrors.average)}
                  />
                  {scanErrors.average && <Err msg={scanErrors.average} />}
                </div>
              )}

              {/* Back upload */}
              <div>
                <label className="block text-sm font-medium text-[#0B2B26] mb-1.5">
                  Report Card — Back *
                </label>
                <UploadBox
                  file={backFile}
                  accept="image/jpeg,image/png"
                  inputRef={backInputRef}
                  onChange={handleBackUpload}
                  label="Upload back of report card"
                />
                {scanErrors.back && <Err msg={scanErrors.back} />}
                {backName && !scanErrors.back && (
                  <p className="mt-1.5 text-xs text-[#0B2B26]">✓ Back uploaded</p>
                )}
              </div>
            </div>
          )}

          {/* ── STEP: requirements (only inserted into the wizard when needed) ── */}
          {stepKey === "requirements" && (
            <div className="space-y-5">
              <div className="bg-[#DAF1DE]/40 rounded-xl border border-[#235347]/15 p-3 text-xs text-[#0B2B26]/70">
                <span className="font-medium text-[#0B2B26]">Note:</span> Upload JPG or PNG images only, max 10MB each.
                <span className="block mt-1 text-[#163832] font-medium">
                  {isTransferee
                    ? "PSA Birth Certificate, Good Moral, and Certificate of Transfer are required for transferees."
                    : "PSA Birth Certificate and Good Moral are required."}
                </span>
              </div>

              {/* PSA Birth Certificate */}
              <ReqUpload
                label="PSA Birth Certificate *"
                file={psaFile}
                uploading={uploading.psa}
                uploaded={!!psaName}
                error={reqErrors.psa}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleReqUpload("psa", f, setPsaFile, setPsaName);
                }}
              />

              {/* Good Moral */}
              <ReqUpload
                label="Good Moral Certificate *"
                file={goodMoralFile}
                uploading={uploading.goodMoral}
                uploaded={!!goodMoralName}
                error={reqErrors.goodMoral}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleReqUpload("goodMoral", f, setGoodMoralFile, setGoodMoralName);
                }}
              />

              {/* Certificate of Transfer — required for transferees */}
              {isTransferee && (
                <ReqUpload
                  label="Certificate of Transfer *"
                  file={cotFile}
                  uploading={uploading.cot}
                  uploaded={!!cotName}
                  error={reqErrors.cot}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleReqUpload("cot", f, setCotFile, setCotName);
                  }}
                />
              )}
            </div>
          )}

          {/* ── STEP: review ── */}
          {stepKey === "review" && (
            <div className="space-y-4">
              {/* Section assignment */}
              {assigning && (
                <div className="flex items-center gap-3 bg-[#8EB69B]/10 rounded-xl border border-[#8EB69B]/30 px-4 py-3">
                  <div className="h-5 w-5 rounded-full border-2 border-[#163832] border-t-transparent animate-spin shrink-0" />
                  <p className="text-sm text-[#163832]">Checking enrollment status…</p>
                </div>
              )}
              {assignError && (
                <div className="bg-[#B3492B]/10 border border-[#B3492B]/30 text-[#B3492B] rounded-xl px-4 py-3 text-sm">
                  {assignError}
                </div>
              )}
              {statusCheckError && (
                <div className="bg-[#B3492B]/10 border border-[#B3492B]/30 text-[#B3492B] rounded-xl px-4 py-3 text-sm">
                  {statusCheckError}
                </div>
              )}
              {assignedSection && (
                <div className="bg-[#0B2B26]/8 border border-[#0B2B26]/25 rounded-xl px-4 py-3">
                  <p className="text-xs text-[#0B2B26]/45 mb-0.5">Section Assigned</p>
                  <p className="text-base font-medium text-[#0B2B26]">{assignedSection.section_name}</p>
                </div>
              )}

              {/* Summary */}
              <div className="bg-[#DAF1DE]/40 rounded-xl border border-[#235347]/15 divide-y divide-[#DAF1DE]/60">
                <SummaryRow label="Student Type"    value={enrollInfo.student_type} />
                <SummaryRow label="Grade Level"     value={`Grade ${enrollInfo.grade_level}`} />
                {isSHS && (
                  <SummaryRow label="Strand" value={strands.find((s) => String(s.strand_id) === enrollInfo.strand_id)?.strand_name ?? "—"} />
                )}
                <SummaryRow label="General Average" value={ocrAverage} />
                <SummaryRow label="Report Card"     value="Front & Back ✓" />
                {needsRequirements && (
                  <>
                    <SummaryRow label="PSA Certificate" value={psaName ? "Uploaded ✓" : "Not uploaded"} />
                    <SummaryRow label="Good Moral"      value={goodMoralName ? "Uploaded ✓" : "Not uploaded"} />
                    {isTransferee && (
                      <SummaryRow label="Transfer Certificate" value={cotName ? "Uploaded ✓" : "Not uploaded"} />
                    )}
                  </>
                )}
              </div>

              {/* Submit result */}
              {submitResult && (
                <div className={`rounded-xl px-4 py-3 text-sm border ${
                  submitResult.success
                    ? "bg-[#0B2B26]/10 text-[#0B2B26] border-[#0B2B26]/25"
                    : "bg-[#B3492B]/10 text-[#B3492B] border-[#B3492B]/25"
                }`}>
                  {submitResult.message}
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          {!submitResult?.success && (
            <div className={`flex gap-3 mt-6 ${step > 1 ? "" : "justify-end"}`}>
              {step > 1 && (
                <button
                  onClick={() => { setStep((s) => s - 1); setScanErrors({}); setReqErrors({}); }}
                  className="flex-1 rounded-lg border border-[#235347]/25 text-[#0B2B26]/70 text-sm font-medium py-2.5 hover:bg-[#DAF1DE]/40"
                >
                  Back
                </button>
              )}

              {stepKey === "info" && (
                <button
                  onClick={() => { if (validateInfo()) setStep(2); }}
                  className="flex-1 rounded-lg bg-[#0B2B26] text-white text-sm font-medium py-2.5 hover:bg-[#051F20] transition-colors"
                >
                  Next → Scan Report Card
                </button>
              )}
              {stepKey === "scan" && (
                <button
                  onClick={() => {
                    if (!validateScan()) return;
                    // Requirements step is only inserted when needed — otherwise
                    // skip straight to Review (which also triggers section
                    // assignment).
                    needsRequirements ? setStep(3) : handleGoToReview();
                  }}
                  className="flex-1 rounded-lg bg-[#0B2B26] text-white text-sm font-medium py-2.5 hover:bg-[#051F20] transition-colors"
                >
                  {needsRequirements ? "Next → Upload Requirements" : "Next → Review"}
                </button>
              )}
              {stepKey === "requirements" && (
                <button
                  onClick={handleGoToReview}
                  className="flex-1 rounded-lg bg-[#0B2B26] text-white text-sm font-medium py-2.5 hover:bg-[#051F20] transition-colors"
                >
                  Next → Review
                </button>
              )}
              {stepKey === "review" && !assigning && !assignError && !statusCheckError && assignedSection && (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-[#0B2B26] text-white text-sm font-medium py-2.5 hover:bg-[#051F20] disabled:opacity-60 transition-colors"
                >
                  {submitting ? "Submitting…" : "Submit Enrollment"}
                </button>
              )}
            </div>
          )}

          {submitResult?.success && (
            <div className="mt-6 rounded-lg border border-[#0B2B26]/20 bg-[#0B2B26]/5 px-4 py-3 text-sm text-[#0B2B26]">
              Redirecting to the login page to sign in with your Gmail and LRN password…
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

/* ── Upload Box ───────────────────────────────────────────────── */
function UploadBox({ file, accept, inputRef, onChange, label }) {
  const cameraInputRef = useRef(null);
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
      className={`flex min-h-44 flex-col items-center justify-between rounded-2xl border-2 p-4 text-center text-white shadow-[4px_5px_0_rgba(45,55,40,0.4)] sm:p-5 ${
        file ? "border-[#a8bd00] bg-[#155000]" : "border-[#155000] bg-[#155000]"
      }`}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onChange} />
      {file ? (
        <div className="mb-3 min-w-0">
          <p className="mb-1 text-xl" aria-hidden="true">✓</p>
          <p className="max-w-full truncate text-sm font-semibold">{file.name}</p>
          <p className="text-xs text-white/70">Uploaded</p>
        </div>
      ) : (
        <p className="mb-3 text-sm font-semibold">{label}</p>
      )}
      <UploadOptions fileInputRef={inputRef} cameraInputRef={cameraInputRef} />
      <p className="mt-2 text-xs text-white/75">JPG or PNG · Max 10MB</p>
    </motion.div>
  );
}

/* ── Requirement upload row ───────────────────────────────────── */
function ReqUpload({ label, file, uploading, uploaded, error, onChange }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
      <p className="mb-1.5 text-sm font-semibold text-[#17350f]">{label}</p>
      <div className={`flex min-h-44 flex-col items-center justify-between rounded-2xl border-2 px-4 py-4 text-center text-white shadow-[4px_5px_0_rgba(45,55,40,0.4)] ${
        uploaded ? "border-[#a8bd00] bg-[#155000]"
        : error  ? "border-red-300 bg-[#155000]"
        : "border-[#155000] bg-[#155000]"
      }`}>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={onChange} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onChange} />
        <div className="mb-3 min-w-0">
          <p className="mb-1 text-xl" aria-hidden="true">{uploading ? "…" : uploaded ? "✓" : " "}</p>
          <p className="max-w-full truncate text-sm font-semibold">{file?.name || (uploaded ? "Uploaded" : label)}</p>
          {uploading && <p className="text-xs text-white/75">Uploading…</p>}
        </div>
        <UploadOptions fileInputRef={fileInputRef} cameraInputRef={cameraInputRef} />
        <p className="mt-2 text-xs text-white/75">JPG or PNG · Max 10MB</p>
      </div>
      {error && <Err msg={error} />}
    </motion.div>
  );
}

function UploadOptions({ fileInputRef, cameraInputRef }) {
  const buttonClass = "flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white px-2 py-2 text-xs font-semibold text-[#155000] shadow-sm transition hover:bg-[#eff6e9] sm:px-3 sm:text-sm";

  return (
    <div className="flex w-full max-w-xs gap-2">
      <button type="button" onClick={() => cameraInputRef.current?.click()} className={buttonClass}>
        <span aria-hidden="true">📷</span> Camera
      </button>
      <button type="button" onClick={() => fileInputRef.current?.click()} className={buttonClass}>
        <span aria-hidden="true">▧</span> Image
      </button>
    </div>
  );
}

/* ── Summary row ──────────────────────────────────────────────── */
function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="text-xs text-[#0B2B26]/45 w-36 shrink-0">{label}</span>
      <span className="text-sm text-[#0B2B26] font-medium">{value ?? "—"}</span>
    </div>
  );
}

const inputCls = (err) =>
  `w-full rounded-lg border px-4 py-2.5 text-sm text-[#0B2B26] placeholder:text-[#8EB69B] bg-white focus:outline-none focus:ring-2 focus:ring-[#8EB69B] ${
    err ? "border-[#B3492B]" : "border-[#235347]/25"
  }`;

function Err({ msg }) {
  return <p className="mt-1 text-xs text-[#B3492B]">{msg}</p>;
}
