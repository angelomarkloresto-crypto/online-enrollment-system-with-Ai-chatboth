import { useEffect, useMemo, useState } from "react";

const API_BASE = "/backend-online-enrollment/staff";
const GRADES = ["7", "8", "9", "10", "11", "12"];

export default function DonationManagement() {
  const [sections, setSections] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [sectionsError, setSectionsError] = useState("");
  const [grade, setGrade] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [donations, setDonations] = useState([]);
  const [sectionDetails, setSectionDetails] = useState(null);
  const [count, setCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState("0.00");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const sectionsForGrade = useMemo(
    () => sections.filter((section) => String(section.grade_level) === grade),
    [sections, grade],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadSections() {
      setSectionsLoading(true);
      setSectionsError("");
      try {
        const response = await fetch(`${API_BASE}/get_sections.php`, {
          credentials: "include",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          setSectionsError(data.message ?? "Could not load sections.");
          return;
        }
        setSections(data.sections ?? []);
      } catch (error) {
        if (error.name !== "AbortError") setSectionsError("Could not reach the server to load sections.");
      } finally {
        if (!controller.signal.aborted) setSectionsLoading(false);
      }
    }

    loadSections();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!sectionId) {
      setDonations([]);
      setSectionDetails(null);
      setCount(0);
      setTotalAmount("0.00");
      setLoadError("");
      setLoading(false);
      return undefined;
    }
    if (fromDate && toDate && fromDate > toDate) {
      setLoadError("The start date must be on or before the end date.");
      setDonations([]);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    async function loadDonations() {
      const params = new URLSearchParams({ section_id: sectionId });
      if (search.trim()) params.set("search", search.trim());
      if (fromDate) params.set("from_date", fromDate);
      if (toDate) params.set("to_date", toDate);

      setLoading(true);
      setLoadError("");
      setExportError("");
      setDonations([]);
      setSectionDetails(null);
      setCount(0);
      setTotalAmount("0.00");
      try {
        const response = await fetch(`${API_BASE}/get_donations.php?${params}`, {
          credentials: "include",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          setLoadError(data.message ?? "Could not load donation records.");
          setDonations([]);
          return;
        }
        setDonations(data.donations ?? []);
        setSectionDetails(data.section ?? null);
        setCount(Number(data.count ?? 0));
        setTotalAmount(data.total_amount ?? "0.00");
      } catch (error) {
        if (error.name !== "AbortError") {
          setLoadError("Could not reach the server to load donation records.");
          setDonations([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadDonations();
    return () => controller.abort();
  }, [sectionId, search, fromDate, toDate, refreshKey]);

  function handleGradeChange(event) {
    setGrade(event.target.value);
    setSectionId("");
    setDonations([]);
  }

  async function exportDonations() {
    if (!sectionId || (fromDate && toDate && fromDate > toDate)) return;
    setExporting(true);
    setExportError("");
    try {
      const params = new URLSearchParams({ section_id: sectionId });
      if (search.trim()) params.set("search", search.trim());
      if (fromDate) params.set("from_date", fromDate);
      if (toDate) params.set("to_date", toDate);

      const response = await fetch(`${API_BASE}/export_donations_docx.php?${params}`, {
        credentials: "include",
      });
      if (!response.ok) {
        const responseText = await response.text();
        let message = `Could not download the donation list (HTTP ${response.status}).`;
        if (response.headers.get("content-type")?.includes("application/json") && responseText) {
          try {
            const data = JSON.parse(responseText);
            message = data.message ?? message;
          } catch {
            message = `Could not download the donation list (HTTP ${response.status}).`;
          }
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      if (!blob.size) throw new Error("The server returned an empty DOCX file.");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const selectedSection = sections.find((section) => String(section.section_id) === sectionId);
      const sectionLabel = selectedSection
        ? `grade-${selectedSection.grade_level}-${selectedSection.section_name}`
        : "section-donations";
      const filename = `${sectionLabel.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "")}-donations.docx`;
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Could not download the donation list.");
    } finally {
      setExporting(false);
    }
  }

  const invalidDateRange = Boolean(fromDate && toDate && fromDate > toDate);

  return (
    <div className="px-4 py-6 sm:px-6 space-y-5">
      <header>
        <p className="text-xs uppercase tracking-[0.15em] text-[#8C6B12] mb-1">Staff Portal</p>
        <h2 className="text-xl sm:text-2xl text-[#1B5E2C]" style={{ fontFamily: "'Fraunces', serif" }}>
          Donation Management
        </h2>
        <p className="text-sm text-[#86A18A] mt-1">View donation receipts submitted by students in each section.</p>
      </header>

      <section className="grid gap-4 rounded-2xl border border-[#D9E8D5] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
        <label className="block text-sm font-medium text-[#1B5E2C]">
          Grade level
          <select
            value={grade}
            onChange={handleGradeChange}
            disabled={sectionsLoading || Boolean(sectionsError)}
            className="mt-1.5 w-full rounded-lg border border-[#CBD9C8] px-3 py-2.5 text-sm outline-none focus:border-[#1B5E2C] disabled:bg-[#FAFAF5]"
          >
            <option value="">Choose grade...</option>
            {GRADES.map((item) => <option key={item} value={item}>Grade {item}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-[#1B5E2C]">
          Section
          <select
            value={sectionId}
            onChange={(event) => setSectionId(event.target.value)}
            disabled={!grade || sectionsLoading || Boolean(sectionsError)}
            className="mt-1.5 w-full rounded-lg border border-[#CBD9C8] px-3 py-2.5 text-sm outline-none focus:border-[#1B5E2C] disabled:bg-[#FAFAF5]"
          >
            <option value="">Choose section...</option>
            {sectionsForGrade.map((section) => (
              <option key={section.section_id} value={section.section_id}>
                {section.section_name}{section.strand_name ? ` (${section.strand_name})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-[#1B5E2C]">
          Search
          <input
            type="search"
            maxLength={100}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Student, reference, purpose..."
            disabled={!sectionId}
            className="mt-1.5 w-full rounded-lg border border-[#CBD9C8] px-3 py-2.5 text-sm outline-none focus:border-[#1B5E2C] disabled:bg-[#FAFAF5]"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-[#1B5E2C]">
            Submitted from
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              disabled={!sectionId}
              className="mt-1.5 w-full rounded-lg border border-[#CBD9C8] px-2 py-2.5 text-sm outline-none focus:border-[#1B5E2C] disabled:bg-[#FAFAF5]"
            />
          </label>
          <label className="block text-sm font-medium text-[#1B5E2C]">
            Submitted to
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              disabled={!sectionId}
              className="mt-1.5 w-full rounded-lg border border-[#CBD9C8] px-2 py-2.5 text-sm outline-none focus:border-[#1B5E2C] disabled:bg-[#FAFAF5]"
            />
          </label>
        </div>
        {sectionsError && <p role="alert" className="sm:col-span-2 lg:col-span-4 text-sm text-[#B3492B]">{sectionsError}</p>}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-[#5B6478]">
          {sectionDetails && (
            <p className="font-medium text-[#1B5E2C]">Grade {sectionDetails.grade_level} — {sectionDetails.section_name}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={!sectionId || loading || invalidDateRange}
            className="rounded-lg border border-[#CBD9C8] px-4 py-2.5 text-sm font-medium text-[#1B5E2C] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={exportDonations}
            disabled={!sectionId || exporting || invalidDateRange}
            className="rounded-lg bg-[#1B5E2C] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#164A22] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? "Preparing DOCX…" : "Download section donation list (.docx)"}
          </button>
        </div>
      </div>

      {invalidDateRange && (
        <p role="alert" className="rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 px-4 py-3 text-sm text-[#B3492B]">
          The start date must be on or before the end date.
        </p>
      )}
      {loadError && <p role="alert" className="rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 px-4 py-3 text-sm text-[#B3492B]">{loadError}</p>}
      {exportError && <p role="alert" className="rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 px-4 py-3 text-sm text-[#B3492B]">{exportError}</p>}

      {sectionId && !invalidDateRange && (
        <>
          <section className="grid gap-3 sm:grid-cols-2">
            <Metric label="Record count" value={loading ? "…" : count.toLocaleString()} />
            <Metric label="Total amount" value={loading ? "…" : `₱${Number(totalAmount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
          </section>

          <div className="overflow-x-auto rounded-2xl border border-[#D9E8D5] bg-white">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#1B5E2C] text-[#FAFAF5]">
                <tr>
                  <th className="px-4 py-3 font-medium">Student / sender</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Reference number</th>
                  <th className="px-4 py-3 font-medium">Purpose</th>
                  <th className="px-4 py-3 font-medium">Receipt</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-[#86A18A]">Loading donation records…</td></tr>
                ) : loadError ? null : donations.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-[#86A18A]">No donation records match this section and filter.</td></tr>
                ) : donations.map((donation) => (
                  <tr key={donation.donation_id} className="border-t border-[#EFF4ED] text-[#5B6478]">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-[#1B5E2C]">{donation.student_name}</p>
                      {donation.sender_name && <p className="mt-1 text-xs">Sender: {donation.sender_name}</p>}
                      {donation.sender_gcash_number && <p className="text-xs">GCash: {donation.sender_gcash_number}</p>}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">₱{Number(donation.amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3.5">{donation.reference_number}</td>
                    <td className="px-4 py-3.5">{donation.purpose}</td>
                    <td className="px-4 py-3.5">
                      {donation.receipt_image ? (
                        <a
                          href={getReceiptUrl(donation.receipt_image)}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-[#1B5E2C] underline"
                        >
                          View image
                        </a>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {formatDate(donation.submitted_at)}
                      {donation.transaction_datetime && (
                        <p className="mt-1 text-xs text-[#86A18A]">Transaction: {formatDate(donation.transaction_datetime)}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {!sectionId && !sectionsLoading && !sectionsError && (
        <div className="rounded-2xl border border-dashed border-[#CBD9C8] bg-white p-10 text-center text-sm text-[#86A18A]">
          Select a grade and section to view donation records.
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#D9E8D5] bg-white p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-[#86A18A]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[#1B5E2C]">{value}</p>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

function getReceiptUrl(path) {
  const value = String(path);
  return /^https?:\/\//i.test(value)
    ? value
    : `/backend-online-enrollment/${value.replace(/^\/+/, "")}`;
}
