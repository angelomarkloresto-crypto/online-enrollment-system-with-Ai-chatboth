import { useState, useEffect, useRef } from "react";

/**
 * EnrollmentForm.jsx
 * Step 1 → Enrollment Info (student_type, grade_level, strand)
 * Step 2 → Report Card Scan (upload front → OCR → extract average; upload back)
 * Step 3 → Upload Requirements (PSA, good moral, COT)
 * Step 4 → Review & Submit
 *
 * Endpoints:
 *  POST /ocr/scan_report_card.php     → upload image to temp, returns filename
 *  POST /ocr/process_ocr.php          → run OCR on temp file, returns average
 *  POST /ocr/assign_section.php       → find section by grade + average
 *  POST /student/submit_enrollment.php → final JSON submission
 *  GET  /staff/get_strand.php         → fetch strands for SHS dropdown
 */

const OCR_BASE     = "http://localhost/backend-online-enrollment/ocr";
const STUDENT_BASE = "http://localhost/backend-online-enrollment/student";
const STAFF_BASE   = "http://localhost/backend-online-enrollment/staff";

const STUDENT_TYPES = ["New Student", "Returning Student", "Transferee"];
const GRADE_LEVELS  = ["7","8","9","10","11","12"];
const SHS_GRADES    = ["11","12"];

const STEPS = [
  { label: "Enrollment Info",  desc: "Student type & grade level" },
  { label: "Report Card Scan", desc: "Upload & scan your report card" },
  { label: "Requirements",     desc: "Upload supporting documents" },
  { label: "Review & Submit",  desc: "Confirm and submit" },
];

export default function EnrollmentForm({ onBack }) {
  const studentId = localStorage.getItem("student_id");

  const [step, setStep] = useState(1);

  /* ── Step 1 state ── */
  const [enrollInfo, setEnrollInfo] = useState({
    student_type: "New Student",
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

  const isSHS    = SHS_GRADES.includes(enrollInfo.grade_level);
  const isGrade7 = enrollInfo.grade_level === "7";
  const isTransfer = enrollInfo.student_type === "Transferee";

  useEffect(() => { fetchStrands(); }, []);

  async function fetchStrands() {
    try {
      const res  = await fetch(`${STAFF_BASE}/get_strand.php`, { credentials: "include" });
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
    const res  = await fetch(`${OCR_BASE}/scan_report_card.php`, {
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
      const ocrRes  = await fetch(`${OCR_BASE}/process_ocr.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: ocrBody,
      });
      const ocrData = await ocrRes.json();
      if (ocrData.success) {
        setOcrAverage(String(ocrData.average));
        setOcrStatus("done");
        setOcrMsg(`Average detected: ${ocrData.average}`);
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
    if (isGrade7 && !psaName)      errs.psa      = "PSA Birth Certificate is required for Grade 7.";
    if (isGrade7 && !goodMoralName) errs.goodMoral = "Good Moral is required for Grade 7.";
    setReqErrors(errs);
    return Object.keys(errs).length === 0;
  }

  /* ══════════════════════════════════
     STEP 4 — assign section + submit
  ══════════════════════════════════ */
  async function handleGoToReview() {
    if (!validateRequirements()) return;
    setStep(4);
    setAssigning(true);
    setAssignError(null);
    setAssignedSection(null);
    try {
      const res  = await fetch(`${OCR_BASE}/assign_section.php`, {
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
        student_type:      enrollInfo.student_type, // backend maps New Student→New, others→Old
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
      const res  = await fetch(`${STUDENT_BASE}/submit_enrollment.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setSubmitResult({ success: data.success, message: data.message });
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
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-[#86A18A] hover:text-[#1B5E2C] mb-5 transition-colors">
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Dashboard
        </button>

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.15em] text-[#8C6B12] mb-1">Student Portal</p>
          <h2 className="text-2xl text-[#1B5E2C]" style={{ fontFamily: "'Fraunces', serif" }}>
            Enrollment Form
          </h2>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="h-1.5 w-full bg-[#D9E8D5] rounded-full mb-4 overflow-hidden">
            <div className="h-full bg-[#1B5E2C] rounded-full transition-all duration-300" style={{ width: pctW }} />
          </div>
          <div className="grid grid-cols-4 gap-1">
            {STEPS.map((s, i) => {
              const n = i + 1;
              const active = step === n;
              const done   = step > n;
              return (
                <div key={s.label} className="flex flex-col items-center text-center">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium mb-1 transition-colors ${
                    done ? "bg-[#1B5E2C] text-white" : active ? "bg-[#F2BE22] text-[#1B5E2C]" : "bg-[#EFF4ED] text-[#86A18A]"
                  }`}>
                    {done ? "✓" : n}
                  </div>
                  <p className={`text-xs font-medium hidden sm:block truncate w-full px-1 ${active ? "text-[#1B5E2C]" : "text-[#86A18A]"}`}>
                    {s.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#D9E8D5] shadow-sm p-6">
          <div className="mb-5">
            <h3 className="text-lg font-medium text-[#1B5E2C]" style={{ fontFamily: "'Fraunces', serif" }}>
              Step {step} — {STEPS[step-1].label}
            </h3>
            <p className="text-sm text-[#86A18A]">{STEPS[step-1].desc}</p>
          </div>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">Student Type *</label>
                <select
                  value={enrollInfo.student_type}
                  onChange={(e) => { setEnrollInfo((p) => ({ ...p, student_type: e.target.value })); setInfoErrors((p) => ({ ...p, student_type: undefined })); }}
                  className={inputCls(infoErrors.student_type)}
                >
                  {STUDENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                {infoErrors.student_type && <Err msg={infoErrors.student_type} />}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">Grade Level *</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {GRADE_LEVELS.map((g) => (
                    <button
                      key={g} type="button"
                      onClick={() => { setEnrollInfo((p) => ({ ...p, grade_level: g, strand_id: "" })); setInfoErrors((p) => ({ ...p, grade_level: undefined })); }}
                      className={`rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                        enrollInfo.grade_level === g
                          ? "bg-[#1B5E2C] text-white border-[#1B5E2C]"
                          : "border-[#CBD9C8] text-[#5B6478] hover:border-[#1B5E2C]"
                      }`}
                    >
                      G{g}
                    </button>
                  ))}
                </div>
                {infoErrors.grade_level && <Err msg={infoErrors.grade_level} />}
              </div>

              {isSHS && (
                <div>
                  <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">Strand *</label>
                  {strands.length === 0 ? (
                    <p className="text-sm text-[#86A18A]">Loading strands…</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {strands.map((s) => (
                        <button
                          key={s.strand_id} type="button"
                          onClick={() => { setEnrollInfo((p) => ({ ...p, strand_id: String(s.strand_id) })); setInfoErrors((p) => ({ ...p, strand_id: undefined })); }}
                          className={`rounded-lg border py-2.5 px-3 text-sm font-medium text-left transition-colors ${
                            enrollInfo.strand_id === String(s.strand_id)
                              ? "bg-[#1B5E2C] text-white border-[#1B5E2C]"
                              : "border-[#CBD9C8] text-[#5B6478] hover:border-[#1B5E2C]"
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

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Front upload */}
              <div>
                <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">
                  Report Card — Front *
                </label>
                <p className="text-xs text-[#86A18A] mb-2">
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
                    ocrStatus === "done"  ? "bg-[#1B5E2C]/10 text-[#1B5E2C]"
                    : ocrStatus === "error" ? "bg-[#B3492B]/10 text-[#B3492B]"
                    : "bg-[#F2BE22]/10 text-[#8C6B12]"
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
                  <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">
                    General Average *
                    {ocrStatus === "done" && (
                      <span className="ml-2 text-xs font-normal text-[#86A18A]">(auto-detected — you can correct it)</span>
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
                <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">
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
                  <p className="mt-1.5 text-xs text-[#1B5E2C]">✓ Back uploaded</p>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="bg-[#FAFAF5] rounded-xl border border-[#D9E8D5] p-3 text-xs text-[#5B6478]">
                <span className="font-medium text-[#1B5E2C]">Note:</span> Upload JPG or PNG images only, max 10MB each.
                {isGrade7 && <span className="block mt-1 text-[#8C6B12] font-medium">PSA Birth Certificate and Good Moral are required for Grade 7 enrollees.</span>}
              </div>

              {/* PSA Birth Certificate */}
              <ReqUpload
                label={`PSA Birth Certificate${isGrade7 ? " *" : " (optional)"}`}
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
                label={`Good Moral Certificate${isGrade7 ? " *" : " (optional)"}`}
                file={goodMoralFile}
                uploading={uploading.goodMoral}
                uploaded={!!goodMoralName}
                error={reqErrors.goodMoral}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleReqUpload("goodMoral", f, setGoodMoralFile, setGoodMoralName);
                }}
              />

              {/* Certificate of Transfer — only for transferees */}
              {isTransfer && (
                <ReqUpload
                  label="Certificate of Transfer (optional)"
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

          {/* ── STEP 4 ── */}
          {step === 4 && (
            <div className="space-y-4">
              {/* Section assignment */}
              {assigning && (
                <div className="flex items-center gap-3 bg-[#F2BE22]/10 rounded-xl border border-[#F2BE22]/30 px-4 py-3">
                  <div className="h-5 w-5 rounded-full border-2 border-[#8C6B12] border-t-transparent animate-spin shrink-0" />
                  <p className="text-sm text-[#8C6B12]">Finding your section…</p>
                </div>
              )}
              {assignError && (
                <div className="bg-[#B3492B]/10 border border-[#B3492B]/30 text-[#B3492B] rounded-xl px-4 py-3 text-sm">
                  {assignError}
                </div>
              )}
              {assignedSection && (
                <div className="bg-[#1B5E2C]/8 border border-[#1B5E2C]/25 rounded-xl px-4 py-3">
                  <p className="text-xs text-[#86A18A] mb-0.5">Section Assigned</p>
                  <p className="text-base font-medium text-[#1B5E2C]">{assignedSection.section_name}</p>
                </div>
              )}

              {/* Summary */}
              <div className="bg-[#FAFAF5] rounded-xl border border-[#D9E8D5] divide-y divide-[#EFF4ED]">
                <SummaryRow label="Student Type"    value={enrollInfo.student_type} />
                <SummaryRow label="Grade Level"     value={`Grade ${enrollInfo.grade_level}`} />
                {isSHS && (
                  <SummaryRow label="Strand" value={strands.find((s) => String(s.strand_id) === enrollInfo.strand_id)?.strand_name ?? "—"} />
                )}
                <SummaryRow label="General Average" value={ocrAverage} />
                <SummaryRow label="Report Card"     value="Front & Back ✓" />
                <SummaryRow label="PSA Certificate" value={psaName ? "Uploaded ✓" : "Not uploaded"} />
                <SummaryRow label="Good Moral"      value={goodMoralName ? "Uploaded ✓" : "Not uploaded"} />
                {isTransfer && (
                  <SummaryRow label="Transfer Certificate" value={cotName ? "Uploaded ✓" : "Not uploaded"} />
                )}
              </div>

              {/* Submit result */}
              {submitResult && (
                <div className={`rounded-xl px-4 py-3 text-sm border ${
                  submitResult.success
                    ? "bg-[#1B5E2C]/10 text-[#1B5E2C] border-[#1B5E2C]/25"
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
                  className="flex-1 rounded-lg border border-[#CBD9C8] text-[#5B6478] text-sm font-medium py-2.5 hover:bg-[#FAFAF5]"
                >
                  Back
                </button>
              )}

              {step === 1 && (
                <button
                  onClick={() => { if (validateInfo()) setStep(2); }}
                  className="flex-1 rounded-lg bg-[#1B5E2C] text-white text-sm font-medium py-2.5 hover:bg-[#164A22] transition-colors"
                >
                  Next → Scan Report Card
                </button>
              )}
              {step === 2 && (
                <button
                  onClick={() => { if (validateScan()) setStep(3); }}
                  className="flex-1 rounded-lg bg-[#1B5E2C] text-white text-sm font-medium py-2.5 hover:bg-[#164A22] transition-colors"
                >
                  Next → Upload Requirements
                </button>
              )}
              {step === 3 && (
                <button
                  onClick={handleGoToReview}
                  className="flex-1 rounded-lg bg-[#1B5E2C] text-white text-sm font-medium py-2.5 hover:bg-[#164A22] transition-colors"
                >
                  Next → Review
                </button>
              )}
              {step === 4 && !assigning && !assignError && assignedSection && (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-[#1B5E2C] text-white text-sm font-medium py-2.5 hover:bg-[#164A22] disabled:opacity-60 transition-colors"
                >
                  {submitting ? "Submitting…" : "Submit Enrollment"}
                </button>
              )}
            </div>
          )}

          {submitResult?.success && (
            <button
              onClick={onBack}
              className="w-full mt-6 rounded-lg bg-[#1B5E2C] text-white text-sm font-medium py-2.5 hover:bg-[#164A22] transition-colors"
            >
              Back to Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Upload Box ───────────────────────────────────────────────── */
function UploadBox({ file, accept, inputRef, onChange, label }) {
  return (
    <div
      onClick={() => inputRef.current?.click()}
      className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
        file ? "border-[#1B5E2C] bg-[#1B5E2C]/5" : "border-[#CBD9C8] hover:border-[#1B5E2C] bg-[#FAFAF5]"
      }`}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onChange} />
      {file ? (
        <div className="flex items-center justify-center gap-2">
          <span className="text-[#1B5E2C] text-xl">📷</span>
          <div className="text-left">
            <p className="text-sm font-medium text-[#1B5E2C] truncate max-w-[200px]">{file.name}</p>
            <p className="text-xs text-[#86A18A]">Tap to replace</p>
          </div>
        </div>
      ) : (
        <>
          <div className="h-10 w-10 rounded-full bg-[#D9E8D5] flex items-center justify-center mx-auto mb-2">
            <svg viewBox="0 0 20 20" className="h-5 w-5 text-[#1B5E2C]" fill="none">
              <path d="M10 4v8M10 4l-3 3M10 4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-sm text-[#5B6478]">{label}</p>
          <p className="text-xs text-[#86A18A] mt-1">JPG or PNG · Max 10MB</p>
        </>
      )}
    </div>
  );
}

/* ── Requirement upload row ───────────────────────────────────── */
function ReqUpload({ label, file, uploading, uploaded, error, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">{label}</label>
      <label className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${
        uploaded ? "border-[#1B5E2C] bg-[#1B5E2C]/5"
        : error  ? "border-[#B3492B] bg-[#B3492B]/5"
        : "border-[#CBD9C8] hover:border-[#1B5E2C] bg-white"
      }`}>
        <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={onChange} />
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
          uploaded ? "bg-[#1B5E2C] text-white" : "bg-[#EFF4ED] text-[#86A18A]"
        }`}>
          {uploading ? (
            <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          ) : uploaded ? (
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
              <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
              <path d="M10 4v8M10 4l-3 3M10 4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
        </div>
        <div className="min-w-0">
          <p className={`text-sm ${uploaded ? "text-[#1B5E2C] font-medium" : "text-[#5B6478]"}`}>
            {uploaded ? (file?.name ?? "File uploaded") : "Choose file"}
          </p>
          <p className="text-xs text-[#86A18A]">{uploaded ? "Tap to replace" : "JPG or PNG · Max 10MB"}</p>
        </div>
      </label>
      {error && <Err msg={error} />}
    </div>
  );
}

/* ── Summary row ──────────────────────────────────────────────── */
function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="text-xs text-[#86A18A] w-36 shrink-0">{label}</span>
      <span className="text-sm text-[#1B5E2C] font-medium">{value ?? "—"}</span>
    </div>
  );
}

const inputCls = (err) =>
  `w-full rounded-lg border px-4 py-2.5 text-sm text-[#1B5E2C] placeholder:text-[#A8AEBC] bg-white focus:outline-none focus:ring-2 focus:ring-[#F2BE22] ${
    err ? "border-[#B3492B]" : "border-[#CBD9C8]"
  }`;

function Err({ msg }) {
  return <p className="mt-1 text-xs text-[#B3492B]">{msg}</p>;
}
