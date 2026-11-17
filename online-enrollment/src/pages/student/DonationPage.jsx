import { useEffect, useRef, useState } from "react";

const API_BASE = "/backend-online-enrollment/student";
const OCR_BASE = "/backend-online-enrollment/ocr";
const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;
const RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp"];
const OCR_FIELDS = [
  "amount",
  "reference_number",
  "transaction_datetime",
];
const OCR_FIELD_LABELS = {
  amount: "Amount",
  reference_number: "Reference Number",
  transaction_datetime: "Transaction Date and Time",
};

const EMPTY_FORM = {
  amount: "",
  reference_number: "",
  purpose: "",
  transaction_datetime: "",
};

export default function DonationPage() {
  const lrn = localStorage.getItem("student_lrn") ?? localStorage.getItem("student_id") ?? "";
  const [section, setSection] = useState(null);
  const [qrLoading, setQrLoading] = useState(true);
  const [qrError, setQrError] = useState("");
  const [qrZoomed, setQrZoomed] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState("");
  const [receiptError, setReceiptError] = useState("");
  const [receiptOcrStatus, setReceiptOcrStatus] = useState("");
  const [receiptOcrCompleted, setReceiptOcrCompleted] = useState(false);
  const [receiptOcrLoading, setReceiptOcrLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const receiptInputRef = useRef(null);
  const receiptOcrRequestRef = useRef(0);
  const receiptOcrControllerRef = useRef(null);
  const ocrFilledFieldsRef = useRef(new Set());

  useEffect(() => {
    const controller = new AbortController();

    async function loadSectionQr() {
      if (!lrn) {
        setQrError("Your LRN is not available. Please sign in again.");
        setQrLoading(false);
        return;
      }

      setQrLoading(true);
      setQrError("");
      try {
        const params = new URLSearchParams({ lrn });
        const response = await fetch(`${API_BASE}/get_section_qr.php?${params}`, {
          credentials: "include",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          setQrError(data.message ?? "Could not load the QR code for your section.");
          return;
        }
        setSection(data.data);
      } catch (error) {
        if (error.name !== "AbortError") setQrError("Could not reach the server to load your section QR code.");
      } finally {
        if (!controller.signal.aborted) setQrLoading(false);
      }
    }

    loadSectionQr();
    return () => controller.abort();
  }, [lrn]);

  useEffect(() => {
    if (!receipt) {
      setReceiptPreview("");
      return undefined;
    }
    const previewUrl = URL.createObjectURL(receipt);
    setReceiptPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [receipt]);

  useEffect(() => () => {
    receiptOcrRequestRef.current += 1;
    receiptOcrControllerRef.current?.abort();
  }, []);

  async function handleReceiptChange(event) {
    const file = event.target.files?.[0] ?? null;
    const requestId = ++receiptOcrRequestRef.current;
    receiptOcrControllerRef.current?.abort();
    setReceiptError("");
    setSubmitError("");
    setSuccessMessage("");
    setReceiptOcrStatus("");
    setReceiptOcrCompleted(false);
    setReceiptOcrLoading(false);
    if (!file) {
      setReceipt(null);
      clearOcrFilledFields();
      return;
    }
    if (!RECEIPT_TYPES.includes(file.type)) {
      setReceipt(null);
      clearOcrFilledFields();
      setReceiptError("Choose a JPG, PNG, or WEBP receipt image.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      setReceipt(null);
      clearOcrFilledFields();
      setReceiptError("Receipt image must be no larger than 8 MB.");
      event.target.value = "";
      return;
    }

    clearOcrFilledFields();
    setReceipt(file);
    setReceiptOcrStatus("Reading receipt for transaction details…");
    setReceiptOcrLoading(true);
    const controller = new AbortController();
    receiptOcrControllerRef.current = controller;
    try {
      const extracted = await readReceiptFields(file, controller.signal);
      if (requestId !== receiptOcrRequestRef.current) return;

      const filledFields = OCR_FIELDS.filter((field) => extracted[field]);
      setForm((current) => {
        const next = { ...current };
        for (const field of filledFields) {
          next[field] = extracted[field];
          ocrFilledFieldsRef.current.add(field);
        }
        return next;
      });
      setReceiptOcrCompleted(true);
      setReceiptOcrStatus("Receipt scanned. Review the extracted values before submitting.");
    } catch (error) {
      if (error.name !== "AbortError" && requestId === receiptOcrRequestRef.current) {
        setReceiptOcrCompleted(false);
        setReceiptOcrStatus("Could not read the receipt automatically. Upload a clearer receipt image; these fields cannot be edited manually.");
      }
    } finally {
      if (requestId === receiptOcrRequestRef.current) {
        setReceiptOcrLoading(false);
      }
    }
  }

  function clearOcrFilledFields() {
    const fieldsToClear = [...ocrFilledFieldsRef.current];
    ocrFilledFieldsRef.current.clear();
    setForm((current) => {
      const next = { ...current };
      for (const field of fieldsToClear) next[field] = "";
      return next;
    });
  }

  async function readReceiptFields(file, signal) {
    let ocrFile = file;
    if (file.type === "image/webp") {
      const image = await createImageBitmap(file);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Could not prepare the receipt image for OCR.");
        context.drawImage(image, 0, 0);
        const png = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
        if (!png) throw new Error("Could not prepare the receipt image for OCR.");
        ocrFile = new File([png], "receipt.png", { type: "image/png" });
      } finally {
        image.close();
      }
    }

    const uploadBody = new FormData();
    uploadBody.append("report_card", ocrFile);
    const uploadResponse = await fetch(`${OCR_BASE}/scan_report_card.php`, {
      method: "POST",
      credentials: "include",
      body: uploadBody,
      signal,
    });
    const uploadData = await uploadResponse.json();
    if (!uploadResponse.ok || !uploadData.success || !uploadData.filename) {
      throw new Error(uploadData.message ?? "Could not upload the receipt for OCR.");
    }

    const ocrResponse = await fetch(`${OCR_BASE}/process_ocr.php`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: uploadData.filename }),
      signal,
    });
    const ocrData = await ocrResponse.json();
    if (!ocrResponse.ok || !ocrData.success) {
      throw new Error(ocrData.message ?? "Could not read the receipt.");
    }
    return normalizeReceiptData(
      ocrData.receipt_data ?? ocrData.extracted_data,
      typeof ocrData.text === "string" ? ocrData.text : ""
    );
  }

  function updateField(event) {
    const { name, value } = event.target;
    ocrFilledFieldsRef.current.delete(name);
    setForm((current) => ({ ...current, [name]: value }));
    setSubmitError("");
    setSuccessMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");
    setSuccessMessage("");

    if (!lrn) {
      setSubmitError("Your LRN is not available. Please sign in again.");
      return;
    }
    if (!receipt) {
      setReceiptError("Upload your receipt image before submitting.");
      return;
    }
    if (!/^\d+(?:\.\d{1,2})?$/.test(form.amount) || Number(form.amount) <= 0 || Number(form.amount) > 99999999.99) {
      setSubmitError("Enter an amount greater than zero, no more than 99,999,999.99, and with no more than two decimal places.");
      return;
    }
    if (!form.reference_number.trim() || !form.purpose.trim()) {
      setSubmitError("Amount, reference number, purpose, and receipt image are required.");
      return;
    }

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("lrn", lrn);
      body.append("receipt", receipt);
      body.append("amount", form.amount.trim());
      body.append("reference_number", form.reference_number.trim());
      body.append("purpose", form.purpose.trim());
      if (form.transaction_datetime) body.append("transaction_datetime", form.transaction_datetime);

      const response = await fetch(`${API_BASE}/submit_donation.php`, {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = await response.json();
      if (response.status === 409) {
        setSubmitError(data.message ?? "This reference number has already been submitted. Check and correct it before trying again.");
        return;
      }
      if (!response.ok || data.success !== true) {
        setSubmitError(data.message ?? "Your donation could not be submitted. Check the details and try again.");
        return;
      }

      setSuccessMessage(data.message ?? "Your donation receipt was submitted successfully.");
      receiptOcrRequestRef.current += 1;
      receiptOcrControllerRef.current?.abort();
      setForm(EMPTY_FORM);
      ocrFilledFieldsRef.current.clear();
      setReceipt(null);
      setReceiptOcrStatus("");
      setReceiptOcrCompleted(false);
      const input = receiptInputRef.current;
      if (input) input.value = "";
    } catch {
      setSubmitError("Could not reach the server. Your donation was not confirmed; please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 space-y-5">
      <header>
        <p className="text-xs uppercase tracking-[0.15em] text-[#8C6B12] mb-1">Student Portal</p>
        <h2 className="text-xl sm:text-2xl text-[#1B5E2C]" style={{ fontFamily: "'Fraunces', serif" }}>
          Donation
        </h2>
        <p className="text-sm text-[#86A18A] mt-1">
          Scan your assigned section QR code, then submit your receipt and transaction details.
        </p>
      </header>

      <section className="bg-white rounded-2xl border border-[#D9E8D5] p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-[#1B5E2C]">Your section payment QR code</h3>
        {qrLoading ? (
          <div className="mt-4 h-48 w-48 rounded-xl bg-[#EFF4ED] animate-pulse" aria-label="Loading section QR code" />
        ) : qrError ? (
          <p role="alert" className="mt-3 rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 px-4 py-3 text-sm text-[#B3492B]">
            {qrError}
          </p>
        ) : section ? (
          <div className={`mt-4 flex flex-col gap-4 ${qrZoomed ? "items-center" : "sm:flex-row sm:items-center"}`}>
            <div className={`flex ${qrZoomed ? "flex-col items-center" : "items-center"} gap-3`}>
              <img
                src={`/backend-online-enrollment/uploads/${section.qr_code}`}
                alt={`Donation QR code for Grade ${section.grade_level}, ${section.section_name}`}
                className={`${qrZoomed ? "h-72 w-72 sm:h-96 sm:w-96" : "h-48 w-48"} max-w-full rounded-xl border border-[#D9E8D5] bg-[#FAFAF5] object-contain p-2`}
              />
              {qrZoomed ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQrZoomed(false)}
                    className="rounded-lg border border-[#CBD9C8] bg-white px-4 py-2 text-sm font-medium text-[#1B5E2C] hover:bg-[#EFF4ED]"
                  >
                    Zoom out
                  </button>
                  <button
                    type="button"
                    onClick={() => receiptInputRef.current?.click()}
                    aria-controls="donation-receipt"
                    className="rounded-lg bg-[#1B5E2C] px-4 py-2 text-sm font-medium text-white hover:bg-[#164A22]"
                  >
                    Upload receipt
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setQrZoomed(true)}
                  aria-expanded={qrZoomed}
                  className="rounded-lg bg-[#1B5E2C] px-4 py-2 text-sm font-medium text-white hover:bg-[#164A22]"
                >
                  Zoom QR
                </button>
              )}
            </div>
            <div className="text-sm text-[#5B6478]">
              <p className="font-medium text-[#1B5E2C]">Grade {section.grade_level} — {section.section_name}</p>
              {section.adviser_name && <p className="mt-1">Adviser: {section.adviser_name}</p>}
              <p className="mt-2 text-xs text-[#86A18A]">Your section is assigned automatically from your approved enrollment.</p>
            </div>
          </div>
        ) : null}
      </section>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <section className="bg-white rounded-2xl border border-[#D9E8D5] p-4 sm:p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[#1B5E2C]">Receipt and transaction details</h3>
            <p className="text-xs text-[#86A18A] mt-1">Upload a receipt to automatically fill the amount, reference, and transaction date. These fields are read-only; upload a clear receipt so the details can be detected correctly.</p>
          </div>

          <div>
            <label htmlFor="donation-receipt" className="mb-1.5 block text-sm font-medium text-[#1B5E2C]">
              Receipt image <span className="text-[#B3492B]">*</span>
            </label>
            <input
              id="donation-receipt"
              ref={receiptInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleReceiptChange}
              className="block w-full rounded-lg border border-[#CBD9C8] p-2 text-sm text-[#5B6478] file:mr-3 file:rounded-md file:border-0 file:bg-[#EFF4ED] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#1B5E2C]"
            />
            <p className="mt-1 text-xs text-[#86A18A]">JPG, PNG, or WEBP; maximum 8 MB.</p>
            {receiptError && <p role="alert" className="mt-1 text-sm text-[#B3492B]">{receiptError}</p>}
            {receiptOcrStatus && (
              <p role="status" aria-live="polite" className="mt-1 text-sm text-[#5B6478]">
                {receiptOcrStatus}
              </p>
            )}
            {receiptOcrCompleted && OCR_FIELDS.some((field) => !form[field].trim()) && (
              <p role="alert" className="mt-2 rounded-lg border border-[#8C6B12]/30 bg-[#F2BE22]/10 px-3 py-2 text-sm text-[#8C6B12]">
                Could not confidently detect: {OCR_FIELDS
                  .filter((field) => !form[field].trim())
                  .map((field) => OCR_FIELD_LABELS[field])
                  .join(", ")}. Upload a clearer receipt image to detect the missing details. These fields cannot be edited manually.
              </p>
            )}
            {receipt && (
              <div className="mt-3 flex items-center gap-3">
                <img
                  src={receiptPreview}
                  alt="Selected donation receipt preview"
                  className="h-20 w-20 rounded-lg border border-[#D9E8D5] object-cover"
                />
                <p className="text-xs text-[#5B6478] break-all">{receipt.name}</p>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount" required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#86A18A]">₱</span>
                <ReceiptFieldInput
                  label="Amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max="99999999.99"
                  required
                  value={form.amount}
                  loading={receiptOcrLoading}
                  prefix
                />
              </div>
            </Field>
            <Field label="Reference Number" required>
              <ReceiptFieldInput
                label="Reference Number"
                name="reference_number"
                type="text"
                maxLength={100}
                required
                value={form.reference_number}
                loading={receiptOcrLoading}
              />
            </Field>
            <Field label="Transaction Date and Time">
              <ReceiptFieldInput
                label="Transaction Date and Time"
                name="transaction_datetime"
                type="datetime-local"
                value={form.transaction_datetime}
                loading={receiptOcrLoading}
              />
            </Field>
            <Field label="Purpose" required>
              <textarea
                name="purpose"
                rows={3}
                maxLength={500}
                required
                value={form.purpose}
                onChange={updateField}
                className="w-full rounded-lg border border-[#CBD9C8] px-3 py-2.5 text-sm text-[#1B5E2C] outline-none focus:border-[#1B5E2C] focus:ring-1 focus:ring-[#1B5E2C]"
              />
            </Field>
          </div>

          {submitError && (
            <p role="alert" className="rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 px-4 py-3 text-sm text-[#B3492B]">
              {submitError}
            </p>
          )}
          {successMessage && (
            <p role="status" className="rounded-lg border border-[#1B5E2C]/20 bg-[#EFF4ED] px-4 py-3 text-sm font-medium text-[#1B5E2C]">
              {successMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-lg bg-[#1B5E2C] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#164A22] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting receipt…" : "Submit donation receipt"}
          </button>
        </section>
      </form>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block text-sm font-medium text-[#1B5E2C]">
      {label}{required && <span className="text-[#B3492B]"> *</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function ReceiptFieldInput({ label, loading, prefix = false, ...props }) {
  return (
    <div className="relative">
      <input
        {...props}
        readOnly
        aria-busy={loading}
        title="Automatically detected from the receipt; this field cannot be edited."
        className={`w-full cursor-not-allowed rounded-lg border border-[#CBD9C8] bg-[#F6F8F4] py-2.5 pr-10 text-sm text-[#1B5E2C] outline-none ${prefix ? "pl-8" : "px-3"}`}
      />
      {loading && (
        <span
          role="status"
          aria-label={`Reading ${label}`}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1B5E2C]"
        >
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </span>
      )}
    </div>
  );
}

function extractReceiptFields(text) {
  const lines = text
    .replace(/<[^>]*>/g, " ")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const fullText = lines.join("\n");
  let amount = "";
  const amountLabel = /\b(?:total\s+amount\s+sent|amount\s+sent|amount)\b\s*[:：]?\s*(?:₱|PHP|P)?\s*((?:(?:\d{1,3}(?:,\d{3})+)|\d+)(?:\.\d{1,2})?)/i;
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(amountLabel)
      ?? (/^(?:total\s+amount\s+sent|amount\s+sent|amount)\s*[:：]?\s*$/i.test(lines[index])
        ? lines[index + 1]?.match(/^(?:₱|PHP|P)?\s*((?:(?:\d{1,3}(?:,\d{3})+)|\d+)(?:\.\d{1,2})?)\s*$/i)
        : null);
    if (match) {
      const value = Number(match[1].replace(/,/g, ""));
      if (Number.isFinite(value) && value > 0 && value <= 99999999.99) {
        amount = value.toFixed(2);
        break;
      }
    }
  }

  let referenceNumber = "";
  const referenceLabel = /\b(?:ref(?:erence)?\s*(?:no\.?|number))\s*[:：#-]?\s*(.*)$/i;
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(referenceLabel);
    if (!match) continue;
    const candidate = (match[1].trim() || lines[index + 1] || "").trim();
    if (/^[\p{L}\p{N}\s-]{5,100}$/u.test(candidate) && /\d/u.test(candidate)) {
      referenceNumber = candidate.replace(/\s+/g, "").toUpperCase();
    }
    break;
  }

  const dateMatch = fullText.match(
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}[,\s|•-]+\d{1,2}:\d{2}\s*[AP]\.?M\.?\b/i
  );
  const transactionDatetime = dateMatch ? toDatetimeLocal(dateMatch[0]) : "";

  return {
    amount,
    reference_number: referenceNumber,
    transaction_datetime: transactionDatetime,
  };
}

function normalizeReceiptData(data, text) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return extractReceiptFields(text);
  }

  const amountValue = String(data.amount ?? "").replace(/^(?:₱|PHP|P)\s*/i, "").replace(/,/g, "").trim();
  const parsedAmount = Number(amountValue);
  const amount = amountValue && Number.isFinite(parsedAmount) && parsedAmount > 0 && parsedAmount <= 99999999.99
    ? parsedAmount.toFixed(2)
    : "";

  return {
    amount,
    reference_number: String(data.reference_number ?? data.reference_number_raw ?? "").trim(),
    transaction_datetime: toDatetimeLocal(data.transaction_datetime ?? data.transaction_datetime_raw),
  };
}

function toDatetimeLocal(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";

  const databaseDateTime = text.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::\d{2})?$/);
  if (databaseDateTime) return `${databaseDateTime[1]}T${databaseDateTime[2]}`;

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  const localDate = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}
