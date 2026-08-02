import { useState, useEffect } from "react";

/**
 * StrandsAndSections.jsx
 * Talks to:
 *  Strands: /staff/get_strand.php, create_strand.php, update_strand.php, delete_strand.php
 *  Sections: /staff/get_sections.php, create_section.php, update_section.php, delete_section.php
 *
 * Backend bugs to fix:
 *  - get_strand.php: "SELECT FROM strands" → "SELECT * FROM strands"
 *  - create_strand.php: inserts into "strand" → should be "strands"
 *  - create_strand.php: "messgae" typo in duplicate-check response key
 */

const API_BASE = "http://localhost/backend-online-enrollment/staff";

const GRADE_LEVELS = [
  { value: "7",  label: "Grade 7",  type: "JHS" },
  { value: "8",  label: "Grade 8",  type: "JHS" },
  { value: "9",  label: "Grade 9",  type: "JHS" },
  { value: "10", label: "Grade 10", type: "JHS" },
  { value: "11", label: "Grade 11", type: "SHS" },
  { value: "12", label: "Grade 12", type: "SHS" },
];

export default function StrandsAndSections() {
  const [activeTab, setActiveTab] = useState("strands");
  const [toast, setToast]         = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="px-4 sm:px-6 py-6 space-y-5">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.15em] text-[#8C6B12] mb-1">
          Staff Portal
        </p>
        <h2
          className="text-xl sm:text-2xl text-[#1B5E2C]"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          Strands &amp; Sections
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#D9E8D5]">
        {[
          { key: "strands",  label: "Strands" },
          { key: "sections", label: "Sections" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-[#1B5E2C] text-[#1B5E2C]"
                : "border-transparent text-[#86A18A] hover:text-[#1B5E2C]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "strands" ? (
        <StrandsTab onToast={setToast} />
      ) : (
        <SectionsTab onToast={setToast} />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm shadow-lg z-50 whitespace-nowrap ${
            toast.type === "success"
              ? "bg-[#1B5E2C] text-white"
              : "bg-[#B3492B] text-white"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   STRANDS TAB
══════════════════════════════════════════════ */
function StrandsTab({ onToast }) {
  const [strands, setStrands]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState(null);
  const [modalMode, setModalMode]   = useState(null); // null | "create" | "edit"
  const [activeStrand, setActiveStrand] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { loadStrands(); }, []);

  async function loadStrands() {
    setLoading(true);
    setLoadError(null);
    try {
      const res  = await fetch(`${API_BASE}/get_strand.php`, { credentials: "include" });
      const data = await res.json();
      data.success ? setStrands(data.strands ?? []) : setLoadError("Could not load strands.");
    } catch { setLoadError("Could not reach the server."); }
    finally  { setLoading(false); }
  }

  async function handleDelete(strand) {
    try {
      const body = new FormData();
      body.append("strand_id", strand.strand_id);
      const res  = await fetch(`${API_BASE}/delete_strand.php`, {
        method: "POST", credentials: "include", body,
      });
      const data = await res.json();
      if (data.success) {
        setStrands((prev) => prev.filter((s) => s.strand_id !== strand.strand_id));
        onToast({ type: "success", text: `"${strand.strand_name}" deleted.` });
      } else {
        onToast({ type: "error", text: data.message ?? "Could not delete strand." });
      }
    } catch {
      onToast({ type: "error", text: "Could not reach the server." });
    } finally { setConfirmDelete(null); }
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => { setActiveStrand(null); setModalMode("create"); }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1B5E2C] text-white text-sm font-medium px-4 py-2.5 hover:bg-[#164A22] transition-colors"
        >
          <span className="text-lg leading-none">+</span> Add Strand
        </button>
      </div>

      {loadError && (
        <div className="rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 text-[#B3492B] text-sm px-4 py-3">
          {loadError}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#D9E8D5] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1B5E2C] text-[#FAFAF5] text-left">
              <th className="px-5 py-3 font-medium">#</th>
              <th className="px-5 py-3 font-medium">Strand Name</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="border-t border-[#EFF4ED]">
                  <td colSpan={3} className="px-5 py-4">
                    <div className="h-4 w-1/3 rounded bg-[#EFF4ED] animate-pulse" />
                  </td>
                </tr>
              ))
            ) : strands.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-10 text-center text-[#86A18A]">
                  No strands added yet.
                </td>
              </tr>
            ) : (
              strands.map((strand, idx) => (
                <tr key={strand.strand_id} className="border-t border-[#EFF4ED] hover:bg-[#FAFAF5]">
                  <td className="px-5 py-3.5 text-[#86A18A]">{idx + 1}</td>
                  <td className="px-5 py-3.5 text-[#1B5E2C] font-medium">
                    {strand.strand_name}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => { setActiveStrand(strand); setModalMode("edit"); }}
                      className="text-[#8C6B12] hover:text-[#6E5410] text-sm font-medium mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDelete(strand)}
                      className="text-[#B3492B] hover:text-[#963B22] text-sm font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Strand form modal */}
      {modalMode && (
        <StrandFormModal
          mode={modalMode}
          strand={activeStrand}
          onClose={() => setModalMode(null)}
          onSaved={(msg) => {
            setModalMode(null);
            onToast({ type: "success", text: msg });
            loadStrands();
          }}
          onError={(msg) => onToast({ type: "error", text: msg })}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <ConfirmModal
          title="Delete strand?"
          message={`"${confirmDelete.strand_name}" will be permanently removed. Sections linked to this strand may be affected.`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
    </>
  );
}

function StrandFormModal({ mode, strand, onClose, onSaved, onError }) {
  const isEdit = mode === "edit";
  const [name, setName]         = useState(strand?.strand_name ?? "");
  const [nameErr, setNameErr]   = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setNameErr("Strand name is required."); return; }
    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("strand_name", name.trim());
      if (isEdit) body.append("strand_id", strand.strand_id);

      const url = isEdit
        ? `${API_BASE}/update_strand.php`
        : `${API_BASE}/create_strand.php`;

      const res  = await fetch(url, { method: "POST", credentials: "include", body });
      const data = await res.json();
      data.success
        ? onSaved(isEdit ? "Strand updated." : "Strand created.")
        : onError(data.message ?? data.messgae ?? "Something went wrong.");
    } catch { onError("Could not reach the server."); }
    finally  { setSubmitting(false); }
  }

  return (
    <Modal title={isEdit ? "Edit Strand" : "Add Strand"} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">
            Strand name
          </label>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setNameErr(null); }}
            placeholder="e.g. STEM, ABM, HUMSS"
            className={`w-full rounded-lg border px-4 py-2.5 text-sm text-[#1B5E2C] placeholder:text-[#A8AEBC] focus:outline-none focus:ring-2 focus:ring-[#F2BE22] ${nameErr ? "border-[#B3492B]" : "border-[#CBD9C8]"}`}
          />
          {nameErr && <p className="mt-1 text-xs text-[#B3492B]">{nameErr}</p>}
        </div>
        <ModalActions onClose={onClose} submitting={submitting} isEdit={isEdit} />
      </form>
    </Modal>
  );
}

/* ══════════════════════════════════════════════
   SECTIONS TAB
══════════════════════════════════════════════ */
function SectionsTab({ onToast }) {
  const [sections, setSections]     = useState([]);
  const [strands, setStrands]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState(null);
  const [gradeFilter, setGradeFilter] = useState("All");
  const [modalMode, setModalMode]   = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    setLoadError(null);
    try {
      const [secRes, strRes] = await Promise.all([
        fetch(`${API_BASE}/get_sections.php`, { credentials: "include" }),
        fetch(`${API_BASE}/get_strand.php`,   { credentials: "include" }),
      ]);
      const [secData, strData] = await Promise.all([secRes.json(), strRes.json()]);
      if (secData.success) setSections(secData.sections ?? []);
      else setLoadError("Could not load sections.");
      if (strData.success) setStrands(strData.strands ?? []);
    } catch { setLoadError("Could not reach the server."); }
    finally  { setLoading(false); }
  }

  async function handleDelete(section) {
    try {
      const body = new FormData();
      body.append("section_id", section.section_id);
      const res  = await fetch(`${API_BASE}/delete_section.php`, {
        method: "POST", credentials: "include", body,
      });
      const data = await res.json();
      if (data.success) {
        setSections((prev) => prev.filter((s) => s.section_id !== section.section_id));
        onToast({ type: "success", text: `Section "${section.section_name}" deleted.` });
      } else {
        onToast({ type: "error", text: data.message ?? "Could not delete section." });
      }
    } catch { onToast({ type: "error", text: "Could not reach the server." }); }
    finally  { setConfirmDelete(null); }
  }

  const gradeOptions = ["All", "7", "8", "9", "10", "11", "12"];
  const filtered = gradeFilter === "All"
    ? sections
    : sections.filter((s) => String(s.grade_level) === gradeFilter);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Grade filter pills */}
        <div className="flex flex-wrap gap-2">
          {gradeOptions.map((g) => (
            <button
              key={g}
              onClick={() => setGradeFilter(g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                gradeFilter === g
                  ? "bg-[#1B5E2C] text-white"
                  : "bg-white border border-[#CBD9C8] text-[#5B6478] hover:border-[#1B5E2C]"
              }`}
            >
              {g === "All" ? "All Grades" : `Grade ${g}`}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setActiveSection(null); setModalMode("create"); }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1B5E2C] text-white text-sm font-medium px-4 py-2.5 hover:bg-[#164A22] transition-colors shrink-0"
        >
          <span className="text-lg leading-none">+</span> Add Section
        </button>
      </div>

      {loadError && (
        <div className="rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 text-[#B3492B] text-sm px-4 py-3">
          {loadError}
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border border-[#D9E8D5] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1B5E2C] text-[#FAFAF5] text-left">
              <th className="px-5 py-3 font-medium">Section Name</th>
              <th className="px-5 py-3 font-medium">Grade</th>
              <th className="px-5 py-3 font-medium">Strand</th>
              <th className="px-5 py-3 font-medium">Average Range</th>
              <th className="px-5 py-3 font-medium">Capacity</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i} className="border-t border-[#EFF4ED]">
                  <td colSpan={6} className="px-5 py-4">
                    <div className="h-4 w-1/2 rounded bg-[#EFF4ED] animate-pulse" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-[#86A18A]">
                  No sections found.
                </td>
              </tr>
            ) : (
              filtered.map((sec) => (
                <tr key={sec.section_id} className="border-t border-[#EFF4ED] hover:bg-[#FAFAF5]">
                  <td className="px-5 py-3.5 text-[#1B5E2C] font-medium">
                    {sec.section_name}
                  </td>
                  <td className="px-5 py-3.5 text-[#5B6478]">
                    Grade {sec.grade_level}
                  </td>
                  <td className="px-5 py-3.5 text-[#5B6478]">
                    {sec.strand_name ?? <span className="text-[#CBD9C8]">JHS</span>}
                  </td>
                  <td className="px-5 py-3.5 text-[#5B6478]">
                    {sec.min_average} – {sec.max_average}
                  </td>
                  <td className="px-5 py-3.5">
                    <CapacityBar current={sec.current_capacity} max={sec.max_capacity} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => { setActiveSection(sec); setModalMode("edit"); }}
                      className="text-[#8C6B12] hover:text-[#6E5410] text-sm font-medium mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDelete(sec)}
                      className="text-[#B3492B] hover:text-[#963B22] text-sm font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#D9E8D5] p-4 space-y-2">
              <div className="h-4 w-1/2 rounded bg-[#EFF4ED] animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-[#EFF4ED] animate-pulse" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#D9E8D5] p-8 text-center text-[#86A18A] text-sm">
            No sections found.
          </div>
        ) : (
          filtered.map((sec) => (
            <div key={sec.section_id} className="bg-white rounded-xl border border-[#D9E8D5] p-4">
              <div className="flex justify-between items-start gap-2 mb-2">
                <div>
                  <p className="text-[#1B5E2C] font-medium">{sec.section_name}</p>
                  <p className="text-xs text-[#5B6478] mt-0.5">
                    Grade {sec.grade_level} · {sec.strand_name ?? "JHS"}
                  </p>
                </div>
                <span className="text-xs text-[#86A18A]">
                  {sec.min_average}–{sec.max_average}
                </span>
              </div>
              <CapacityBar current={sec.current_capacity} max={sec.max_capacity} />
              <div className="flex gap-4 mt-3 pt-3 border-t border-[#EFF4ED]">
                <button
                  onClick={() => { setActiveSection(sec); setModalMode("edit"); }}
                  className="text-[#8C6B12] text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => setConfirmDelete(sec)}
                  className="text-[#B3492B] text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Section form modal */}
      {modalMode && (
        <SectionFormModal
          mode={modalMode}
          section={activeSection}
          strands={strands}
          onClose={() => setModalMode(null)}
          onSaved={(msg) => {
            setModalMode(null);
            onToast({ type: "success", text: msg });
            loadAll();
          }}
          onError={(msg) => onToast({ type: "error", text: msg })}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete section?"
          message={`"${confirmDelete.section_name}" will be permanently removed. This affects enrollment assignment.`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
    </>
  );
}

function SectionFormModal({ mode, section, strands, onClose, onSaved, onError }) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState({
    section_name: section?.section_name ?? "",
    grade_level:  section?.grade_level  ?? "7",
    strand_id:    section?.strand_id    ?? "",
    max_capacity: section?.max_capacity ?? "",
    min_average:  section?.min_average  ?? "",
    max_average:  section?.max_average  ?? "",
  });
  const [errors, setErrors]         = useState({});
  const [submitting, setSubmitting] = useState(false);

  const isSHS = ["11", "12"].includes(String(form.grade_level));

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.section_name.trim()) next.section_name = "Section name is required.";
    if (!form.max_capacity || isNaN(form.max_capacity) || Number(form.max_capacity) < 1)
      next.max_capacity = "Enter a valid capacity.";
    if (form.min_average === "" || isNaN(form.min_average))
      next.min_average = "Enter a valid minimum average.";
    if (form.max_average === "" || isNaN(form.max_average))
      next.max_average = "Enter a valid maximum average.";
    if (Number(form.min_average) >= Number(form.max_average))
      next.max_average = "Max average must be greater than min average.";
    if (isSHS && !form.strand_id)
      next.strand_id = "Select a strand for SHS sections.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => body.append(k, v));
      if (!isSHS) body.set("strand_id", ""); // clear strand for JHS
      if (isEdit) body.append("section_id", section.section_id);

      const url = isEdit
        ? `${API_BASE}/update_section.php`
        : `${API_BASE}/create_section.php`;

      const res  = await fetch(url, { method: "POST", credentials: "include", body });
      const data = await res.json();
      data.success
        ? onSaved(isEdit ? "Section updated." : "Section created.")
        : onError(data.message ?? "Something went wrong.");
    } catch { onError("Could not reach the server."); }
    finally  { setSubmitting(false); }
  }

  return (
    <Modal title={isEdit ? "Edit Section" : "Add Section"} onClose={onClose} wide>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Section name */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">
              Section name
            </label>
            <input
              name="section_name"
              value={form.section_name}
              onChange={handleChange}
              placeholder="e.g. Rizal, Bonifacio"
              className={inputCls(errors.section_name)}
            />
            {errors.section_name && <Err msg={errors.section_name} />}
          </div>

          {/* Grade level */}
          <div>
            <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">
              Grade level
            </label>
            <select
              name="grade_level"
              value={form.grade_level}
              onChange={handleChange}
              className={inputCls()}
            >
              {GRADE_LEVELS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label} ({g.type})
                </option>
              ))}
            </select>
          </div>

          {/* Strand — only for SHS */}
          <div>
            <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">
              Strand {!isSHS && <span className="text-[#86A18A] font-normal">(JHS — not required)</span>}
            </label>
            <select
              name="strand_id"
              value={form.strand_id}
              onChange={handleChange}
              disabled={!isSHS}
              className={`${inputCls(errors.strand_id)} disabled:bg-[#FAFAF5] disabled:text-[#A8AEBC] disabled:cursor-not-allowed`}
            >
              <option value="">— None —</option>
              {strands.map((s) => (
                <option key={s.strand_id} value={s.strand_id}>
                  {s.strand_name}
                </option>
              ))}
            </select>
            {errors.strand_id && <Err msg={errors.strand_id} />}
          </div>

          {/* Min average */}
          <div>
            <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">
              Min average
            </label>
            <input
              name="min_average"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.min_average}
              onChange={handleChange}
              placeholder="e.g. 75"
              className={inputCls(errors.min_average)}
            />
            {errors.min_average && <Err msg={errors.min_average} />}
          </div>

          {/* Max average */}
          <div>
            <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">
              Max average
            </label>
            <input
              name="max_average"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.max_average}
              onChange={handleChange}
              placeholder="e.g. 100"
              className={inputCls(errors.max_average)}
            />
            {errors.max_average && <Err msg={errors.max_average} />}
          </div>

          {/* Max capacity */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">
              Max capacity
            </label>
            <input
              name="max_capacity"
              type="number"
              min="1"
              value={form.max_capacity}
              onChange={handleChange}
              placeholder="e.g. 40"
              className={inputCls(errors.max_capacity)}
            />
            {errors.max_capacity && <Err msg={errors.max_capacity} />}
          </div>
        </div>

        <ModalActions onClose={onClose} submitting={submitting} isEdit={isEdit} />
      </form>
    </Modal>
  );
}

/* ══════════════════════════════════════════════
   SHARED COMPONENTS
══════════════════════════════════════════════ */
function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-xl w-full ${wide ? "max-w-lg" : "max-w-sm"} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D9E8D5] sticky top-0 bg-white z-10">
          <h2 className="text-lg text-[#1B5E2C]" style={{ fontFamily: "'Fraunces', serif" }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg border border-[#D9E8D5] flex items-center justify-center text-[#86A18A] hover:text-[#1B5E2C] text-sm"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({ onClose, submitting, isEdit }) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 rounded-lg border border-[#CBD9C8] text-[#5B6478] text-sm font-medium py-2.5 hover:bg-[#FAFAF5] transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={submitting}
        className="flex-1 rounded-lg bg-[#1B5E2C] text-white text-sm font-medium py-2.5 hover:bg-[#164A22] disabled:opacity-60 transition-colors"
      >
        {submitting ? "Saving…" : isEdit ? "Save changes" : "Create"}
      </button>
    </div>
  );
}

function ConfirmModal({ title, message, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl text-center">
        <h2 className="text-lg text-[#1B5E2C] mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
          {title}
        </h2>
        <p className="text-sm text-[#5B6478] mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-[#CBD9C8] text-[#5B6478] text-sm font-medium py-2.5 hover:bg-[#FAFAF5]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-[#B3492B] text-white text-sm font-medium py-2.5 hover:bg-[#963B22]"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function CapacityBar({ current, max }) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const color = pct >= 90 ? "bg-[#B3492B]" : pct >= 70 ? "bg-[#F2BE22]" : "bg-[#1B5E2C]";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-[#EFF4ED] overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-[#86A18A] shrink-0 tabular-nums">
        {current}/{max}
      </span>
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
