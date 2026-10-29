import { useEffect, useState } from "react";

const API_BASE = "/backend-online-enrollment/student";
const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;
const RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp"];

const EMPTY_FORM = {
  amount: "",
  reference_number: "",
  purpose: "",
  sender_name: "",
  sender_gcash_number: "",
  transaction_datetime: "",
};

export default function DonationPage() {
  const lrn = localStorage.getItem("student_lrn") ?? localStorage.getItem("student_id") ?? "";
  const [section, setSection] = useState(null);
  const [qrLoading, setQrLoading] = useState(true);
  const [qrError, setQrError] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState("");
  const [receiptError, setReceiptError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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

  function handleReceiptChange(event) {
    const file = event.target.files?.[0] ?? null;
    setReceiptError("");
    setSubmitError("");
    setSuccessMessage("");
    if (!file) {
      setReceipt(null);
      return;
    }
    if (!RECEIPT_TYPES.includes(file.type)) {
      setReceipt(null);
      setReceiptError("Choose a JPG, PNG, or WEBP receipt image.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      setReceipt(null);
      setReceiptError("Receipt image must be no larger than 8 MB.");
      event.target.value = "";
      return;
    }
    setReceipt(file);
  }

  function updateField(event) {
    const { name, value } = event.target;
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
      if (form.sender_name.trim()) body.append("sender_name", form.sender_name.trim());
      if (form.sender_gcash_number.trim()) body.append("sender_gcash_number", form.sender_gcash_number.trim());
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
      setForm(EMPTY_FORM);
      setReceipt(null);
      const input = document.getElementById("donation-receipt");
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
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            <img
              src={`/backend-online-enrollment/uploads/${section.qr_code}`}
              alt={`Donation QR code for Grade ${section.grade_level}, ${section.section_name}`}
              className="h-48 w-48 rounded-xl border border-[#D9E8D5] bg-[#FAFAF5] object-contain p-2"
            />
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
            <p className="text-xs text-[#86A18A] mt-1">Receipt reading is manual. Check each value before submitting.</p>
          </div>

          <div>
            <label htmlFor="donation-receipt" className="mb-1.5 block text-sm font-medium text-[#1B5E2C]">
              Receipt image <span className="text-[#B3492B]">*</span>
            </label>
            <input
              id="donation-receipt"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleReceiptChange}
              className="block w-full rounded-lg border border-[#CBD9C8] p-2 text-sm text-[#5B6478] file:mr-3 file:rounded-md file:border-0 file:bg-[#EFF4ED] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#1B5E2C]"
            />
            <p className="mt-1 text-xs text-[#86A18A]">JPG, PNG, or WEBP; maximum 8 MB.</p>
            {receiptError && <p role="alert" className="mt-1 text-sm text-[#B3492B]">{receiptError}</p>}
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
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max="99999999.99"
                  required
                  value={form.amount}
                  onChange={updateField}
                  className="w-full rounded-lg border border-[#CBD9C8] py-2.5 pl-8 pr-3 text-sm text-[#1B5E2C] outline-none focus:border-[#1B5E2C] focus:ring-1 focus:ring-[#1B5E2C]"
                />
              </div>
            </Field>
            <Field label="Reference number" required>
              <input
                name="reference_number"
                type="text"
                maxLength={100}
                required
                value={form.reference_number}
                onChange={updateField}
                className="w-full rounded-lg border border-[#CBD9C8] px-3 py-2.5 text-sm text-[#1B5E2C] outline-none focus:border-[#1B5E2C] focus:ring-1 focus:ring-[#1B5E2C]"
              />
            </Field>
            <Field label="Sender name">
              <input
                name="sender_name"
                type="text"
                maxLength={255}
                value={form.sender_name}
                onChange={updateField}
                className="w-full rounded-lg border border-[#CBD9C8] px-3 py-2.5 text-sm text-[#1B5E2C] outline-none focus:border-[#1B5E2C] focus:ring-1 focus:ring-[#1B5E2C]"
              />
            </Field>
            <Field label="Sender GCash number">
              <input
                name="sender_gcash_number"
                type="tel"
                maxLength={50}
                value={form.sender_gcash_number}
                onChange={updateField}
                className="w-full rounded-lg border border-[#CBD9C8] px-3 py-2.5 text-sm text-[#1B5E2C] outline-none focus:border-[#1B5E2C] focus:ring-1 focus:ring-[#1B5E2C]"
              />
            </Field>
            <Field label="Transaction date and time">
              <input
                name="transaction_datetime"
                type="datetime-local"
                value={form.transaction_datetime}
                onChange={updateField}
                className="w-full rounded-lg border border-[#CBD9C8] px-3 py-2.5 text-sm text-[#1B5E2C] outline-none focus:border-[#1B5E2C] focus:ring-1 focus:ring-[#1B5E2C]"
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
