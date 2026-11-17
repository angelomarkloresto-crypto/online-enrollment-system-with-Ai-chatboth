import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  EMPTY_LEARNER_DISCLOSURES,
  enrollmentDisclosurePayload,
  validateLearnerDisclosures,
} from "../../utils/learnerDisclosures";
import LearnerDisclosureFields from "../../components/LearnerDisclosureFields";



// const OCR_BASE     = "http://localhost/backend-online-enrollment/ocr";
// const STUDENT_BASE = "http://localhost/backend-online-enrollment/student";
// const STAFF_BASE   = "http://localhost/backend-online-enrollment/staff";
const getOcrApiBase = () => "/backend-online-enrollment/ocr";
const getStudentApiBase = () => "/backend-online-enrollment/student";
const getApiBase = () => "/backend-online-enrollment/student";


const SHS_GRADES = ["11","12"];

const STEP_META = {
  info:         { label: "Enrollment Info",  desc: "Period eligibility & grade level" },
  scan:         { label: "Report Card Scan", desc: "Upload & scan your report card" },
  requirements: { label: "Requirements",     desc: "Upload supporting documents" },
  review:       { label: "Review & Submit",  desc: "Confirm and submit" },
};

export default function EnrollmentForm({ onBack }) {
  const [periods, setPeriods] = useState([]);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [periodsError, setPeriodsError] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadPeriods() {
      setPeriodsLoading(true);
      setPeriodsError("");
      try {
        const response = await fetch(`${getStudentApiBase()}/get_enrollment_periods.php`, { credentials: "include" });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Enrollment availability could not be checked.");
        }
        if (active) setPeriods(Array.isArray(data.periods) ? data.periods : []);
      } catch (error) {
        if (active) setPeriodsError(error.message || "Enrollment availability could not be checked.");
      } finally {
        if (active) setPeriodsLoading(false);
      }
    }
    loadPeriods();
    return () => { active = false; };
  }, []);

  if (selectedPeriod) {
    return (
      <EnrollmentWizard
        enrollmentPeriod={selectedPeriod}
        onBack={onBack}
        onChangePeriod={() => setSelectedPeriod(null)}
      />
    );
  }

  return (
    <EnrollmentPeriodPicker
      periods={periods}
      loading={periodsLoading}
      error={periodsError}
      onBack={onBack}
      onSelect={setSelectedPeriod}
    />
  );
}

function EnrollmentPeriodPicker({ periods, loading, error, onBack, onSelect }) {
  function canEnroll(period) {
    const latestStatus = String(period.latest_attempt?.status || "").toLowerCase();
    return String(period.status).toLowerCase() === "open"
      && period.eligible === true
      && latestStatus !== "pending"
      && latestStatus !== "approved";
  }

  function periodStatus(period) {
    const latestStatus = String(period.latest_attempt?.status || "");
    if (latestStatus.toLowerCase() === "pending") return "Your application for this period is pending review.";
    if (latestStatus.toLowerCase() === "approved") return "Your enrollment for this period has been approved.";
    if (latestStatus.toLowerCase() === "rejected") {
      return period.eligible && String(period.status).toLowerCase() === "open"
        ? `Your previous application was rejected. You may revise and resubmit while this period is open.${period.latest_attempt.rejection_reason ? ` Reason: ${period.latest_attempt.rejection_reason}` : ""}`
        : String(period.status).toLowerCase() !== "open"
          ? "Your previous application was rejected, but this enrollment period is closed."
          : period.eligibility_message || "This period is not available for a new application.";
    }
    if (String(period.status).toLowerCase() !== "open") return "Enrollment is closed for this period.";
    if (period.eligible) return "You are eligible to submit an enrollment application.";
    return period.eligibility_message || "You are not currently eligible for this period.";
  }

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <button onClick={onBack} className="mb-5 flex items-center gap-1.5 text-sm text-[#0B2B26]/55 transition-colors hover:text-[#0B2B26]">
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Dashboard
        </button>
        <div className="mb-6">
          <p className="mb-1 text-xs uppercase tracking-[0.15em] text-[#163832]">Student Portal</p>
          <h2 className="text-2xl text-[#0B2B26]" style={{ fontFamily: "'Fraunces', serif" }}>Enrollment Availability</h2>
          <p className="mt-1 text-sm text-[#0B2B26]/60">Choose an open period for which the school has confirmed your eligibility.</p>
        </div>
        {error && <p role="alert" className="mb-4 rounded-xl border border-[#B3492B]/30 bg-[#B3492B]/10 px-4 py-3 text-sm text-[#B3492B]">{error}</p>}
        {loading ? (
          <div className="rounded-2xl border border-[#718e68] bg-[#8BA77F] px-5 py-12 text-center text-sm text-[#0B2B26]">Checking enrollment periods…</div>
        ) : error ? (
          <div className="rounded-2xl border border-[#718e68] bg-[#8BA77F] px-5 py-8 text-center text-sm text-[#0B2B26]">
            The enrollment period could not be checked. Please try again later or contact the school.
          </div>
        ) : periods.length === 0 ? (
          <div className="rounded-2xl border border-[#718e68] bg-[#8BA77F] px-5 py-8 text-center text-sm text-[#0B2B26]">
            Enrollment is currently closed. No enrollment periods are available.
          </div>
        ) : (
          <div className="space-y-3">
            {periods.map((period) => {
              const eligibleNow = canEnroll(period);
              const coverage = period.coverage === "shs_second_semester"
                ? "Senior High School · 2nd Semester"
                : "All Grade Levels";
              return (
                <section key={period.enrollment_period_id} className="rounded-2xl border border-[#718e68] bg-[#8BA77F] p-4 shadow-[4px_5px_0_rgba(45,55,40,0.25)] sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-lg font-medium text-[#0B2B26]" style={{ fontFamily: "'Fraunces', serif" }}>{period.school_year}</h3>
                      <p className="mt-0.5 text-sm text-[#0B2B26]/70">{coverage} · {period.semester || "Semester unavailable"}</p>
                      {period.eligible_grade_level && (
                        <p className="mt-1 text-sm font-medium text-[#0B2B26]">
                          Eligible grade: {period.eligible_grade_level}{period.eligible_semester ? ` · ${period.eligible_semester}` : ""}
                        </p>
                      )}
                    </div>
                    <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${eligibleNow ? "bg-[#0B2B26] text-white" : "bg-white/50 text-[#0B2B26]"}`}>
                      {period.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-[#0B2B26]/80">{periodStatus(period)}</p>
                  {period.latest_attempt?.submitted_at && (
                    <p className="mt-1 text-xs text-[#0B2B26]/60">
                      Submitted: {new Date(String(period.latest_attempt.submitted_at).replace(" ", "T")).toLocaleString()}
                    </p>
                  )}
                  {eligibleNow && (
                    <button
                      type="button"
                      onClick={() => onSelect(period)}
                      className="mt-4 rounded-lg bg-[#0B2B26] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#051F20]"
                    >
                      {String(period.latest_attempt?.status || "").toLowerCase() === "rejected" ? "Revise and Resubmit" : "Start Enrollment"}
                    </button>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EnrollmentWizard({ onBack, enrollmentPeriod, onChangePeriod }) {
  const submitLock = useRef(false);

  const [step, setStep] = useState(1);

  /* ── Step 1 state ── */
  const [enrollInfo, setEnrollInfo] = useState(() => {
    const gradeLevel = String(enrollmentPeriod.eligible_grade_level || "");
    return {
      student_type: gradeLevel === "7" ? "New Jr High" : "Returning",
      grade_level: gradeLevel,
      semester: String(enrollmentPeriod.eligible_semester || ""),
      strand_id: "",
    };
  });
  const [strands, setStrands]       = useState([]);
  const [strandsLoading, setStrandsLoading] = useState(false);
  const [infoErrors, setInfoErrors] = useState({});
  const [strandsError, setStrandsError] = useState("");
  const [learnerDisclosures, setLearnerDisclosures] = useState({ ...EMPTY_LEARNER_DISCLOSURES });

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
  const [reqErrors, setReqErrors]       = useState({});
  const [uploading, setUploading]       = useState({});  // { psa: bool, etc }

  /* ── Step 4 state ── */
  const [assignedSection, setAssignedSection] = useState(null);
  const [assigning, setAssigning]   = useState(false);
  const [assignError, setAssignError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null); // {success, message}

  const isSHS         = SHS_GRADES.includes(enrollInfo.grade_level);
  const needsRequirements = enrollInfo.grade_level === "7";

  // Requirements step only appears in the wizard when it's actually needed.
  const activeStepKeys = needsRequirements ? ["info","scan","requirements","review"] : ["info","scan","review"];
  const STEPS    = activeStepKeys.map((k) => STEP_META[k]);
  const stepKey  = activeStepKeys[step - 1];

  useEffect(() => {
    if (!SHS_GRADES.includes(String(enrollmentPeriod.eligible_grade_level))) return undefined;
    let active = true;
    async function fetchStrands() {
      setStrandsLoading(true);
      setStrandsError("");
      try {
        const res = await fetch(`${getApiBase()}/get_strand.php`, { credentials: "include" });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Strands could not be loaded.");
        if (active) setStrands(Array.isArray(data.strands) ? data.strands : []);
      } catch (error) {
        if (active) setStrandsError(error.message || "Strands could not be loaded.");
      } finally {
        if (active) setStrandsLoading(false);
      }
    }
    fetchStrands();
    return () => { active = false; };
  }, [enrollmentPeriod.eligible_grade_level]);

  /* ══════════════════════════════════
     STEP 1 — validate & next
  ══════════════════════════════════ */
  function validateInfo() {
    const errs = {};
    if (!enrollInfo.student_type) errs.student_type = "Required.";
    if (!enrollInfo.grade_level)  errs.grade_level  = "Required.";
    if (isSHS && !enrollInfo.strand_id) errs.strand_id = "Select a strand for SHS.";
    Object.assign(errs, validateLearnerDisclosures(learnerDisclosures));
    setInfoErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleLearnerDisclosureChange(name, value) {
    setLearnerDisclosures((previous) => ({ ...previous, [name]: value }));
    setInfoErrors((previous) => ({
      ...previous,
      [name]: undefined,
      ...(name === "is_pwd" ? { pwd_specification: undefined } : {}),
      ...(name === "is_4ps_beneficiary" ? { four_ps_household_id: undefined } : {}),
    }));
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

  async function handleFrontUpload(file) {
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

  async function handleBackUpload(file) {
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
    setReqErrors(errs);
    return Object.keys(errs).length === 0;
  }

  /* ══════════════════════════════════
     STEP 4 — assign section + submit
  ══════════════════════════════════ */
  async function handleGoToReview() {
    if (needsRequirements && !validateRequirements()) return;
    setAssigning(true);
    setAssignError(null);
    setStep(activeStepKeys.length); // jump to the "review" step, wherever it lands
    setAssignedSection(null);
    try {
      const assignmentPayload = { grade_level: Number(enrollInfo.grade_level) };
      if (isSHS) assignmentPayload.strand_id = Number(enrollInfo.strand_id);
      const res  = await fetch(`${getOcrApiBase()}/assign_section.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignmentPayload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "No available heterogeneous section was found.");
      setAssignedSection({ section_id: data.section_id, section_name: data.section_name });
    } catch (error) {
      setAssignError(error.message || "Could not reach the server.");
    }
    finally  { setAssigning(false); }
  }

  async function handleSubmit() {
    if (!assignedSection || submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const periodId = Number(enrollmentPeriod.enrollment_period_id);
      if (!Number.isSafeInteger(periodId) || periodId < 1) {
        throw new Error("The selected enrollment period is invalid. Please choose an available period again.");
      }
      const payload = {
        enrollment_period_id: periodId,
        student_type:      enrollInfo.student_type,
        grade_level:       enrollInfo.grade_level,
        semester:          enrollInfo.semester,
        strand_id:         isSHS ? Number(enrollInfo.strand_id) : null,
        average_grade:     Number(ocrAverage),
        section_id:        Number(assignedSection.section_id),
        report_card_front: frontName,
        report_card_back:  backName,
        birth_certificate: psaName       || null,
        good_moral:        goodMoralName || null,
        ...enrollmentDisclosurePayload(learnerDisclosures),
      };
      const res  = await fetch(`${getStudentApiBase()}/submit_enrollment.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Enrollment could not be submitted.");
      if (Number(data.enrollment_period_id) !== periodId) {
        throw new Error("The submitted enrollment period could not be verified. Please contact the school before submitting again.");
      }
      setSubmitResult({ success: data.success, message: data.message });

      if (data.success) {
        setTimeout(() => {
          window.location.href = "/student/dashboard";
        }, 1200);
      }
    } catch (error) {
      setSubmitResult({ success: false, message: error.message || "Could not reach the server." });
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  const pctW = `${(step / STEPS.length) * 100}%`;

  /* ══════════════════════════════════
     RENDER
  ══════════════════════════════════ */
  return (
    <div className="px-4 sm:px-6 py-6">
      <div className="max-w-xl mx-auto">

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-[#0B2B26]/45 transition-colors hover:text-[#0B2B26]">
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
              <path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Dashboard
          </button>
          <button type="button" onClick={onChangePeriod} className="text-sm font-medium text-[#155000] underline">
            Choose another period
          </button>
        </div>

        <section
          aria-label="Selected enrollment period"
          className="mb-5 rounded-2xl border border-[#0B2B26] bg-[#0B2B26] px-5 py-4 text-white shadow-[4px_5px_0_rgba(45,55,40,0.2)]"
        >
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#DAF1DE]/75">
            Selected Enrollment Period
          </p>
          <h2 className="mt-1 text-2xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>
            School Year: {String(enrollmentPeriod.school_year || "Unavailable").replace(/^(\d{4})-(\d{4})$/, "$1–$2")}
          </h2>
          <p className="mt-1 text-sm text-[#DAF1DE]">
            {enrollmentPeriod.coverage === "shs_second_semester"
              ? "Senior High School · 2nd Semester"
              : enrollmentPeriod.coverage === "all_grade_levels"
                ? "All Grade Levels"
                : "Coverage unavailable"}
            {" · "}
            {enrollmentPeriod.semester || "Semester unavailable"}
          </p>
        </section>

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.15em] text-[#163832] mb-1">Student Portal</p>
          <h2 className="text-2xl text-[#0B2B26]" style={{ fontFamily: "'Fraunces', serif" }}>
            Enrollment Form
          </h2>
          <p className="mt-1 text-sm text-[#0B2B26]/60">
            Grade {enrollInfo.grade_level || enrollmentPeriod.eligible_grade_level || "to be assigned"}
            {enrollInfo.semester ? ` · ${enrollInfo.semester}` : ""}
          </p>
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
              <div className="rounded-lg border border-[#0B2B26]/20 bg-white/30 px-4 py-3">
                <p className="text-xs text-[#0B2B26]/60">Enrollment type</p>
                <p className="mt-0.5 text-sm font-medium text-[#0B2B26]">{enrollInfo.student_type}</p>
              </div>
              <div className="rounded-lg border border-[#0B2B26] bg-[#0B2B26]/5 px-4 py-3">
                <p className="text-xs text-[#0B2B26]/60">Grade and semester assigned by enrollment eligibility</p>
                <p className="mt-0.5 text-sm font-medium text-[#0B2B26]">
                  Grade {enrollInfo.grade_level}{enrollInfo.semester ? ` · ${enrollInfo.semester}` : ""}
                </p>
              </div>

              {needsRequirements && (
                <p className="text-xs text-[#163832] bg-[#8EB69B]/10 border border-[#8EB69B]/30 rounded-lg px-3 py-2">
                  Grade 7 enrollment requires a PSA Birth Certificate and Good Moral Certificate, in addition to your report card.
                </p>
              )}

              {isSHS && (
                <div>
                  <label className="block text-sm font-medium text-[#0B2B26] mb-1.5">Strand *</label>
                  {strandsError ? (
                    <p role="alert" className="text-sm text-[#B3492B]">{strandsError}</p>
                  ) : strandsLoading ? (
                    <p className="text-sm text-[#0B2B26]/45">Loading strands…</p>
                  ) : strands.length === 0 ? (
                    <p className="text-sm text-[#B3492B]">No strands are available for this enrollment period.</p>
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
              <LearnerDisclosureFields
                values={learnerDisclosures}
                errors={infoErrors}
                onChange={handleLearnerDisclosureChange}
              />
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
                  onFileSelect={handleFrontUpload}
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
                  onFileSelect={handleBackUpload}
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
                  PSA Birth Certificate and Good Moral are required for Grade 7 enrollment.
                </span>
              </div>

              {/* PSA Birth Certificate */}
              <ReqUpload
                label="PSA Birth Certificate *"
                file={psaFile}
                uploading={uploading.psa}
                uploaded={!!psaName}
                error={reqErrors.psa}
                onFileSelect={(f) => {
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
                onFileSelect={(f) => {
                  if (f) handleReqUpload("goodMoral", f, setGoodMoralFile, setGoodMoralName);
                }}
              />

            </div>
          )}

          {/* ── STEP: review ── */}
          {stepKey === "review" && (
            <div className="space-y-4">
              {/* Section assignment */}
              {assigning && (
                <div className="flex items-center gap-3 bg-[#8EB69B]/10 rounded-xl border border-[#8EB69B]/30 px-4 py-3">
                  <div className="h-5 w-5 rounded-full border-2 border-[#163832] border-t-transparent animate-spin shrink-0" />
                  <p className="text-sm text-[#163832]">Assigning a heterogeneous section…</p>
                </div>
              )}
              {assignError && (
                <div className="bg-[#B3492B]/10 border border-[#B3492B]/30 text-[#B3492B] rounded-xl px-4 py-3 text-sm">
                  {assignError}
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
                <SummaryRow label="Grade Level"     value={`Grade ${enrollInfo.grade_level}${enrollInfo.semester ? ` — ${enrollInfo.semester}` : ""}`} />
                <SummaryRow label="School Year"     value={enrollmentPeriod.school_year} />
                <SummaryRow label="Enrollment Period" value={enrollmentPeriod.semester || "1st sem"} />
                {isSHS && (
                  <SummaryRow label="Strand" value={strands.find((s) => String(s.strand_id) === enrollInfo.strand_id)?.strand_name ?? "—"} />
                )}
                <SummaryRow label="General Average" value={ocrAverage} />
                <SummaryRow label="Report Card"     value="Front & Back ✓" />
                {needsRequirements && (
                  <>
                    <SummaryRow label="PSA Certificate" value={psaName ? "Uploaded ✓" : "Not uploaded"} />
                    <SummaryRow label="Good Moral"      value={goodMoralName ? "Uploaded ✓" : "Not uploaded"} />
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
              {stepKey === "review" && !assigning && !assignError && assignedSection && (
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
              Enrollment submitted successfully. Redirecting to your dashboard…
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

/* ── Upload Box ───────────────────────────────────────────────── */
function UploadBox({ file, accept, inputRef, onFileSelect, label }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
      className={`flex min-h-44 flex-col items-center justify-between rounded-2xl border-2 p-4 text-center text-white shadow-[4px_5px_0_rgba(45,55,40,0.4)] sm:p-5 ${
        file ? "border-[#a8bd00] bg-[#155000]" : "border-[#155000] bg-[#155000]"
      }`}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(event) => onFileSelect(event.target.files?.[0])} />
      {file ? (
        <div className="mb-3 min-w-0">
          <p className="mb-1 text-xl" aria-hidden="true">✓</p>
          <p className="max-w-full truncate text-sm font-semibold">{file.name}</p>
          <p className="text-xs text-white/70">Uploaded</p>
        </div>
      ) : (
        <p className="mb-3 text-sm font-semibold">{label}</p>
      )}
      <UploadOptions fileInputRef={inputRef} onCameraCapture={onFileSelect} />
      <p className="mt-2 text-xs text-white/75">JPG or PNG · Max 10MB</p>
    </motion.div>
  );
}

/* ── Requirement upload row ───────────────────────────────────── */
function ReqUpload({ label, file, uploading, uploaded, error, onFileSelect }) {
  const fileInputRef = useRef(null);
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
      <p className="mb-1.5 text-sm font-semibold text-[#17350f]">{label}</p>
      <div className={`flex min-h-44 flex-col items-center justify-between rounded-2xl border-2 px-4 py-4 text-center text-white shadow-[4px_5px_0_rgba(45,55,40,0.4)] ${
        uploaded ? "border-[#a8bd00] bg-[#155000]"
        : error  ? "border-red-300 bg-[#155000]"
        : "border-[#155000] bg-[#155000]"
      }`}>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(event) => onFileSelect(event.target.files?.[0])} />
        <div className="mb-3 min-w-0">
          <p className="mb-1 text-xl" aria-hidden="true">{uploading ? "…" : uploaded ? "✓" : " "}</p>
          <p className="max-w-full truncate text-sm font-semibold">{file?.name || (uploaded ? "Uploaded" : label)}</p>
          {uploading && <p className="text-xs text-white/75">Uploading…</p>}
        </div>
        <UploadOptions fileInputRef={fileInputRef} onCameraCapture={onFileSelect} />
        <p className="mt-2 text-xs text-white/75">JPG or PNG · Max 10MB</p>
      </div>
      {error && <Err msg={error} />}
    </motion.div>
  );
}

function UploadOptions({ fileInputRef, onCameraCapture }) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const cameraRequestRef = useRef(0);
  const buttonClass = "flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white px-2 py-2 text-xs font-semibold text-[#155000] shadow-sm transition hover:bg-[#eff6e9] sm:px-3 sm:text-sm";

  function openCamera() {
    setCameraOpen(true);
    setCameraError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access requires HTTPS or localhost and a supported browser.");
      return;
    }

    const requestId = ++cameraRequestRef.current;
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    }).then((stream) => {
      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      setCameraStream(stream);
    }).catch((error) => {
      if (requestId !== cameraRequestRef.current) return;
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setCameraError("Camera permission was denied. Allow camera access in your browser settings and try again.");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        setCameraError("No camera was found on this device.");
      } else {
        setCameraError("Could not start the camera. Check that it is connected and not being used by another app.");
      }
    });
  }

  function closeCamera() {
    cameraRequestRef.current += 1;
    setCameraStream(null);
    setCameraOpen(false);
  }

  return (
    <div className="flex w-full max-w-xs gap-2">
      <button type="button" onClick={openCamera} className={buttonClass}>
        <span aria-hidden="true">📷</span> Camera
      </button>
      <button type="button" onClick={() => fileInputRef.current?.click()} className={buttonClass}>
        <span aria-hidden="true">▧</span> Image
      </button>
      {cameraOpen && (
        <CameraCapture
          stream={cameraStream}
          cameraError={cameraError}
          setCameraError={setCameraError}
          onCapture={(capturedFile) => {
            onCameraCapture(capturedFile);
            closeCamera();
          }}
          onClose={closeCamera}
        />
      )}
    </div>
  );
}

function CameraCapture({ stream, cameraError, setCameraError, onCapture, onClose }) {
  const videoRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    if (!stream || !videoRef.current) return undefined;
    const video = videoRef.current;
    video.srcObject = stream;
    video.play().then(() => setCameraReady(true)).catch(() => {
      setCameraError("The camera started, but the live preview could not be displayed.");
    });
    return () => {
      video.srcObject = null;
      stream.getTracks().forEach((track) => track.stop());
    };
  }, [stream, setCameraError]);

  function captureImage() {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      setCameraError("The camera is not ready yet. Please try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Could not capture the image. Please try again.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError("Could not capture the image. Please try again.");
        return;
      }
      onCapture(new File([blob], "camera-capture.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="camera-capture-title"
        className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="camera-capture-title" className="text-lg font-semibold text-[#0B2B26]">Take a photo</h2>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-sm text-[#0B2B26] hover:bg-[#eff6e9]">
            Close
          </button>
        </div>
        <video ref={videoRef} autoPlay playsInline muted className="max-h-[60vh] w-full rounded-lg bg-black object-contain" />
        {!stream && !cameraError && <p className="mt-3 text-sm text-[#0B2B26]/70">Requesting camera access…</p>}
        {cameraError && <p role="alert" className="mt-3 text-sm text-[#B3492B]">{cameraError}</p>}
        <button
          type="button"
          onClick={captureImage}
          disabled={!stream || !cameraReady}
          className="mt-4 w-full rounded-full bg-[#155000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#103d00] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Take photo
        </button>
      </div>
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
