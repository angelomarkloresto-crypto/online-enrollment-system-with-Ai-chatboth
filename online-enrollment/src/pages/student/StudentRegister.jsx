import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";



const API_BASE     = "/backend-online-enrollment/student";
const OCR_BASE     = "/backend-online-enrollment/ocr";
const STAFF_BASE   = "/backend-online-enrollment/staff";

const REGISTRATION_STEPS = [
  { label: "Personal",  desc: "Basic information" },
  { label: "Address",   desc: "Home address" },
  { label: "Guardian",  desc: "Parent or guardian" },
];

const ENROLLMENT_STEPS = [
  { label: "Requirements", desc: "Report card and supporting documents" },
  { label: "Review & Submit", desc: "Confirm your application" },
];

const STUDENT_TYPES = [
  { value: "New", label: "New" },
  { value: "Old", label: "Old" },
  { value: "Returning", label: "Returning" },
];

const SCHOOL_LEVELS = [
  { value: "JHS", label: "Junior High School" },
  { value: "SHS", label: "Senior High School" },
];

const SHS_GRADES = ["11","12"];

const GRADE_OPTIONS_BY_TYPE = {
  "New": ["7","11"],
  "Old": ["8","9","10","12"],
  "Returning": ["7","8","9","10","11","12"],
};

function getGradeOptionsForSelection(studentType, schoolLevel) {
  if (!studentType) return [];
  const level = schoolLevel === "SHS" ? "SHS" : "JHS";

  if (studentType === "New") return level === "JHS" ? ["7"] : ["11"];
  if (studentType === "Old") return level === "JHS" ? ["8","9","10"] : ["12"];
  if (studentType === "Returning") return level === "JHS" ? ["7","8","9","10"] : ["11","12"];
  return GRADE_OPTIONS_BY_TYPE[studentType] ?? [];
}

// Backend (submit_enrollment.php) only hard-requires PSA Birth Certificate
// and Good Moral when grade_level === "7". Old (continuing) students already
// have these on file and must never be asked to resubmit them.
function requiresGrade7Documents(studentType, gradeLevel) {
  if (studentType === "Old") return false;
  return studentType === "New" || String(gradeLevel) === "7";
}

function requiresSupportingDocuments(studentType, gradeLevel) {
  return requiresGrade7Documents(studentType, gradeLevel);
}

const SUFFIXES = ["", "Jr.", "Sr.", "II", "III", "IV"];
const NATIONALITIES = ["Filipino", "Other"];
const isValidOptionalPhone = (value) =>
  value === "" || /^(?:09\d{9}|\+639\d{9})$/.test(value);

function calculateAge(dateOfBirth) {
  const [year, month, day] = String(dateOfBirth).split("-").map(Number);
  if (!year || !month || !day) return "";

  const birthDate = new Date(year, month - 1, day);
  if (
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() + 1 !== month ||
    birthDate.getDate() !== day
  ) return "";

  const today = new Date();
  let age = today.getFullYear() - year;
  if (
    today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day)
  ) {
    age--;
  }
  return age >= 0 ? String(age) : "";
}

function normalizeNamePart(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[.,'’‘`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compareDocumentNames(birthData, reportCardData) {
  if (!birthData || !reportCardData) return "Needs Review";
  for (const field of ["first_name", "last_name"]) {
    const birthName = normalizeNamePart(birthData[field]);
    const reportName = normalizeNamePart(reportCardData[field]);
    if (!birthName || !reportName) return "Needs Review";
    if (birthName !== reportName) return "Failed";
  }

  for (const field of ["middle_name", "suffix"]) {
    const birthName = normalizeNamePart(birthData[field]);
    const reportName = normalizeNamePart(reportCardData[field]);
    if (birthName && reportName && birthName !== reportName) return "Failed";
  }
  return "Passed";
}

function getBirthCertificateVerification(ocrData, reportCardData) {
  const keywordStatus = ocrData?.document_type === "birth_certificate"
    ? ocrData?.verification?.birth_certificate?.keyword_status
    : "Failed";
  const safeKeywordStatus = ["Passed", "Needs Review", "Failed"].includes(keywordStatus)
    ? keywordStatus
    : "Needs Review";
  const nameMatchStatus = compareDocumentNames(
    ocrData?.extracted_data,
    reportCardData
  );
  const status = safeKeywordStatus === "Failed"
    ? "Failed"
    : safeKeywordStatus === "Passed" && nameMatchStatus === "Passed"
      ? "Passed"
      : "Needs Review";
  return {
    status,
    keyword_status: safeKeywordStatus,
    name_match_status: nameMatchStatus,
  };
}

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
  sex:              "",
  nationality:      "Filipino",
  province:         "",
  city_municipality:"",
  barangay:         "",
  street_house_no:  "",
  father_name:      "",
  father_contact_number: "",
  mother_maiden_name: "",
  mother_contact_number: "",
  guardian_name:    "",
  guardian_contact_number: "",
  // Enrollment - Step 4-7
  student_type:     "New",
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
  const [frontOcrStatus, setFrontOcrStatus] = useState("idle");
  const [frontOcrMsg, setFrontOcrMsg] = useState("");
  const [ocrAverage, setOcrAverage] = useState("");
  const [ocrStatus, setOcrStatus] = useState("idle");
  const [ocrMsg, setOcrMsg] = useState("");
  const [psaFile, setPsaFile] = useState(null);
  const [psaName, setPsaName] = useState("");
  const [psaOcrStatus, setPsaOcrStatus] = useState("idle");
  const [psaOcrMsg, setPsaOcrMsg] = useState("");
  const [birthVerification, setBirthVerification] = useState(null);
  const [goodMoralFile, setGoodMoralFile] = useState(null);
  const [goodMoralName, setGoodMoralName] = useState("");
  const [goodMoralOcrStatus, setGoodMoralOcrStatus] = useState("idle");
  const [goodMoralOcrMsg, setGoodMoralOcrMsg] = useState("");
  const [goodMoralVerification, setGoodMoralVerification] = useState(null);
  const [uploading, setUploading] = useState({});
  const [assignedSection, setAssignedSection] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState(null);
  const [statusCheckError, setStatusCheckError] = useState(null);

  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);
  const reportCardDataRef = useRef(null);
  const reportCardFrontDataRef = useRef(null);
  const reportCardBackDataRef = useRef(null);
  const birthOcrDataRef = useRef(null);
  const manuallyEditedFieldsRef = useRef(new Set());
  const averageManuallyEditedRef = useRef(false);
  const ocrRequestsRef = useRef(new Map());
  const uploadSequenceRef = useRef({
    reportCard: 0,
    reportCardFront: 0,
    psa: 0,
    goodMoral: 0,
  });

  const isSHS = SHS_GRADES.includes(regForm.grade_level);
  const requiresGrade7Docs = requiresGrade7Documents(regForm.student_type, regForm.grade_level);
  const needsRequirements = requiresSupportingDocuments(regForm.student_type, regForm.grade_level);

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
    manuallyEditedFieldsRef.current.add(name);
    setRegForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "date_of_birth" && value) {
        next.age = calculateAge(value);
      }
      return next;
    });
    setRegErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validateRegistrationStep(step) {
    const errs = {};
    if (step === 2) {
      if (!regForm.first_name.trim()) errs.first_name = "Required.";
      if (!regForm.last_name.trim()) errs.last_name = "Required.";
      if (!/^\d{12}$/.test(regForm.lrn)) errs.lrn = "LRN must be 12 digits.";
      if (!/^09\d{9}$/.test(regForm.contact_no)) errs.contact_no = "Enter a valid PH mobile number (09XXXXXXXXX).";
      if (!/^[^\s@]+@gmail\.com$/.test(regForm.gmail)) errs.gmail = "Enter a valid Gmail address.";
      if (!regForm.date_of_birth) errs.date_of_birth = "Required.";
      if (!regForm.age) errs.age = "Required.";
      if (!regForm.sex) errs.sex = "Required.";
    }
    if (step === 3) {
      if (!regForm.province.trim()) errs.province = "Required.";
      if (!regForm.city_municipality.trim()) errs.city_municipality = "Required.";
      if (!regForm.barangay.trim()) errs.barangay = "Required.";
      if (!regForm.street_house_no.trim()) errs.street_house_no = "Required.";
    }
    if (step === 4) {
      if (!regForm.guardian_name.trim()) errs.guardian_name = "Required.";
      for (const field of [
        "father_contact_number",
        "mother_contact_number",
        "guardian_contact_number",
      ]) {
        if (!isValidOptionalPhone(regForm[field])) {
          errs[field] = "Enter a valid PH mobile number (09XXXXXXXXX or +639XXXXXXXXX).";
        }
      }
    }
    setRegErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateEnrollmentStep(step) {
    const errs = {};
    if (step === 2) {
      if (!frontName) errs.back = "Upload report card back.";
      if (!backName) errs.front = "Upload report card front.";
      if (!ocrAverage || isNaN(ocrAverage) || Number(ocrAverage) < 60 || Number(ocrAverage) > 100)
        errs.average = "Enter a valid average (60–100).";
      if (requiresGrade7Docs) {
        if (!psaName) errs.psa = "PSA Birth Certificate is required for first-time students.";
        if (!goodMoralName) errs.goodMoral = "Good Moral is required for first-time students.";
      }
    }
    setEnrollErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleStudentTypeSelect(type, schoolLevel, gradeOverride) {
    const level = schoolLevel ?? "JHS";
    let nextGrade = gradeOverride ?? "";

    if (!nextGrade) {
      if (type === "New") {
        nextGrade = level === "JHS" ? "7" : "11";
      } else if (type === "Old") {
        nextGrade = level === "JHS" ? "8" : "12";
      } else if (type === "Returning") {
        nextGrade = level === "JHS" ? "7" : "11";
      }
    }

    setRegForm((prev) => ({
      ...prev,
      student_type: type,
      grade_level: nextGrade,
      strand_id: level === "SHS" ? prev.strand_id : "",
    }));
    setEnrollErrors((prev) => ({ ...prev, student_type: undefined, grade_level: undefined, strand_id: undefined }));
  }

  function handleNext() {
    const step = currentStep;

    if (step === 1) {
      if (!regForm.student_type) {
        setEnrollErrors((prev) => ({ ...prev, student_type: "Please choose a student type." }));
        return;
      }
      if (!regForm.grade_level) {
        setEnrollErrors((prev) => ({ ...prev, grade_level: "Please choose a grade level." }));
        return;
      }
      if (SHS_GRADES.includes(regForm.grade_level) && !regForm.strand_id) {
        setEnrollErrors((prev) => ({ ...prev, strand_id: "Please choose a strand for senior high." }));
        return;
      }
      setCurrentStep(2);
      return;
    }

    if (step === 2) {
      if (validateEnrollmentStep(2)) setCurrentStep(3);
      return;
    }

    if (step >= 3 && step <= 5) {
      if (!validateRegistrationStep(step - 1)) return;
      if (step === 5) {
        handleGoToReview();
      } else {
        setCurrentStep(step + 1);
      }
      return;
    }

    if (step === 6) {
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

  function processOcr(filename) {
    const existingRequest = ocrRequestsRef.current.get(filename);
    if (existingRequest) return existingRequest;

    const request = fetch(`${OCR_BASE}/process_ocr.php`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message ?? "Could not process this document.");
        }
        return data;
      })
      .catch((error) => {
        ocrRequestsRef.current.delete(filename);
        throw error;
      });
    ocrRequestsRef.current.set(filename, request);
    return request;
  }

  function applyExtractedFields(extractedData, allowedFields) {
    if (!extractedData || typeof extractedData !== "object") return 0;

    const updates = {};
    for (const field of allowedFields) {
      const value = extractedData[field];
      if (typeof value !== "string" || !value.trim()) continue;

      const normalizedValue = value.trim();
      if (field === "lrn" && !/^\d{12}$/.test(normalizedValue)) continue;
      if (field === "suffix" && !SUFFIXES.includes(normalizedValue)) continue;
      if (
        field === "date_of_birth" &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue) ||
          calculateAge(normalizedValue) === "")
      ) continue;
      updates[field] = normalizedValue;
    }

    if (Object.keys(updates).length === 0) return 0;

    setRegForm((previous) => {
      const next = { ...previous };
      for (const [field, value] of Object.entries(updates)) {
        if (
          !manuallyEditedFieldsRef.current.has(field) &&
          !String(previous[field] ?? "").trim()
        ) {
          next[field] = value;
        }
      }
      if (!String(previous.date_of_birth ?? "").trim() && updates.date_of_birth) {
        next.age = calculateAge(updates.date_of_birth);
      }
      return next;
    });
    return Object.keys(updates).length;
  }

  function applyReportCardFields(ocrData, side) {
    const extractedData = ocrData?.extracted_data;
    if (!extractedData || typeof extractedData !== "object") return 0;

    const isReportCard = ocrData.document_type === "report_card";
    const fields = isReportCard
      ? ["first_name", "middle_name", "last_name", "suffix", "lrn"]
      : ["lrn"];
    const count = applyExtractedFields(extractedData, fields);
    const sideData = isReportCard
      ? Object.fromEntries(
          fields
            .filter((field) => typeof extractedData[field] === "string")
            .map((field) => [field, extractedData[field]])
        )
      : {};

    if (side === "front") reportCardFrontDataRef.current = sideData;
    else reportCardBackDataRef.current = sideData;

    reportCardDataRef.current = {
      ...(reportCardFrontDataRef.current ?? {}),
      ...(reportCardBackDataRef.current ?? {}),
    };
    return count;
  }

  async function handleFrontUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const sequence = ++uploadSequenceRef.current.reportCard;
    setFrontFile(file);
    setFrontName("");
    setOcrStatus("uploading");
    setOcrMsg("Uploading report card back…");
    reportCardBackDataRef.current = null;
    reportCardDataRef.current = reportCardFrontDataRef.current ?? null;
    if (!averageManuallyEditedRef.current) setOcrAverage("");
    if (birthOcrDataRef.current) {
      setBirthVerification(
        getBirthCertificateVerification(birthOcrDataRef.current, null)
      );
    }
    setEnrollErrors({});
    try {
      const filename = await uploadToTemp(file);
      if (sequence !== uploadSequenceRef.current.reportCard) return;
      setFrontName(filename);
      setOcrStatus("scanning");
      setOcrMsg("Scanning the report card back for the average and student details…");
      const ocrData = await processOcr(filename);
      if (sequence !== uploadSequenceRef.current.reportCard) return;
      const isReportCard = ocrData.document_type === "report_card";
      const extractedCount = applyReportCardFields(ocrData, "back");
      if (birthOcrDataRef.current) {
        setBirthVerification(
          getBirthCertificateVerification(
            birthOcrDataRef.current,
            reportCardDataRef.current
          )
        );
      }
      const average = isReportCard
        ? Number(ocrData.average ?? ocrData.extracted_data?.average_grade)
        : Number.NaN;
      if (Number.isFinite(average) && average >= 60 && average <= 100) {
        if (!averageManuallyEditedRef.current) setOcrAverage(String(average));
        setOcrStatus("done");
        setOcrMsg(
          `Average detected: ${average}. ${averageManuallyEditedRef.current ? "Your manually entered average was preserved." : "Review the result before continuing."} ${extractedCount > 0 ? "Readable student details were filled in; review them in the next steps." : "Enter any missing details manually."}`
        );
      } else {
        setOcrStatus("error");
        setOcrMsg("Could not detect a valid average. Enter it manually. Any readable student details were filled in for review.");
      }
    } catch (err) {
      if (sequence !== uploadSequenceRef.current.reportCard) return;
      setOcrStatus("error");
      setOcrMsg(err.message ?? "Could not process image.");
    }
  }

  async function handleBackUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const sequence = ++uploadSequenceRef.current.reportCardFront;
    setBackFile(file);
    setBackName("");
    setFrontOcrStatus("uploading");
    setFrontOcrMsg("Uploading report card front…");
    reportCardFrontDataRef.current = null;
    reportCardDataRef.current = reportCardBackDataRef.current ?? null;
    if (birthOcrDataRef.current) {
      setBirthVerification(
        getBirthCertificateVerification(
          birthOcrDataRef.current,
          reportCardDataRef.current
        )
      );
    }
    setEnrollErrors((p) => ({ ...p, front: undefined }));
    try {
      const filename = await uploadToTemp(file);
      if (sequence !== uploadSequenceRef.current.reportCardFront) return;
      setBackName(filename);
      setFrontOcrStatus("scanning");
      setFrontOcrMsg("Scanning the report card front for the student's LRN…");
      const ocrData = await processOcr(filename);
      if (sequence !== uploadSequenceRef.current.reportCardFront) return;
      const extractedCount = applyReportCardFields(ocrData, "front");
      if (birthOcrDataRef.current) {
        setBirthVerification(
          getBirthCertificateVerification(
            birthOcrDataRef.current,
            reportCardDataRef.current
          )
        );
      }
      const hasLrn = /^\d{12}$/.test(String(ocrData.extracted_data?.lrn ?? ""));
      if (hasLrn) {
        setFrontOcrStatus("done");
        setFrontOcrMsg("LRN detected from the report card front. Review the value in your student details.");
      } else if (extractedCount > 0) {
        setFrontOcrStatus("done");
        setFrontOcrMsg("Student details detected. The LRN was not readable; enter it manually.");
      } else {
        setFrontOcrStatus("error");
        setFrontOcrMsg("Could not read an LRN from the report card front. Enter it manually or upload a clearer image.");
      }
    } catch (error) {
      if (sequence !== uploadSequenceRef.current.reportCardFront) return;
      setEnrollErrors((p) => ({ ...p, front: "Could not upload or scan the front report card." }));
      setFrontOcrStatus("error");
      setFrontOcrMsg(error.message ?? "Could not scan the report card front. Enter the LRN manually.");
    }
  }

  async function handleReqUpload(fileKey, file, setFile, setName) {
    const sequenceKey = fileKey === "psa" || fileKey === "goodMoral"
      ? fileKey
      : null;
    const sequence = sequenceKey
      ? ++uploadSequenceRef.current[sequenceKey]
      : null;
    setFile(file);
    setName("");
    setUploading((p) => ({ ...p, [fileKey]: true }));
    setEnrollErrors((p) => ({ ...p, [fileKey]: undefined }));
    if (fileKey === "psa") {
      birthOcrDataRef.current = null;
      setBirthVerification(null);
      setPsaOcrStatus("scanning");
      setPsaOcrMsg("Uploading birth certificate for reading…");
    } else if (fileKey === "goodMoral") {
      setGoodMoralVerification(null);
      setGoodMoralOcrStatus("scanning");
      setGoodMoralOcrMsg("Uploading Good Moral certificate for title check…");
    }
    try {
      const filename = await uploadToTemp(file);
      if (sequenceKey && sequence !== uploadSequenceRef.current[sequenceKey]) return;
      setName(filename);
      if (fileKey === "psa" || fileKey === "goodMoral") {
        const isPsa = fileKey === "psa";
        if (isPsa) {
        setPsaOcrStatus("scanning");
          setPsaOcrMsg("Checking birth-certificate wording and student name…");
        } else {
          setGoodMoralOcrStatus("scanning");
          setGoodMoralOcrMsg("Checking for the Good Moral certificate title…");
        }
        try {
          const ocrData = await processOcr(filename);
          if (sequence !== uploadSequenceRef.current[sequenceKey]) return;
          if (isPsa) {
            birthOcrDataRef.current = ocrData;
            const verification = getBirthCertificateVerification(
              ocrData,
              reportCardDataRef.current
            );
            setBirthVerification(verification);
            setPsaOcrStatus(
              verification.status === "Passed" ? "done" : "error"
            );
            setPsaOcrMsg(
              verification.status === "Passed"
                ? "Strong birth-certificate wording and matching student name detected. Staff will still verify the original document."
                : verification.keyword_status === "Failed"
                  ? "Birth-certificate wording was not detected. Replace the image or continue for staff review."
                  : verification.name_match_status === "Needs Review"
                    ? "The student name could not be confirmed against the report card. Staff review is needed."
                    : "Only a fallback birth-certificate title was detected. Staff review is needed."
            );
          } else {
            const result = ocrData.verification?.good_moral;
            const status = result?.status === "Passed"
              ? "Passed"
              : "Needs Review";
            setGoodMoralVerification({ status });
            setGoodMoralOcrStatus(status === "Passed" ? "done" : "error");
            setGoodMoralOcrMsg(
              status === "Passed"
                ? "Good Moral certificate title detected. Staff must still review the document."
                : "The required title was not detected or OCR was unclear. Staff review is needed."
            );
          }
        } catch (error) {
          if (sequence !== uploadSequenceRef.current[sequenceKey]) return;
          if (isPsa) {
            setBirthVerification({
              status: "Needs Review",
              keyword_status: "Needs Review",
              name_match_status: "Needs Review",
            });
            setPsaOcrStatus("error");
            setPsaOcrMsg(error.message ?? "Could not verify the birth certificate. Staff review is needed.");
          } else {
            setGoodMoralVerification({ status: "Needs Review" });
            setGoodMoralOcrStatus("error");
            setGoodMoralOcrMsg(error.message ?? "Could not verify the Good Moral title. Staff review is needed.");
          }
        }
      }
    } catch (error) {
      if (sequenceKey && sequence !== uploadSequenceRef.current[sequenceKey]) return;
      setEnrollErrors((p) => ({ ...p, [fileKey]: "Upload failed. Try again." }));
      if (fileKey === "psa") {
        setBirthVerification({
          status: "Needs Review",
          keyword_status: "Needs Review",
          name_match_status: "Needs Review",
        });
        setPsaOcrStatus("error");
        setPsaOcrMsg(error.message ?? "Could not upload the birth certificate for reading.");
      } else if (fileKey === "goodMoral") {
        setGoodMoralVerification({ status: "Needs Review" });
        setGoodMoralOcrStatus("error");
        setGoodMoralOcrMsg(error.message ?? "Could not upload the Good Moral certificate for checking.");
      }
    } finally {
      if (!sequenceKey || sequence === uploadSequenceRef.current[sequenceKey]) {
        setUploading((p) => ({ ...p, [fileKey]: false }));
      }
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

      // Persist the newly created student ID before submitting the enrollment.
      let regStudentId = String(regData.student_id ?? regData.lrn ?? localStorage.getItem("student_id") ?? "");

      if (!regStudentId) {
        try {
          const loginRes = await fetch(`${API_BASE}/student_login.php`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              gmail: regForm.gmail,
              password: regForm.lrn,
            }).toString(),
          });
          const loginData = await loginRes.json();
          regStudentId = String(loginData?.student?.student_id ?? loginData?.student?.lrn ?? loginData?.student_id ?? loginData?.lrn ?? "");
        } catch {
          // ignore and fail below
        }
      }

      if (!regStudentId) {
        setServerMsg({ type: "error", text: "Registration succeeded but the student ID was not returned. Please try again." });
        setSubmitting(false);
        return;
      }
      localStorage.setItem("student_id", String(regStudentId));

      // Then submit enrollment
      if (!assignedSection) {
        setServerMsg({ type: "error", text: "Section not assigned." });
        setSubmitting(false);
        return;
      }

      const studentId = regStudentId;

      const enrollPayload = {
        student_id: studentId,
        student_type: regForm.student_type,
        grade_level: regForm.grade_level,
        strand_id: regForm.strand_id || null,
        average_grade: Number(ocrAverage),
        section_id: assignedSection.section_id,
        section_name: assignedSection.section_name,
        report_card_front: backName,
        report_card_back: frontName,
        birth_certificate: psaName || null,
        good_moral: goodMoralName || null,
        ocr_verification: {
          birth_certificate: birthVerification,
          good_moral: goodMoralVerification,
        },
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
        localStorage.setItem("student_id", String(studentId));
        localStorage.setItem("student_name", `${regForm.first_name} ${regForm.last_name}`.trim());
        localStorage.setItem("student_gmail", regForm.gmail);
        setServerMsg({ type: "success", text: "Enrollment submitted successfully. Please sign in to continue." });
        setTimeout(() => onGoLogin?.(), 900);
      }
    } catch {
      setServerMsg({ type: "error", text: "Could not reach the server." });
    } finally {
      setSubmitting(false);
    }
  }

  const totalSteps = 1 + ENROLLMENT_STEPS.length + REGISTRATION_STEPS.length;
  const pctW = `${(currentStep / totalSteps) * 100}%`;
  const allDisplaySteps = [
    { label: "Student Type", desc: "Choose your enrollment path" },
    ENROLLMENT_STEPS[0],
    ...REGISTRATION_STEPS,
    ENROLLMENT_STEPS[1],
  ];

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-white">
      <header className="bg-[#155000] text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-4">
          <div className="flex items-center gap-3">
            <img
              src="/assets/gogon-hs-logo.jpg"
              alt="Gogon High School"
              className="h-12 w-12 rounded-full bg-white object-cover ring-2 ring-white/70"
            />
            <div className="leading-tight">
              <p className="font-semibold">Gogon High School</p>
              <p className="text-xs text-white/80">Online Enrollment System</p>
            </div>
          </div>
          <h1 className="text-lg font-semibold sm:text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>Enrollment Form</h1>
        </div>
      </header>
      <motion.main
        initial={{ opacity: 0, x: 72 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 150, damping: 18 }}
        className="mx-auto w-full max-w-5xl px-3 py-6 sm:px-6 sm:py-10"
      >
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#326b22]">New student application</p>
          <h2 className="mt-1 text-2xl font-semibold text-[#0B2B26]" style={{ fontFamily: "'Fraunces', serif" }}>
            Start your enrollment
          </h2>
        </div>

        {/* Step indicators */}
        <div className="mb-6 sm:mb-8">
          <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-[#8BA77F]/40">
            <motion.div className="h-full rounded-full bg-[#155000]" animate={{ width: pctW }} transition={{ duration: 0.45, ease: "easeInOut" }} />
          </div>
          <div className="grid grid-cols-6 gap-1 sm:gap-2">
            {allDisplaySteps.map((s, i) => {
              const n = i + 1;
              const active = currentStep === n;
              const done = currentStep > n;
              return (
                <div key={i} className="relative flex min-w-0 flex-col items-center text-center">
                  {i < allDisplaySteps.length - 1 && (
                    <span className={`absolute left-1/2 top-4 -z-0 h-0.5 w-full ${done ? "bg-[#155000]" : "bg-[#8BA77F]"}`} />
                  )}
                  <motion.div
                    animate={active ? { y: [0, -5, 0] } : { y: 0 }}
                    transition={active ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                    className={`relative z-10 mb-1 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors sm:h-10 sm:w-10 sm:text-sm ${
                    done ? "bg-[#155000] text-white" : active ? "bg-[#155000] text-white ring-2 ring-[#a8c437] ring-offset-2" : "bg-[#8BA77F] text-white"
                  }`}>
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
          key={currentStep}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="rounded-2xl border border-[#718e68] bg-[#8BA77F] p-4 shadow-[5px_7px_0_rgba(45,55,40,0.35)] sm:p-7"
        >
          <div className="mb-5">
            <h2 className="text-lg font-medium text-[#0B2B26]" style={{ fontFamily: "'Fraunces', serif" }}>
              Step {currentStep} — {allDisplaySteps[currentStep - 1]?.label}
            </h2>
            <p className="text-sm text-[#0B2B26]/70">{allDisplaySteps[currentStep - 1]?.desc}</p>
          </div>

          {serverMsg && (
            <div className={`mb-5 rounded-lg px-4 py-3 text-sm border ${
              serverMsg.type === "success"
                ? "bg-[#0B2B26]/10 text-[#0B2B26] border-[#0B2B26]/30"
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
            {currentStep === 1 && (
              <StudentTypeChoice
                selected={regForm.student_type}
                currentLevel={SHS_GRADES.includes(regForm.grade_level) ? "SHS" : "JHS"}
                onSelect={handleStudentTypeSelect}
                error={enrollErrors.student_type}
                gradeError={enrollErrors.grade_level}
                strandError={enrollErrors.strand_id}
                gradeValue={regForm.grade_level}
                strandValue={regForm.strand_id}
                strands={strands}
                setEnrollInfo={setRegForm}
                setErrors={setEnrollErrors}
              />
            )}

            {currentStep === 2 && (
              <div className="space-y-5">
                <EnrollmentStepScan
                  frontFile={frontFile}
                  frontName={frontName}
                  backFile={backFile}
                  backName={backName}
                  ocrAverage={ocrAverage}
                  ocrStatus={ocrStatus}
                  ocrMsg={ocrMsg}
                  frontOcrStatus={frontOcrStatus}
                  frontOcrMsg={frontOcrMsg}
                  errors={enrollErrors}
                  setErrors={setEnrollErrors}
                  onFrontUpload={handleFrontUpload}
                  onBackUpload={handleBackUpload}
                  onAverageChange={(val) => {
                    averageManuallyEditedRef.current = true;
                    setOcrAverage(val);
                    setEnrollErrors((p) => ({ ...p, average: undefined }));
                  }}
                  frontInputRef={frontInputRef}
                  backInputRef={backInputRef}
                />
                {needsRequirements && (
                  <EnrollmentStepRequirements
                    psaFile={psaFile}
                    psaName={psaName}
                    psaOcrStatus={psaOcrStatus}
                    psaOcrMsg={psaOcrMsg}
                    goodMoralFile={goodMoralFile}
                    goodMoralName={goodMoralName}
                    goodMoralOcrStatus={goodMoralOcrStatus}
                    goodMoralOcrMsg={goodMoralOcrMsg}
                    requiresGrade7Docs={requiresGrade7Docs}
                    uploading={uploading}
                    errors={enrollErrors}
                    onPsaUpload={(e) => { const f = e.target.files?.[0]; if (f) handleReqUpload("psa", f, setPsaFile, setPsaName); }}
                    onGoodMoralUpload={(e) => { const f = e.target.files?.[0]; if (f) handleReqUpload("goodMoral", f, setGoodMoralFile, setGoodMoralName); }}
                  />
                )}
              </div>
            )}
            {currentStep === 3 && <StepPersonal form={regForm} errors={regErrors} onChange={handleRegChange} />}
            {currentStep === 4 && <StepAddress form={regForm} errors={regErrors} onChange={handleRegChange} />}
            {currentStep === 5 && <StepGuardian form={regForm} errors={regErrors} onChange={handleRegChange} />}

            {currentStep === 6 && (
              <EnrollmentStepReview
                enrollInfo={regForm}
                strands={strands}
                ocrAverage={ocrAverage}
                frontName={backName}
                backName={frontName}
                psaName={psaName}
                goodMoralName={goodMoralName}
                birthVerification={birthVerification}
                goodMoralVerification={goodMoralVerification}
                assignedSection={assignedSection}
                assigning={assigning}
                needsRequirements={needsRequirements}
                requiresGrade7Docs={requiresGrade7Docs}
              />
            )}

            {/* Navigation */}
            <div className={`flex gap-3 mt-6 ${currentStep > 1 ? "" : "justify-center"}`}>
              {currentStep > 1 && (
                <button type="button" onClick={handleBack} className="flex-1 rounded-lg border border-[#235347]/25 text-[#0B2B26]/70 text-sm font-medium py-2.5 hover:bg-[#DAF1DE]/40">
                  Back
                </button>
              )}
              {currentStep < totalSteps ? (
                <button type="button" onClick={handleNext} className="flex-1 rounded-full bg-[#a8bd00] text-[#17350f] text-sm font-semibold py-2.5 shadow-[3px_4px_0_rgba(45,55,40,0.35)] transition hover:-translate-y-0.5 hover:bg-[#b8cd12]">
                  {currentStep === 1 ? "Continue" : "Next →"}
                </button>
              ) : assignError ? (
                <button type="button" onClick={handleGoToReview} className="flex-1 rounded-full bg-[#a8bd00] text-[#17350f] text-sm font-semibold py-2.5 shadow-[3px_4px_0_rgba(45,55,40,0.35)] transition hover:-translate-y-0.5 hover:bg-[#b8cd12]">
                  Try again
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting || assigning || !assignedSection}
                  className="flex-1 rounded-full bg-[#a8bd00] text-[#17350f] text-sm font-semibold py-2.5 shadow-[3px_4px_0_rgba(45,55,40,0.35)] transition hover:-translate-y-0.5 hover:bg-[#b8cd12] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Submitting…" : assigning ? "Checking…" : "Submit Enrollment"}
                </button>
              )}
            </div>
          </form>
        </motion.div>

        <p className="text-center text-sm text-[#0B2B26]/45 mt-5">
          Already Enrolled?{" "}
          <motion.button
            onClick={onGoLogin}
            whileHover={{ x: 3 }}
            whileTap={{ x: 12, scale: 0.96 }}
            className="text-[#163832] font-medium hover:underline"
          >
            Sign in
          </motion.button>
        </p>
      </div>
      </motion.main>
    </div>
  );
}

function StudentTypeChoice({ selected, currentLevel, onSelect, error, gradeValue, strandValue, strands, setEnrollInfo, setErrors, gradeError, strandError }) {
  const schoolLevel = currentLevel ?? "JHS";
  const gradeOptions = getGradeOptionsForSelection(selected, schoolLevel);
  const isSHS = schoolLevel === "SHS";

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-semibold text-[#17350f]">Choose Student Type *</label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STUDENT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => onSelect(type.value, schoolLevel)}
              className={`rounded-2xl border-2 px-4 py-4 text-left shadow-[3px_4px_0_rgba(45,55,40,0.35)] transition duration-200 hover:-translate-y-1 hover:shadow-[3px_6px_0_rgba(45,55,40,0.3)] ${
                selected === type.value
                  ? "border-white bg-[#155000] text-white ring-2 ring-[#a8c437]"
                  : "border-[#155000] bg-[#155000] text-white hover:bg-[#1c6208]"
              }`}
            >
              <p className="text-base font-medium">{type.label}</p>
              <p className="mt-1 text-xs text-white/75">
                {type.value === "New" ? "First-time enrollment" :
                 type.value === "Old" ? "Continuing student" :
                 "Returning learner"}
              </p>
            </button>
          ))}
        </div>
        {error && <Err msg={error} />}
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-[#17350f]">School Level *</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SCHOOL_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => onSelect(selected ?? "New", level.value)}
              className={`rounded-2xl border-2 px-4 py-4 text-left shadow-[3px_4px_0_rgba(45,55,40,0.35)] transition duration-200 hover:-translate-y-1 ${
                schoolLevel === level.value
                  ? "border-white bg-[#155000] text-white ring-2 ring-[#a8c437]"
                  : "border-[#155000] bg-[#155000] text-white hover:bg-[#1c6208]"
              }`}
            >
              <p className="text-base font-medium">{level.label}</p>
              <p className="mt-1 text-xs text-white/75">
                {level.value === "JHS" ? "Grade 7 to 10" : "Grade 11 to 12"}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#315f20]/30 bg-[#f4f7ef] px-4 py-3 text-sm text-[#17350f]">
        {selected === "New"
          ? "First-time enrollment requires four uploads: report card front and back, PSA Birth Certificate, and Good Moral Certificate."
          : selected === "Old"
          ? "Continuing students only need to upload the report card front and back."
          : "Upload the report card front and back. Additional documents depend on student type and grade level."}
      </div>

      {selected && (
        <div>
          <label className="block text-sm font-medium text-[#0B2B26] mb-2">Grade Level *</label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {gradeOptions.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  onSelect(selected, schoolLevel, g);
                  setErrors((p) => ({ ...p, grade_level: undefined }));
                }}
                className={`rounded-lg border-2 py-2.5 text-sm font-semibold shadow-[2px_3px_0_rgba(45,55,40,0.3)] transition ${
                  gradeValue === g
                    ? "border-white bg-[#155000] text-white ring-2 ring-[#a8c437]"
                    : "border-[#155000] bg-[#155000] text-white hover:-translate-y-0.5"
                }`}
              >
                G{g}
              </button>
            ))}
          </div>
          {gradeError && <Err msg={gradeError} />}
        </div>
      )}

      {isSHS && selected && (
        <div>
          <label className="block text-sm font-medium text-[#0B2B26] mb-2">Strand *</label>
          {strands.length === 0 ? (
            <p className="text-sm text-[#0B2B26]/45">Loading strands…</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {strands.map((s) => (
                <button
                  key={s.strand_id}
                  type="button"
                  onClick={() => {
                    setEnrollInfo((p) => ({ ...p, strand_id: String(s.strand_id) }));
                    setErrors((p) => ({ ...p, strand_id: undefined }));
                  }}
                  className={`rounded-lg border py-2.5 px-3 text-sm font-medium text-left transition-colors ${
                    strandValue === String(s.strand_id)
                      ? "bg-[#0B2B26] text-white border-[#0B2B26]"
                      : "border-[#235347]/25 text-[#0B2B26]/70 hover:border-[#0B2B26]"
                  }`}
                >
                  {s.strand_name}
                </button>
              ))}
            </div>
          )}
          {strandError && <Err msg={strandError} />}
        </div>
      )}
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
          <label className="block text-sm font-medium text-[#0B2B26] mb-1.5">Suffix</label>
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
          <label className="block text-sm font-medium text-[#0B2B26] mb-1.5">Date of Birth *</label>
          <input type="date" name="date_of_birth" value={form.date_of_birth} onChange={onChange} className={inputCls(errors.date_of_birth)} />
          {errors.date_of_birth && <Err msg={errors.date_of_birth} />}
        </div>
        <Field label="Age" name="age" type="number" value={form.age} onChange={onChange} placeholder="Auto-computed" readOnly />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#0B2B26] mb-1.5">Sex *</label>
          <select name="sex" value={form.sex} onChange={onChange} className={inputCls(errors.sex)}>
            <option value="">Select sex</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          {errors.sex && <Err msg={errors.sex} />}
        </div>
        <div>
          <label className="block text-sm font-medium text-[#0B2B26] mb-1.5">Nationality</label>
          <select name="nationality" value={form.nationality} onChange={onChange} className={inputCls()}>
            {NATIONALITIES.map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
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
      <Field label="Father's Name" name="father_name" value={form.father_name} error={errors.father_name} onChange={onChange} placeholder="Juan Dela Cruz Sr." />
      <Field label="Father's Contact Number" name="father_contact_number" type="tel" value={form.father_contact_number} error={errors.father_contact_number} onChange={onChange} placeholder="09XXXXXXXXX or +639XXXXXXXXX" maxLength={13} />
      <Field label="Mother's Maiden Name" name="mother_maiden_name" value={form.mother_maiden_name} error={errors.mother_maiden_name} onChange={onChange} placeholder="Maria Santos" />
      <Field label="Mother's Contact Number" name="mother_contact_number" type="tel" value={form.mother_contact_number} error={errors.mother_contact_number} onChange={onChange} placeholder="09XXXXXXXXX or +639XXXXXXXXX" maxLength={13} />
      <Field label="Guardian's Name *" name="guardian_name" value={form.guardian_name} error={errors.guardian_name} onChange={onChange} placeholder="Maria Dela Cruz" />
      <Field label="Guardian's Contact Number" name="guardian_contact_number" type="tel" value={form.guardian_contact_number} error={errors.guardian_contact_number} onChange={onChange} placeholder="09XXXXXXXXX or +639XXXXXXXXX" maxLength={13} />
    </div>
  );
}

// Enrollment Step Components
function EnrollmentStepInfo({ enrollInfo, setEnrollInfo, strands, errors, setErrors }) {
  const isSHS = SHS_GRADES.includes(enrollInfo.grade_level);
  const schoolLevel = isSHS ? "SHS" : "JHS";
  const isNewJrHigh = enrollInfo.student_type === "New" && enrollInfo.grade_level === "7";
  const needsRequirements = requiresSupportingDocuments(enrollInfo.student_type, enrollInfo.grade_level);
  const gradeOptions = getGradeOptionsForSelection(enrollInfo.student_type, schoolLevel);

  return (
    <div className="space-y-4">
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
                onClick={() => {
                  setEnrollInfo((p) => ({ ...p, grade_level: g, strand_id: "" }));
                  setErrors((p) => ({ ...p, grade_level: undefined }));
                }}
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
        {errors.grade_level && <Err msg={errors.grade_level} />}
      </div>

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
                  onClick={() => {
                    setEnrollInfo((p) => ({ ...p, strand_id: String(s.strand_id) }));
                    setErrors((p) => ({ ...p, strand_id: undefined }));
                  }}
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
          {errors.strand_id && <Err msg={errors.strand_id} />}
        </div>
      )}

      {needsRequirements && (
        <p className="text-xs text-[#163832] bg-[#8EB69B]/10 border border-[#8EB69B]/30 rounded-lg px-3 py-2">
          You'll need to upload your requirements (PSA Birth Certificate and Good Moral) for Grade {enrollInfo.grade_level} enrollment.
        </p>
      )}
    </div>
  );
}

function EnrollmentStepScan({ frontFile, backFile, ocrAverage, ocrStatus, ocrMsg, frontOcrStatus, frontOcrMsg, errors, onFrontUpload, onBackUpload, onAverageChange, frontInputRef, backInputRef }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#526257]">
        Upload both sides of your report card. PaddleOCR reads the LRN and student details from the front, and the general average from the back.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#0B2B26]">Report Card — Back *</label>
          <UploadBox file={frontFile} accept="image/jpeg,image/png" inputRef={frontInputRef} onChange={onFrontUpload} label="Upload back of report card" />
          {errors.back && <Err msg={errors.back} />}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#0B2B26]">Report Card — Front *</label>
          <UploadBox file={backFile} accept="image/jpeg,image/png" inputRef={backInputRef} onChange={onBackUpload} label="Upload front of report card" />
          {frontOcrStatus !== "idle" && (
            <div
              role="status"
              className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                frontOcrStatus === "done"
                  ? "bg-[#0B2B26]/10 text-[#0B2B26]"
                  : frontOcrStatus === "error"
                    ? "bg-[#B3492B]/10 text-[#B3492B]"
                    : "bg-[#8EB69B]/10 text-[#163832]"
              }`}
            >
              {(frontOcrStatus === "uploading" || frontOcrStatus === "scanning") && (
                <div className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              <span>{frontOcrMsg}</span>
            </div>
          )}
          {errors.front && <Err msg={errors.front} />}
        </div>
      </div>

      {ocrStatus !== "idle" && (
        <div role="status" className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
          ocrStatus === "done" ? "bg-[#0B2B26]/10 text-[#0B2B26]"
          : ocrStatus === "error" ? "bg-[#B3492B]/10 text-[#B3492B]"
          : "bg-[#8EB69B]/10 text-[#163832]"
        }`}>
          {(ocrStatus === "uploading" || ocrStatus === "scanning") && (
            <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          <span>{ocrMsg}</span>
        </div>
      )}

      {(ocrStatus === "done" || ocrStatus === "error") && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#0B2B26]">
            General Average *
            <span className={`ml-2 text-xs font-normal ${ocrStatus === "done" ? "text-[#526257]" : "text-[#B3492B]"}`}>
              {ocrStatus === "done" ? "(auto-detected — you can correct it)" : "(enter manually)"}
            </span>
          </label>
          <input
            type="number"
            min="60"
            max="100"
            step="0.01"
            value={ocrAverage}
            onChange={(e) => onAverageChange(e.target.value)}
            placeholder="e.g. 88.5"
            className={inputCls(errors.average)}
          />
          {errors.average && <Err msg={errors.average} />}
        </div>
      )}
    </div>
  );
}

function EnrollmentStepRequirements({ psaFile, psaName, psaOcrStatus, psaOcrMsg, goodMoralFile, goodMoralName, goodMoralOcrStatus, goodMoralOcrMsg, requiresGrade7Docs, uploading, errors, onPsaUpload, onGoodMoralUpload }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#315f20]/30 bg-[#f4f7ef] p-3 text-xs text-[#17350f]">
        <span className="font-semibold">Note:</span> Upload JPG or PNG images only, max 10MB each.
        <span className="mt-1 block font-semibold">
          First-time students must upload a PSA Birth Certificate and Good Moral Certificate.
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {requiresGrade7Docs && (
          <div>
            <ReqUpload label="PSA Birth Certificate *" file={psaFile} uploading={uploading.psa} uploaded={!!psaName} error={errors.psa} onChange={onPsaUpload} />
            {psaOcrStatus !== "idle" && (
              <p
                role="status"
                className={`mt-2 text-xs ${
                  psaOcrStatus === "error" ? "text-[#B3492B]" : "text-[#17350f]"
                }`}
              >
                {psaOcrMsg}
              </p>
            )}
          </div>
        )}
        {requiresGrade7Docs && (
          <div>
            <ReqUpload label="Good Moral Certificate *" file={goodMoralFile} uploading={uploading.goodMoral} uploaded={!!goodMoralName} error={errors.goodMoral} onChange={onGoodMoralUpload} />
            {goodMoralOcrStatus !== "idle" && (
              <p
                role="status"
                className={`mt-2 text-xs ${
                  goodMoralOcrStatus === "error" ? "text-[#B3492B]" : "text-[#17350f]"
                }`}
              >
                {goodMoralOcrMsg}
              </p>
            )}
          </div>
        )}
      </div>
      <p className="text-xs text-[#526257]">
        Automated checks are preliminary only. Staff will review the uploaded documents; OCR does not approve enrollment.
      </p>
      {requiresGrade7Docs && (
        <p className="text-xs text-[#526257]">
          Bring the original PSA/NSO Birth Certificate for staff verification after approval, as required by the school.
        </p>
      )}
    </div>
  );
}

function EnrollmentStepReview({ enrollInfo, strands, ocrAverage, frontName, backName, psaName, goodMoralName, birthVerification, goodMoralVerification, assignedSection, assigning, needsRequirements, requiresGrade7Docs }) {
  const isSHS = SHS_GRADES.includes(enrollInfo.grade_level);
  return (
    <div className="space-y-4">
      {assigning && (
        <div className="flex items-center gap-3 bg-[#8EB69B]/10 rounded-xl border border-[#8EB69B]/30 px-4 py-3">
          <div className="h-5 w-5 rounded-full border-2 border-[#163832] border-t-transparent animate-spin shrink-0" />
          <p className="text-sm text-[#163832]">Checking enrollment status…</p>
        </div>
      )}
      {assignedSection && (
        <div className="bg-[#0B2B26]/8 border border-[#0B2B26]/25 rounded-xl px-4 py-3">
          <p className="text-xs text-[#0B2B26]/45 mb-0.5">Section Assigned</p>
          <p className="text-base font-medium text-[#0B2B26]">{assignedSection.section_name}</p>
        </div>
      )}
      <div className="divide-y divide-[#d9e2d5] overflow-hidden rounded-xl border border-[#d7e4d2] bg-white">
        <h3 className="border-b border-[#d9e2d5] bg-[#155000] px-4 py-3 text-sm font-semibold text-white">
          Application checklist
        </h3>
        <SummaryRow label="Student Type" value={enrollInfo.student_type} />
        <SummaryRow label="Grade Level" value={`Grade ${enrollInfo.grade_level}`} />
        {isSHS && <SummaryRow label="Strand" value={strands.find((s) => String(s.strand_id) === enrollInfo.strand_id)?.strand_name ?? "—"} />}
        <SummaryRow label="General Average" value={ocrAverage ? `${ocrAverage} ✓` : "Not entered"} />
        <SummaryRow label="Report Card — Front" value={frontName ? "Uploaded ✓" : "Not uploaded"} />
        <SummaryRow label="Report Card — Back" value={backName ? "Uploaded ✓" : "Not uploaded"} />
        {needsRequirements && (
          <>
            {requiresGrade7Docs && (
              <>
                <SummaryRow label="PSA Certificate" value={psaName ? "Uploaded ✓" : "Not uploaded"} />
                <SummaryRow label="Birth Certificate Check" value={birthVerification?.status ?? "Needs Review"} />
                <SummaryRow label="Birth Certificate Keywords" value={birthVerification?.keyword_status ?? "Needs Review"} />
                <SummaryRow label="Name Match" value={birthVerification?.name_match_status ?? "Needs Review"} />
                <SummaryRow label="Good Moral" value={goodMoralName ? "Uploaded ✓" : "Not uploaded"} />
                <SummaryRow label="Good Moral Title Check" value={goodMoralVerification?.status ?? "Needs Review"} />
              </>
            )}
          </>
        )}
        <p className="px-4 py-3 text-xs text-[#526257]">
          Automated checks are not proof of authenticity and do not approve enrollment. Staff review is required.
        </p>
      </div>
    </div>
  );
}

// Shared Components
function Field({ label, name, value, onChange, error, placeholder, type = "text", readOnly, maxLength }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#0B2B26] mb-1.5">{label}</label>
      <input
        name={name} type={type} value={value} onChange={onChange}
        placeholder={placeholder} readOnly={readOnly} maxLength={maxLength}
        className={`${inputCls(error)} ${readOnly ? "bg-[#DAF1DE]/40 text-[#0B2B26]/45 cursor-not-allowed" : ""}`}
      />
      {error && <Err msg={error} />}
    </div>
  );
}

function UploadBox({ file, accept, inputRef, onChange, label }) {
  const cameraInputRef = useRef(null);
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
      className={`flex min-h-44 flex-col items-center justify-between rounded-2xl border-2 p-4 text-center text-white shadow-[4px_5px_0_rgba(45,55,40,0.4)] sm:p-5 ${
        file ? "border-[#a8c437] bg-[#155000]" : "border-[#155000] bg-[#155000]"
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
      <UploadActions fileInputRef={inputRef} cameraInputRef={cameraInputRef} />
      <p className="mt-2 text-xs text-white/75">JPG or PNG · Max 10MB</p>
    </motion.div>
  );
}

function ReqUpload({ label, file, uploading, uploaded, error, onChange }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
      <p className="mb-1.5 text-sm font-semibold text-[#17350f]">{label}</p>
      <div className={`flex min-h-44 flex-col items-center justify-between rounded-2xl border-2 px-4 py-4 text-center text-white shadow-[4px_5px_0_rgba(45,55,40,0.4)] ${
        uploaded ? "border-[#a8c437] bg-[#155000]"
        : error ? "border-red-300 bg-[#155000]"
        : "border-[#155000] bg-[#155000]"
      }`}>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={onChange} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onChange} />
        <div className="mb-3 min-w-0">
          <p className="mb-1 text-xl" aria-hidden="true">{uploading ? "…" : uploaded ? "✓" : " "}</p>
          <p className="max-w-full truncate text-sm font-semibold">{file?.name || (uploaded ? "Uploaded" : label)}</p>
          {uploading && <p className="text-xs text-white/75">Uploading…</p>}
        </div>
        <UploadActions fileInputRef={fileInputRef} cameraInputRef={cameraInputRef} />
        <p className="mt-2 text-xs text-white/75">JPG or PNG · Max 10MB</p>
      </div>
      {error && <Err msg={error} />}
    </motion.div>
  );
}

function UploadActions({ fileInputRef, cameraInputRef }) {
  const actionClass = "flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white px-2 py-2 text-xs font-semibold text-[#155000] shadow-sm transition hover:bg-[#eff6e9] active:scale-95 sm:px-3 sm:text-sm";

  return (
    <div className="flex w-full max-w-xs gap-2">
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={() => cameraInputRef.current?.click()}
        className={actionClass}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden="true">
          <path d="M3 8h4l2-3h6l2 3h4v11H3V8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        Camera
      </motion.button>
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={() => fileInputRef.current?.click()}
        className={actionClass}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden="true">
          <path d="M4 5h16v14H4z" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="9" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="m5 17 5-5 3 3 2-2 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
        Image
      </motion.button>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-4 first:pt-0 last:pb-0">
      <span className="text-sm text-[#0B2B26]/45">{label}</span>
      <span className="text-sm font-medium text-[#0B2B26]">{value}</span>
    </div>
  );
}

const inputCls = (err) =>
  `w-full rounded-lg border px-4 py-2.5 text-sm text-[#17350f] placeholder:text-[#839080] bg-white shadow-[inset_0_2px_4px_rgba(30,50,20,0.18)] focus:outline-none focus:ring-2 focus:ring-[#a8bd00] ${
    err ? "border-[#B3492B]" : "border-[#527646]/50"
  }`;

function Err({ msg }) {
  return <p className="mt-1 text-xs text-[#B3492B]">{msg}</p>;
}
