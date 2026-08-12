import { useState, useEffect, useMemo, useRef } from "react";

/**
 * SectionQrManager.jsx
 * Staff-facing tool to upload/replace each section's adviser QR code.
 *
 * Talks to:
 *  GET  /admin/timetable/get_all_timetable.php            (section list)
 *  GET  /admin/timetable/get_section_qr.php?section_id=X   (current QR)
 *  POST /admin/timetable/upload_section_qr.php             (upload/replace)
 *
 * Adjust ADMIN_BASE below to match wherever these actually live —
 * they're siblings of upload_section_qr.php in your project.
 */

const ADMIN_BASE = "http://localhost/backend-online-enrollment/staff";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB, matches the backend limit

export default function SectionQrManager() {
  const [sections, setSections] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [sectionsError, setSectionsError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState(null);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    loadSections();
  }, []);

  useEffect(() => {
    if (selectedId) loadQr(selectedId);
    else {
      setQrData(null);
      setQrError(null);
    }
    resetFileSelection();
  }, [selectedId]);

  async function loadSections() {
    setSectionsLoading(true);
    setSectionsError(null);
    try {
      const res = await fetch(`${ADMIN_BASE}/get_all_timetable.php`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setSections(data.sections ?? []);
      } else {
        setSectionsError(data.message ?? "Could not load sections.");
      }
    } catch {
      setSectionsError("Could not reach the server.");
    } finally {
      setSectionsLoading(false);
    }
  }

  const filteredSections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sections;
    return sections.filter((section) => {
      const title = [
        section.section_name,
        section.strand_name,
        section.grade_level && `Grade ${section.grade_level}`,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return title.includes(query);
    });
  }, [searchQuery, sections]);

  async function loadQr(sectionId) {
    setQrLoading(true);
    setQrError(null);
    setQrData(null);
    try {
      const res = await fetch(
        `${ADMIN_BASE}/get_section_qr.php?section_id=${sectionId}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (data.success) {
        setQrData(data.data);
      } else {
        // "No QR Code uploaded for this section." is an expected, normal
        // state here (not an error) — the upload form still shows.
        setQrError(data.message ?? null);
      }
    } catch {
      setQrError("Could not reach the server.");
    } finally {
      setQrLoading(false);
    }
  }

  function resetFileSelection() {
    setSelectedFile(null);
    setFileError(null);
    setUploadMessage(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    setUploadMessage(null);
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError("Please choose a JPG, PNG, GIF, or WEBP image.");
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      setFileError("File is too large. Maximum size is 5MB.");
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setFileError(null);
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleUpload() {
    if (!selectedFile || !selectedId) return;
    setUploading(true);
    setUploadMessage(null);

    try {
      const formData = new FormData();
      formData.append("section_id", selectedId);
      formData.append("qr_code", selectedFile);

      const res = await fetch(`${ADMIN_BASE}/upload_section_qr.php`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setUploadMessage({ type: "success", text: data.message ?? "QR code saved." });
        resetFileSelection();
        loadQr(selectedId); // refresh the preview with the new file
      } else {
        setUploadMessage({ type: "error", text: data.message ?? "Upload failed." });
      }
    } catch {
      setUploadMessage({ type: "error", text: "Could not reach the server." });
    } finally {
      setUploading(false);
    }
  }

  const selectedSection = sections.find(
    (s) => String(s.section_id) === String(selectedId)
  );

  return (
    <div className="px-4 sm:px-6 py-6 space-y-5 max-w-xl">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.15em] text-[#8C6B12] mb-1">
          Section Management
        </p>
        <h2
          className="text-xl sm:text-2xl text-[#1B5E2C]"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          Adviser QR Codes
        </h2>
        <p className="text-sm text-[#86A18A] mt-1">
          Upload or replace the donation QR code shown to students for each section.
        </p>
      </div>

      {/* Section selector */}
      <div className="bg-white rounded-2xl border border-[#D9E8D5] p-4 sm:p-5">
        <label className="block text-xs font-medium text-[#1B5E2C] mb-2">
          Select Section
        </label>

        {sectionsLoading ? (
          <div className="h-10 rounded-lg bg-[#EFF4ED] animate-pulse" />
        ) : sectionsError ? (
          <p className="text-sm text-[#B3401E]">{sectionsError}</p>
        ) : (
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded-lg border border-[#D9E8D5] px-3 py-2.5 text-sm text-[#1B5E2C] outline-none focus:border-[#1B5E2C] focus:ring-1 focus:ring-[#1B5E2C]"
          >
            <option value="">Choose a section...</option>
            {sections.map((s) => (
              <option key={s.section_id} value={s.section_id}>
                Grade {s.grade_level} — {s.section_name}
                {s.strand_name ? ` (${s.strand_name})` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Current QR + upload form */}
      {selectedId && (
        <div className="bg-white rounded-2xl border border-[#D9E8D5] p-4 sm:p-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-[#1B5E2C]">
              {selectedSection
                ? `Grade ${selectedSection.grade_level} — ${selectedSection.section_name}`
                : "Selected Section"}
            </p>
          </div>

          {/* Current QR preview */}
          <div>
            <p className="text-xs uppercase tracking-[0.1em] text-[#86A18A] mb-2">
              Current QR Code
            </p>
            {qrLoading ? (
              <div className="h-40 w-40 rounded-xl bg-[#EFF4ED] animate-pulse" />
            ) : qrData ? (
              <div className="flex items-center gap-4">
                <img
                  src={`/backend-online-enrollment/uploads/${qrData.qr_code}`}
                  alt="Current adviser QR code"
                  className="h-32 w-32 object-contain rounded-xl border border-[#D9E8D5] bg-[#FAFAF5]"
                />
                <div className="text-sm">
                  <p className="text-[#1B5E2C] font-medium">
                    {qrData.adviser_name ?? "No adviser name set"}
                  </p>
                  {qrData.updated_at && (
                    <p className="text-xs text-[#86A18A] mt-0.5">
                      Updated{" "}
                      {new Date(qrData.updated_at).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#86A18A]">
                {qrError ?? "No QR code uploaded yet for this section."}
              </p>
            )}
          </div>

          {/* Upload / replace */}
          <div>
            <p className="text-xs uppercase tracking-[0.1em] text-[#86A18A] mb-2">
              {qrData ? "Replace QR Code" : "Upload QR Code"}
            </p>

            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 h-24 w-24 rounded-xl border-2 border-dashed border-[#D9E8D5] flex flex-col items-center justify-center gap-1 text-[#86A18A] hover:border-[#1B5E2C] hover:text-[#1B5E2C] transition-colors overflow-hidden"
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="New QR preview"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <>
                    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
                      <path
                        d="M10 4v12M4 10h12"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="text-[10px] font-medium">Choose file</span>
                  </>
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex-1 space-y-2">
                <p className="text-xs text-[#86A18A]">
                  JPG, PNG, GIF, or WEBP. Max 5MB.
                </p>
                {fileError && (
                  <p className="text-xs text-[#B3401E]">{fileError}</p>
                )}
                {selectedFile && !fileError && (
                  <p className="text-xs text-[#1B5E2C] truncate">
                    Selected: {selectedFile.name}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!selectedFile || !!fileError || uploading}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1B5E2C] text-white text-sm font-medium px-4 py-2 hover:bg-[#164A23] transition-colors disabled:cursor-not-allowed disabled:bg-[#CBD9C8]"
                >
                  {uploading
                    ? "Uploading..."
                    : qrData
                    ? "Replace QR Code"
                    : "Upload QR Code"}
                </button>
              </div>
            </div>

            {uploadMessage && (
              <p
                className={`text-xs mt-3 ${
                  uploadMessage.type === "success"
                    ? "text-[#1B5E2C]"
                    : "text-[#B3401E]"
                }`}
              >
                {uploadMessage.text}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
