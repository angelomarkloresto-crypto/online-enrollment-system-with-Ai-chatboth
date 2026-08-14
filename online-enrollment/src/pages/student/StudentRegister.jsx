import { useState, useEffect, useRef } from "react";

/**
 * StudentRegister - Combined with EnrollmentForm
 * 
 * Steps 1-3: Student Registration (Personal, Address, Guardian)
 * Steps 4-7: Student Enrollment (Info, Scan, Requirements, Review)
 * 
 * Final button: "Enroll now"
 * Password: Auto-set to LRN
 */

const API_BASE     = "http://localhost/backend-online-enrollment/student";
const OCR_BASE     = "http://localhost/backend-online-enrollment/ocr";
const STAFF_BASE   = "http://localhost/backend-online-enrollment/staff";

// Combined steps
const REGISTRATION_STEPS = [
  { label: "Personal",  desc: "Basic information" },
  { label: "Address",   desc: "Home address" },
  { label: "Guardian",  desc: "Parent or guardian" },
];

const ENROLLMENT_STEPS = [
  { label: "Enrollment Info",  desc: "Student type & grade level" },
  { label: "Report Card Scan", desc: "Upload & scan your report card" },
  { label: "Requirements",     desc: "Upload supporting documents" },
  { label: "Review & Submit",  desc: "Confirm and submit" },
];

const ALL_STEPS = [
  ...REGISTRATION_STEPS.map((s, i) => ({ ...s, stepNum: i + 1 })),
  ...ENROLLMENT_STEPS.map((s, i) => ({ ...s, stepNum: i + 4 })),
];

const STUDENT_TYPES = [
  { value: "New Jr High", label: "New Jr. High (Grade 7)" },
  { value: "Old Jr High",  label: "Old Jr. High" },
  { value: "Senior High",  label: "Senior High" },
  { value: "Transferee",   label: "Transferee" },
  { value: "Returning",    label: "Returning" },
];

const SHS_GRADES = ["11","12"];

const GRADE_OPTIONS_BY_TYPE = {
  "New Jr High": ["7"],
  "Old Jr High":  ["8","9","10"],
  "Senior High":  ["11","12"],
  "Transferee":   ["7","8","9","10","11","12"],
  "Returning":    ["7","8","9","10","11","12"],
};

const SUFFIXES = ["", "Jr.", "Sr.", "II", "III", "IV"];
const NATIONALITIES = ["Filipino", "Other"];

const emptyForm = {
  // Registration - Step 1-3
  first_name:       "",
  last_name:        "",
  middle_name:      "",
  suffix:           "",
  lrn:              "",
  contact_no:       "",
  gmail:            "",
  date_of_birth:    "",
  age:              "",
  nationality:      "Filipino",
  province:         "",
  city_municipality:"",
  barangay:         "",
  street_house_no:  "",
  guardian_fullname:    "",
  guardian_relationship:"",
  guardian_contact_no:  "",
  // Enrollment - Step 4-7
  student_type:     "New Jr High",
  grade_level:      "7",
  strand_id:        "",
};

export default function StudentRegister({ onGoLogin }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [regForm, setRegForm] = useState(emptyForm);
  const [regErrors, setRegErrors] = useState({});
  const [enrollErrors, setEnrollErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverMsg, setServerMsg] = useState(null); // {type, text}

  // Enrollment state
  const [strands, setStrands] = useState([]);
  const [frontFile, setFrontFile] = useState(null);
  const [frontName, setFrontName] = useState("");
  const [backFile, setBackFile] = useState(null);
  const [backName, setBackName] = useState("");
  const [ocrAverage, setOcrAverage] = useState("");
  const [ocrStatus, setOcrStatus] = useState("idle");
  const [ocrMsg, setOcrMsg] = useState("");
  const [psaFile, setPsaFile] = useState(null);
  const [psaName, setPsaName] = useState("");
  const [goodMoralFile, setGoodMoralFile] = useState(null);
  const [goodMoralName, setGoodMoralName] = useState("");
  const [cotFile, setCotFile] = useState(null);
  const [cotName, setCotName] = useState("");
  const [uploading, setUploading] = useState({});
  const [assignedSection, setAssignedSection] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState(null);
  const [statusCheckError, setStatusCheckError] = useState(null);

  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);

  const isSHS = SHS_GRADES.includes(regForm.grade_level);
  const isNewJrHigh = regForm.student_type === "New Jr High";
  const isTransferee = regForm.student_type === "Transferee";
  const needsRequirements = isNewJrHigh || isTransferee || (isSHS && regForm.grade_level === "11");

  // Determine which enrollment steps to show
  const activeEnrollmentSteps = needsRequirements 
    ? ["info", "scan", "requirements", "review"] 
    : ["info", "scan", "review"];
  
  const gradeOptions = GRADE_OPTIONS_BY_TYPE[regForm.student_type] ?? [];

  useEffect(() => { fetchStrands(); }, []);

  async function fetchStrands() {
    try {
      const res = await fetch(`${STAFF_BASE}/get_strand.php`, { credentials: "include" });
      const data = await res.json();
      if (data.success) setStrands(data.strands ?? []);
    } catch { /* silently ignore */ }
  }

  function handleRegChange(e) {
    const { name, value } = e.target;
    setRegForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "date_of_birth" && value) {
        const today = new Date();
        const dob = new Date(value);
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        next.age = age >= 0 ? String(age) : "";
      }
      return next;
    });
    setRegErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validateRegistrationStep(step) {
    const errs = {};
    if (step === 1) {
      if (!regForm.first_name.trim()) errs.first_name = "Required.";
      if (!regForm.last_name.trim()) errs.last_name = "Required.";
      if (!/^\d{12}$/.test(regForm.lrn)) errs.lrn = "LRN must be 12 digits.";
      if (!/^09\d{9}$/.test(regForm.contact_no)) errs.contact_no = "Enter a valid PH mobile number (09XXXXXXXXX).";
      if (!/^[^\s@]+@gmail\.com$/.test(regForm.gmail)) errs.gmail = "Enter a valid Gmail address.";
      if (!regForm.date_of_birth) errs.date_of_birth = "Required.";
      if (!regForm.age) errs.age = "Required.";
    }
    if (step === 2) {
      if (!regForm.province.trim()) errs.province = "Required.";
      if (!regForm.city_municipality.trim()) errs.city_municipality = "Required.";
      if (!regForm.barangay.trim()) errs.barangay = "Required.";
      if (!regForm.street_house_no.trim()) errs.street_house_no = "Required.";
    }
    if (step === 3) {
      if (!regForm.guardian_fullname.trim()) errs.guardian_fullname = "Required.";
      if (!regForm.guardian_relationship.trim()) errs.guardian_relationship = "Required.";
      if (!/^09\d{9}$/.test(regForm.guardian_contact_no)) errs.guardian_contact_no = "Enter a valid PH mobile number.";
    }
    setRegErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateEnrollmentStep(step) {
    const errs = {};
    if (step === 4) {
      if (!regForm.student_type) errs.student_type = "Required.";
      if (!regForm.grade_level) errs.grade_level = "Required.";
      if (isSHS && !regForm.strand_id) errs.strand_id = "Select a strand for SHS.";
    }
    if (step === 5) {
      if (!frontName) errs.front = "Upload report card front.";
      if (!backName) errs.back = "Upload report card back.";
      if (!ocrAverage || isNaN(ocrAverage) || Number(ocrAverage) < 60 || Number(ocrAverage) > 100)
        errs.average = "Enter a valid average (60–100).";
    }
    if (step === 6 && needsRequirements) {
      if (!psaName) errs.psa = "PSA Birth Certificate is required.";
      if (!goodMoralName) errs.goodMoral = "Good Moral is required.";
      if (isTransferee && !cotName) errs.cot = "Certificate of Transfer is required for transferees.";
    }
    setEnrollErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext() {
    const step = currentStep;

    // Steps 1-3: registration (Personal, Address, Guardian)
    if (step <= 3) {
      if (validateRegistrationStep(step)) setCurrentStep(step + 1);
      return;
    }

    // Steps 4+: enrollment
    if (!validateEnrollmentStep(step)) return;

    if (step === 5) {
      // Just finished Report Card Scan.
      // If this student type needs Requirements, go there next.
      // Otherwise skip straight to Review (which also assigns a section).
      if (needsRequirements) {
        setCurrentStep(step + 1);
      } else {
        handleGoToReview();
      }
      return;
    }

    if (step === 6 && needsRequirements) {
      // Just finished Requirements — jump to Review (assigns a section).
      handleGoToReview();
      return;
    }

    setCurrentStep(step + 1);
  }

  function handleBack() {
    setCurrentStep(currentStep - 1);
  }

  async function uploadToTemp(file) {
    const body = new FormData();
    body.append("report_card", file);
    const res = await fetch(`${OCR_BASE}/scan_report_card.php`, {
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
    setEnrollErrors({});
    try {
      const filename = await uploadToTemp(file);
      setFrontName(filename);
      setOcrStatus("scanning");
      setOcrMsg("Scanning for your average grade…");
      const ocrBody = JSON.stringify({ filename });
      const ocrRes = await fetch(`${OCR_BASE}/process_ocr.php`, {
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
    } catch {
      setEnrollErrors((p) => ({ ...p, back: "Could not upload back image." }));
    }
  }

  async function handleReqUpload(fileKey, file, setFile, setName) {
    setFile(file);
    setUploading((p) => ({ ...p, [fileKey]: true }));
    setEnrollErrors((p) => ({ ...p, [fileKey]: undefined }));
    try {
      const filename = await uploadToTemp(file);
      setName(filename);
    } catch {
      setEnrollErrors((p) => ({ ...p, [fileKey]: "Upload failed. Try again." }));
    } finally {
      setUploading((p) => ({ ...p, [fileKey]: false }));
    }
  }

  async function checkEnrollmentStatus() {
    try {
      const studentId = localStorage.getItem("student_id");
      if (!studentId) return null;
      const res = await fetch(`${API_BASE}/check_enrollment_status.php?student_id=${studentId}`, { credentials: "include" });
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
    setAssigning(true);
    setAssignError(null);
    setStatusCheckError(null);
    const currentStatus = await checkEnrollmentStatus();
    if (currentStatus === "Approved") {
      setAssigning(false);
      setAssignError("You are already enrolled. Contact your administrator if you need to modify your enrollment.");
      return;
    }
    // Jump to review step — Review is always the last step in the wizard.
    setCurrentStep(totalSteps);
    setAssignedSection(null);
    try {
      const res = await fetch(`${OCR_BASE}/assign_section.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade_level: regForm.grade_level,
          average: Number(ocrAverage),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAssignedSection({ section_id: data.section_id, section_name: data.section_name });
      } else {
        setAssignError(data.message ?? "No available section found for your average.");
      }
    } catch {
      setAssignError("Could not reach the server.");
    } finally {
      setAssigning(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    // First register the student
    setSubmitting(true);
    setServerMsg(null);
    try {
      const regBody = new FormData();
      Object.entries(regForm).forEach(([k, v]) => {
        if (!["student_type", "grade_level", "strand_id"].includes(k)) {
          regBody.append(k, v);
        }
      });
      // Auto-set password as LRN
      regBody.append("password", regForm.lrn);
      
      const regRes = await fetch(`${API_BASE}/student_register.php`, {
        method: "POST", credentials: "include", body: regBody,
      });
      const regData = await regRes.json();
      
      if (!regData.success) {
        setServerMsg({ type: "error", text: regData.message ?? "Registration failed." });
        setSubmitting(false);
        return;
      }

      // Get or use existing student_id
      const studentId = regData.student_id || localStorage.getItem("student_id");
      if (!studentId && regData.student_id) {
        localStorage.setItem("student_id", String(regData.student_id));
      }

      // Then submit enrollment
      if (!assignedSection) {
        setServerMsg({ type: "error", text: "Section not assigned." });
        setSubmitting(false);
        return;
      }

      const enrollPayload = {
        student_id: studentId,
        student_type: regForm.student_type,
        grade_level: regForm.grade_level,
        strand_id: regForm.strand_id || null,
        average_grade: Number(ocrAverage),
        section_id: assignedSection.section_id,
        section_name: assignedSection.section_name,
        report_card_front: frontName,
        report_card_back: backName,
        birth_certificate: psaName || null,
        good_moral: goodMoralName || null,
        certificate_of_transfer: cotName || null,
      };

      const enrollRes = await fetch(`${API_BASE}/submit_enrollment.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enrollPayload),
      });
      const enrollData = await enrollRes.json();
      setSubmitResult({ success: enrollData.success, message: enrollData.message });
      
      if (enrollData.success) {
        setServerMsg({ type: "success", text: "Enrollment successful! Redirecting to login…" });
        onGoLogin?.();
      }
    } catch {
      setServerMsg({ type: "error", text: "Could not reach the server." });
    } finally {
      setSubmitting(false);
    }
  }

  const totalSteps = 3 + activeEnrollmentSteps.length;
  const pctW = `${(currentStep / totalSteps) * 100}%`;
  const allDisplaySteps = [
    ...REGISTRATION_STEPS,
    ...activeEnrollmentSteps.map(k => {
      const meta = { info: "Enrollment Info", scan: "Report Card Scan", requirements: "Requirements", review: "Review & Submit" };
      return { label: meta[k], desc: "" };
    }),
  ];

  return (
    <div className="min-h-screen w-full bg-[#FAFAF5] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        {/* Logo + heading */}
        <div className="flex flex-col items-center text-center mb-7">
          <img src="/assets/gogon-hs-logo.png" alt="Gogon High School" className="h-14 w-14 rounded-full object-cover ring-2 ring-[#F2BE22] mb-4" />
          <p className="text-xs uppercase tracking-[0.2em] text-[#8C6B12] mb-1">Gogon High School · Online Enrollment</p>
          <h1 className="text-2xl sm:text-3xl text-[#1B5E2C]" style={{ fontFamily: "'Fraunces', serif" }}>
            Student Enrollment
          </h1>
        </div>

        {/* Step indicators */}
        <div className="mb-6">
          <div className="h-1.5 w-full bg-[#D9E8D5] rounded-full mb-4 overflow-hidden">
            <div className="h-full bg-[#1B5E2C] rounded-full transition-all duration-300" style={{ width: pctW }} />
          </div>
          <div className={`grid gap-1 ${totalSteps <= 4 ? "grid-cols-4" : totalSteps <= 5 ? "grid-cols-5" : "grid-cols-6"}`}>
            {allDisplaySteps.map((s, i) => {
              const n = i + 1;
              const active = currentStep === n;
              const done = currentStep > n;
              return (
                <div key={i} className="flex flex-col items-center text-center">
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
        <div className="bg-white rounded-2xl border border-[#D9E8D5] shadow-sm p-6 sm:p-7">
          <div className="mb-5">
            <h2 className="text-lg font-medium text-[#1B5E2C]" style={{ fontFamily: "'Fraunces', serif" }}>
              Step {currentStep} — {allDisplaySteps[currentStep - 1]?.label}
            </h2>
            <p className="text-sm text-[#86A18A]">{allDisplaySteps[currentStep - 1]?.desc}</p>
          </div>

          {serverMsg && (
            <div className={`mb-5 rounded-lg px-4 py-3 text-sm border ${
              serverMsg.type === "success"
                ? "bg-[#1B5E2C]/10 text-[#1B5E2C] border-[#1B5E2C]/30"
                : "bg-[#B3492B]/10 text-[#B3492B] border-[#B3492B]/30"
            }`}>
              {serverMsg.text}
            </div>
          )}

          {assignError && (
            <div className="mb-5 rounded-lg px-4 py-3 text-sm bg-[#B3492B]/10 text-[#B3492B] border border-[#B3492B]/30">
              {assignError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Registration Steps */}
            {currentStep === 1 && <StepPersonal form={regForm} errors={regErrors} onChange={handleRegChange} />}
            {currentStep === 2 && <StepAddress form={regForm} errors={regErrors} onChange={handleRegChange} />}
            {currentStep === 3 && <StepGuardian form={regForm} errors={regErrors} onChange={handleRegChange} />}

            {/* Enrollment Steps */}
            {currentStep === 4 && (
              <EnrollmentStepInfo 
                enrollInfo={regForm} 
                setEnrollInfo={setRegForm}
                strands={strands} 
                errors={enrollErrors} 
                setErrors={setEnrollErrors}
              />
            )}
            {currentStep === 5 && (
              <EnrollmentStepScan
                frontFile={frontFile}
                frontName={frontName}
                backFile={backFile}
                backName={backName}
                ocrAverage={ocrAverage}
                ocrStatus={ocrStatus}
                ocrMsg={ocrMsg}
                errors={enrollErrors}
                setErrors={setEnrollErrors}
                onFrontUpload={handleFrontUpload}
                onBackUpload={handleBackUpload}
                onAverageChange={(val) => {
                  setOcrAverage(val);
                  setEnrollErrors((p) => ({ ...p, average: undefined }));
                }}
                frontInputRef={frontInputRef}
                backInputRef={backInputRef}
              />
            )}
            {currentStep === 6 && needsRequirements && (
              <EnrollmentStepRequirements
                psaFile={psaFile}
                psaName={psaName}
                goodMoralFile={goodMoralFile}
                goodMoralName={goodMoralName}
                cotFile={cotFile}
                cotName={cotName}
                isTransferee={isTransferee}
                uploading={uploading}
                errors={enrollErrors}
                onPsaUpload={(e) => { const f = e.target.files?.[0]; if (f) handleReqUpload("psa", f, setPsaFile, setPsaName); }}
                onGoodMoralUpload={(e) => { const f = e.target.files?.[0]; if (f) handleReqUpload("goodMoral", f, setGoodMoralFile, setGoodMoralName); }}
                onCotUpload={(e) => { const f = e.target.files?.[0]; if (f) handleReqUpload("cot", f, setCotFile, setCotName); }}
              />
            )}
            {((currentStep === 7 && needsRequirements) || (currentStep === 6 && !needsRequirements)) && (
              <EnrollmentStepReview
                enrollInfo={regForm}
                strands={strands}
                ocrAverage={ocrAverage}
                frontName={frontName}
                backName={backName}
                psaName={psaName}
                goodMoralName={goodMoralName}
                cotName={cotName}
                assignedSection={assignedSection}
                assigning={assigning}
                needsRequirements={needsRequirements}
                isTransferee={isTransferee}
              />
            )}

            {/* Navigation */}
            <div className={`flex gap-3 mt-6 ${currentStep > 1 ? "" : "justify-center"}`}>
              {currentStep > 1 && (
                <button type="button" onClick={handleBack} className="flex-1 rounded-lg border border-[#CBD9C8] text-[#5B6478] text-sm font-medium py-2.5 hover:bg-[#FAFAF5]">
                  Back
                </button>
              )}
              {currentStep < totalSteps ? (
                <button type="button" onClick={handleNext} className="flex-1 rounded-lg bg-[#1B5E2C] text-white text-sm font-medium py-2.5 hover:bg-[#164A22] transition-colors">
                  Next →
                </button>
              ) : assignError ? (
                <button type="button" onClick={handleGoToReview} className="flex-1 rounded-lg bg-[#1B5E2C] text-white text-sm font-medium py-2.5 hover:bg-[#164A22] transition-colors">
                  Try again
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting || assigning || !assignedSection}
                  className="flex-1 rounded-lg bg-[#1B5E2C] text-white text-sm font-medium py-2.5 hover:bg-[#164A22] disabled:opacity-60 transition-colors"
                >
                  {submitting ? "Enrolling…" : assigning ? "Checking…" : "Enroll now"}
                </button>
              )}
            </div>
          </form>
        </div>

        <p className="text-center text-sm text-[#86A18A] mt-5">
          Already have an account?{" "}
          <button onClick={onGoLogin} className="text-[#8C6B12] font-medium hover:underline">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

// Registration Step Components
function StepPersonal({ form, errors, onChange }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="First Name *" name="first_name" value={form.first_name} error={errors.first_name} onChange={onChange} placeholder="Juan" />
        <Field label="Last Name *" name="last_name" value={form.last_name} error={errors.last_name} onChange={onChange} placeholder="Dela Cruz" />
        <Field label="Middle Name" name="middle_name" value={form.middle_name} onChange={onChange} placeholder="Santos" />
        <div>
          <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">Suffix</label>
          <select name="suffix" value={form.suffix} onChange={onChange} className={inputCls()}>
            {SUFFIXES.map((s) => <option key={s} value={s}>{s || "— None —"}</option>)}
          </select>
        </div>
      </div>
      <Field label="LRN (Learner Reference Number) *" name="lrn" value={form.lrn} error={errors.lrn} onChange={onChange} placeholder="12-digit LRN" maxLength={12} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Gmail Address *" name="gmail" type="email" value={form.gmail} error={errors.gmail} onChange={onChange} placeholder="juan@gmail.com" />
        <Field label="Contact Number *" name="contact_no" value={form.contact_no} error={errors.contact_no} onChange={onChange} placeholder="09XXXXXXXXX" maxLength={11} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">Date of Birth *</label>
          <input type="date" name="date_of_birth" value={form.date_of_birth} onChange={onChange} className={inputCls(errors.date_of_birth)} />
          {errors.date_of_birth && <Err msg={errors.date_of_birth} />}
        </div>
        <Field label="Age" name="age" type="number" value={form.age} onChange={onChange} placeholder="Auto-computed" readOnly />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">Nationality</label>
        <select name="nationality" value={form.nationality} onChange={onChange} className={inputCls()}>
          {NATIONALITIES.map((n) => <option key={n}>{n}</option>)}
        </select>
      </div>
    </div>
  );
}

function StepAddress({ form, errors, onChange }) {
  return (
    <div className="space-y-4">
      <Field label="Province *" name="province" value={form.province} error={errors.province} onChange={onChange} placeholder="e.g. Albay" />
      <Field label="City / Municipality *" name="city_municipality" value={form.city_municipality} error={errors.city_municipality} onChange={onChange} placeholder="e.g. Legazpi City" />
      <Field label="Barangay *" name="barangay" value={form.barangay} error={errors.barangay} onChange={onChange} placeholder="e.g. Gogon" />
      <Field label="Street / House No. *" name="street_house_no" value={form.street_house_no} error={errors.street_house_no} onChange={onChange} placeholder="e.g. 123 Rizal St." />
    </div>
  );
}

function StepGuardian({ form, errors, onChange }) {
  return (
    <div className="space-y-4">
      <Field label="Guardian Full Name *" name="guardian_fullname" value={form.guardian_fullname} error={errors.guardian_fullname} onChange={onChange} placeholder="Maria Dela Cruz" />
      <Field label="Relationship *" name="guardian_relationship" value={form.guardian_relationship} error={errors.guardian_relationship} onChange={onChange} placeholder="e.g. Mother, Father, Aunt" />
      <Field label="Guardian Contact No. *" name="guardian_contact_no" value={form.guardian_contact_no} error={errors.guardian_contact_no} onChange={onChange} placeholder="09XXXXXXXXX" maxLength={11} />
    </div>
  );
}

// Enrollment Step Components
function EnrollmentStepInfo({ enrollInfo, setEnrollInfo, strands, errors, setErrors }) {
  const isSHS = SHS_GRADES.includes(enrollInfo.grade_level);
  const isNewJrHigh = enrollInfo.student_type === "New Jr High";
  const isTransferee = enrollInfo.student_type === "Transferee";
  const needsRequirements = isNewJrHigh || isTransferee || (isSHS && enrollInfo.grade_level === "11");
  const gradeOptions = GRADE_OPTIONS_BY_TYPE[enrollInfo.student_type] ?? [];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">Student Type *</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {STUDENT_TYPES.map((t) => (
            <button
              key={t.value} type="button"
              onClick={() => {
                const opts = GRADE_OPTIONS_BY_TYPE[t.value] ?? [];
                const nextGrade = t.value === "New Jr High" ? "7" : (opts.includes(enrollInfo.grade_level) ? enrollInfo.grade_level : "");
                setEnrollInfo((p) => ({ ...p, student_type: t.value, grade_level: nextGrade, strand_id: "" }));
                setErrors((p) => ({ ...p, student_type: undefined }));
              }}
              className={`rounded-lg border py-2.5 px-3 text-sm font-medium text-left transition-colors ${
                enrollInfo.student_type === t.value
                  ? "bg-[#1B5E2C] text-white border-[#1B5E2C]"
                  : "border-[#CBD9C8] text-[#5B6478] hover:border-[#1B5E2C]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {errors.student_type && <Err msg={errors.student_type} />}
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">Grade Level *</label>
        {isNewJrHigh ? (
          <div className="rounded-lg border border-[#1B5E2C] bg-[#1B5E2C]/5 px-4 py-2.5 text-sm font-medium text-[#1B5E2C]">
            Grade 7 — fixed for new junior high enrollees
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {gradeOptions.map((g) => (
              <button
                key={g} type="button"
                onClick={() => {
                  setEnrollInfo((p) => ({ ...p, grade_level: g, strand_id: "" }));
                  setErrors((p) => ({ ...p, grade_level: undefined }));
                }}
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
        )}
        {errors.grade_level && <Err msg={errors.grade_level} />}
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
                  onClick={() => {
                    setEnrollInfo((p) => ({ ...p, strand_id: String(s.strand_id) }));
                    setErrors((p) => ({ ...p, strand_id: undefined }));
                  }}
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
          {errors.strand_id && <Err msg={errors.strand_id} />}
        </div>
      )}

      {needsRequirements && (
        <p className="text-xs text-[#8C6B12] bg-[#F2BE22]/10 border border-[#F2BE22]/30 rounded-lg px-3 py-2">
          {isTransferee
            ? "As a transferee, you'll need to upload your report card and requirements (PSA Birth Certificate, Good Moral, and Certificate of Transfer)."
            : "You'll need to upload your requirements (PSA Birth Certificate and Good Moral) since this is your first record with the school."}
        </p>
      )}
    </div>
  );
}

function EnrollmentStepScan({ frontFile, frontName, backFile, backName, ocrAverage, ocrStatus, ocrMsg, errors, setErrors, onFrontUpload, onBackUpload, onAverageChange, frontInputRef, backInputRef }) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">Report Card — Front *</label>
        <p className="text-xs text-[#86A18A] mb-2">The system will scan this to detect your average grade. Use a clear, well-lit photo.</p>
        <UploadBox file={frontFile} accept="image/jpeg,image/png" inputRef={frontInputRef} onChange={onFrontUpload} label="Upload front of report card" />
        {errors.front && <Err msg={errors.front} />}
        {ocrStatus !== "idle" && (
          <div className={`mt-3 rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${
            ocrStatus === "done" ? "bg-[#1B5E2C]/10 text-[#1B5E2C]"
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

      {(ocrStatus === "done" || ocrStatus === "error") && (
        <div>
          <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">
            General Average * {ocrStatus === "done" && <span className="ml-2 text-xs font-normal text-[#86A18A]">(auto-detected — you can correct it)</span>} {ocrStatus === "error" && <span className="ml-2 text-xs font-normal text-[#B3492B]">(enter manually)</span>}
          </label>
          <input
            type="number" min="60" max="100" step="0.01"
            value={ocrAverage}
            onChange={(e) => {
              onAverageChange(e.target.value);
            }}
            placeholder="e.g. 88.5"
            className={inputCls(errors.average)}
          />
          {errors.average && <Err msg={errors.average} />}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">Report Card — Back *</label>
        <UploadBox file={backFile} accept="image/jpeg,image/png" inputRef={backInputRef} onChange={onBackUpload} label="Upload back of report card" />
        {errors.back && <Err msg={errors.back} />}
        {backName && !errors.back && <p className="mt-1.5 text-xs text-[#1B5E2C]">✓ Back uploaded</p>}
      </div>
    </div>
  );
}

function EnrollmentStepRequirements({ psaFile, psaName, goodMoralFile, goodMoralName, cotFile, cotName, isTransferee, uploading, errors, onPsaUpload, onGoodMoralUpload, onCotUpload }) {
  return (
    <div className="space-y-5">
      <div className="bg-[#FAFAF5] rounded-xl border border-[#D9E8D5] p-3 text-xs text-[#5B6478]">
        <span className="font-medium text-[#1B5E2C]">Note:</span> Upload JPG or PNG images only, max 10MB each.
        <span className="block mt-1 text-[#8C6B12] font-medium">
          {isTransferee
            ? "PSA Birth Certificate, Good Moral, and Certificate of Transfer are required for transferees."
            : "PSA Birth Certificate and Good Moral are required."}
        </span>
      </div>

      <ReqUpload label="PSA Birth Certificate *" file={psaFile} uploading={uploading.psa} uploaded={!!psaName} error={errors.psa} onChange={onPsaUpload} />
      <ReqUpload label="Good Moral Certificate *" file={goodMoralFile} uploading={uploading.goodMoral} uploaded={!!goodMoralName} error={errors.goodMoral} onChange={onGoodMoralUpload} />
      {isTransferee && <ReqUpload label="Certificate of Transfer *" file={cotFile} uploading={uploading.cot} uploaded={!!cotName} error={errors.cot} onChange={onCotUpload} />}
    </div>
  );
}

function EnrollmentStepReview({ enrollInfo, strands, ocrAverage, frontName, backName, psaName, goodMoralName, cotName, assignedSection, assigning, needsRequirements, isTransferee }) {
  const isSHS = SHS_GRADES.includes(enrollInfo.grade_level);
  return (
    <div className="space-y-4">
      {assigning && (
        <div className="flex items-center gap-3 bg-[#F2BE22]/10 rounded-xl border border-[#F2BE22]/30 px-4 py-3">
          <div className="h-5 w-5 rounded-full border-2 border-[#8C6B12] border-t-transparent animate-spin shrink-0" />
          <p className="text-sm text-[#8C6B12]">Checking enrollment status…</p>
        </div>
      )}
      {assignedSection && (
        <div className="bg-[#1B5E2C]/8 border border-[#1B5E2C]/25 rounded-xl px-4 py-3">
          <p className="text-xs text-[#86A18A] mb-0.5">Section Assigned</p>
          <p className="text-base font-medium text-[#1B5E2C]">{assignedSection.section_name}</p>
        </div>
      )}
      <div className="bg-[#FAFAF5] rounded-xl border border-[#D9E8D5] divide-y divide-[#EFF4ED]">
        <SummaryRow label="Student Type" value={enrollInfo.student_type} />
        <SummaryRow label="Grade Level" value={`Grade ${enrollInfo.grade_level}`} />
        {isSHS && <SummaryRow label="Strand" value={strands.find((s) => String(s.strand_id) === enrollInfo.strand_id)?.strand_name ?? "—"} />}
        <SummaryRow label="General Average" value={ocrAverage} />
        <SummaryRow label="Report Card" value="Front & Back ✓" />
        {needsRequirements && (
          <>
            <SummaryRow label="PSA Certificate" value={psaName ? "Uploaded ✓" : "Not uploaded"} />
            <SummaryRow label="Good Moral" value={goodMoralName ? "Uploaded ✓" : "Not uploaded"} />
            {isTransferee && <SummaryRow label="Transfer Certificate" value={cotName ? "Uploaded ✓" : "Not uploaded"} />}
          </>
        )}
      </div>
    </div>
  );
}

// Shared Components
function Field({ label, name, value, onChange, error, placeholder, type = "text", readOnly, maxLength }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">{label}</label>
      <input
        name={name} type={type} value={value} onChange={onChange}
        placeholder={placeholder} readOnly={readOnly} maxLength={maxLength}
        className={`${inputCls(error)} ${readOnly ? "bg-[#FAFAF5] text-[#86A18A] cursor-not-allowed" : ""}`}
      />
      {error && <Err msg={error} />}
    </div>
  );
}

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

function ReqUpload({ label, file, uploading, uploaded, error, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">{label}</label>
      <label className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${
        uploaded ? "border-[#1B5E2C] bg-[#1B5E2C]/5"
        : error ? "border-[#B3492B] bg-[#B3492B]/5"
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
              <path d="M10 5v8M10 5l-3 3M10 5l3 3M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-[#1B5E2C]">{file?.name || (uploaded ? "Uploaded" : "Choose file")}</p>
          <p className="text-xs text-[#86A18A]">JPG or PNG · Max 10MB</p>
        </div>
      </label>
      {error && <Err msg={error} />}
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-4 first:pt-0 last:pb-0">
      <span className="text-sm text-[#86A18A]">{label}</span>
      <span className="text-sm font-medium text-[#1B5E2C]">{value}</span>
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
