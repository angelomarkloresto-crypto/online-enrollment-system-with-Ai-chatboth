import { useEffect, useState } from "react";

// const API_BASE = "http://localhost/backend-online-enrollment/staff";
export const getApiBase = () => {
  return "/backend-online-enrollment/staff";
};

export default function AddAndUpdateSubject() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div className="px-4 sm:px-6 py-6 space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.15em] text-[#8C6B12] mb-1">
          Admin Portal
        </p>
        <h2
          className="text-xl sm:text-2xl text-[#1B5E2C]"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          Strands
        </h2>
      </div>

      <StrandsTab onToast={setToast} />

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

function StrandsTab({ onToast }) {
  const [strands, setStrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [activeStrand, setActiveStrand] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    loadStrands();
  }, []);

  async function loadStrands() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${getApiBase()}/get_strand.php`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setStrands(data.strands ?? []);
      } else {
        setLoadError("Could not load strands.");
      }
    } catch {
      setLoadError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(strand) {
    try {
      const body = new FormData();
      body.append("strand_id", strand.strand_id);

      const res = await fetch(`${getApiBase()}/delete_strand.php`, {
        method: "POST",
        credentials: "include",
        body,
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
    } finally {
      setConfirmDelete(null);
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => {
            setActiveStrand(null);
            setModalMode("create");
          }}
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
              strands.map((strand, index) => (
                <tr key={strand.strand_id} className="border-t border-[#EFF4ED] hover:bg-[#FAFAF5]">
                  <td className="px-5 py-3.5 text-[#86A18A]">{index + 1}</td>
                  <td className="px-5 py-3.5 text-[#1B5E2C] font-medium">{strand.strand_name}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => {
                        setActiveStrand(strand);
                        setModalMode("edit");
                      }}
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

      {confirmDelete && (
        <ConfirmModal
          title="Delete strand?"
          message={`"${confirmDelete.strand_name}" will be permanently removed.`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
    </>
  );
}

function StrandFormModal({ mode, strand, onClose, onSaved, onError }) {
  const isEdit = mode === "edit";
  const [name, setName] = useState(strand?.strand_name ?? "");
  const [nameErr, setNameErr] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!name.trim()) {
      setNameErr("Strand name is required.");
      return;
    }

    setSubmitting(true);

    try {
      const body = new FormData();
      body.append("strand_name", name.trim());
      if (isEdit) body.append("strand_id", strand.strand_id);

      const url = isEdit
        ? `${getApiBase()}/update_strand.php`
        : `${getApiBase()}/create_strand.php`;

      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        body,
      });

      const data = await res.json();
      if (data.success) {
        onSaved(isEdit ? "Strand updated." : "Strand created.");
      } else {
        onError(data.message ?? data.messgae ?? "Something went wrong.");
      }
    } catch {
      onError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
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
            onChange={(e) => {
              setName(e.target.value);
              setNameErr(null);
            }}
            placeholder="e.g. STEM, ABM, HUMSS"
            className={`w-full rounded-lg border px-4 py-2.5 text-sm text-[#1B5E2C] placeholder:text-[#A8AEBC] focus:outline-none focus:ring-2 focus:ring-[#F2BE22] ${
              nameErr ? "border-[#B3492B]" : "border-[#CBD9C8]"
            }`}
          />
          {nameErr && <p className="mt-1 text-xs text-[#B3492B]">{nameErr}</p>}
        </div>
        <ModalActions onClose={onClose} submitting={submitting} isEdit={isEdit} />
      </form>
    </Modal>
  );
}

function SubjectsTab({ onToast }) {
  const [subjects, setSubjects] = useState([]);
  const [strands, setStrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [activeSubject, setActiveSubject] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setLoadError(null);
    try {
      const [subRes, strRes] = await Promise.all([
        fetch(`${getApiBase()}/get_subjects.php`, { credentials: "include" }),
        fetch(`${getApiBase()}/get_strand.php`, { credentials: "include" }),
      ]);

      const [subData, strData] = await Promise.all([
        subRes.json().catch(() => ({ success: false, message: "The subject endpoint returned an invalid response." })),
        strRes.json().catch(() => ({ success: false, message: "The strand endpoint returned an invalid response." })),
      ]);

      if (!subData.success) {
        setLoadError(subData.message ?? "Could not load subjects.");
      } else {
        setSubjects(subData.subjects ?? []);
      }

      if (!strData.success) {
        setLoadError((prev) => prev || strData.message || "Could not load strands.");
      } else {
        setStrands(strData.strands ?? []);
      }
    } catch (error) {
      console.error("Failed to load admin subject data:", error);
      setLoadError("Could not reach the server. Check that the PHP backend is running and the subjects table exists.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(subject) {
    try {
      const body = new FormData();
      body.append("subject_id", subject.subject_id);

      const res = await fetch(`${getApiBase()}/delete_subject.php`, {
        method: "POST",
        credentials: "include",
        body,
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = { success: false, message: "The subject delete endpoint returned an invalid response." };
      }

      if (data.success) {
        setSubjects((prev) => prev.filter((s) => s.subject_id !== subject.subject_id));
        onToast({ type: "success", text: `"${subject.subject_name}" deleted.` });
      } else {
        onToast({ type: "error", text: data.message ?? "Could not delete subject." });
      }
    } catch (error) {
      console.error("Failed to delete subject:", error);
      onToast({ type: "error", text: "Could not reach the server. Check that the PHP backend is running." });
    } finally {
      setConfirmDelete(null);
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => {
            setActiveSubject(null);
            setModalMode("create");
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1B5E2C] text-white text-sm font-medium px-4 py-2.5 hover:bg-[#164A22] transition-colors"
        >
          <span className="text-lg leading-none">+</span> Add Subject
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
              <th className="px-5 py-3 font-medium">Subject Name</th>
              <th className="px-5 py-3 font-medium">Subject Code</th>
              <th className="px-5 py-3 font-medium">Strand</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i} className="border-t border-[#EFF4ED]">
                  <td colSpan={5} className="px-5 py-4">
                    <div className="h-4 w-1/2 rounded bg-[#EFF4ED] animate-pulse" />
                  </td>
                </tr>
              ))
            ) : subjects.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-[#86A18A]">
                  No subjects added yet.
                </td>
              </tr>
            ) : (
              subjects.map((subject, index) => (
                <tr key={subject.subject_id} className="border-t border-[#EFF4ED] hover:bg-[#FAFAF5]">
                  <td className="px-5 py-3.5 text-[#86A18A]">{index + 1}</td>
                  <td className="px-5 py-3.5 text-[#1B5E2C] font-medium">{subject.subject_name}</td>
                  <td className="px-5 py-3.5 text-[#5B6478]">{subject.subject_code || "—"}</td>
                  <td className="px-5 py-3.5 text-[#5B6478]">
                    {subject.strand_name ?? "General"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => {
                        setActiveSubject(subject);
                        setModalMode("edit");
                      }}
                      className="text-[#8C6B12] hover:text-[#6E5410] text-sm font-medium mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDelete(subject)}
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

      {modalMode && (
        <SubjectFormModal
          mode={modalMode}
          subject={activeSubject}
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
          title="Delete subject?"
          message={`"${confirmDelete.subject_name}" will be permanently removed.`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
    </>
  );
}

function SubjectFormModal({ mode, subject, strands, onClose, onSaved, onError }) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState({
    subject_name: subject?.subject_name ?? "",
    subject_code: subject?.subject_code ?? "",
    strand_id: subject?.strand_id ?? "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.subject_name.trim()) next.subject_name = "Subject name is required.";
    if (!form.subject_code.trim()) next.subject_code = "Subject code is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    try {
      const body = new FormData();
      body.append("subject_name", form.subject_name.trim());
      body.append("subject_code", form.subject_code.trim());
      if (form.strand_id) body.append("strand_id", form.strand_id);
      if (isEdit) body.append("subject_id", subject.subject_id);

      const url = isEdit
        ? `${getApiBase()}/update_subject.php`
        : `${getApiBase()}/create_subject.php`;

      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        body,
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = { success: false, message: "The subject endpoint returned an invalid response." };
      }

      if (data.success) {
        onSaved(isEdit ? "Subject updated." : "Subject created.");
      } else {
        onError(data.message ?? "Something went wrong.");
      }
    } catch (error) {
      console.error("Failed to save subject:", error);
      onError("Could not reach the server. Check that the PHP backend is running and the subjects table exists.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Subject" : "Add Subject"} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">
            Subject name
          </label>
          <input
            name="subject_name"
            value={form.subject_name}
            onChange={handleChange}
            placeholder="e.g. General Mathematics"
            className={inputCls(errors.subject_name)}
          />
          {errors.subject_name && <Err msg={errors.subject_name} />}
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">
            Subject code
          </label>
          <input
            name="subject_code"
            value={form.subject_code}
            onChange={handleChange}
            placeholder="e.g. MATH101"
            className={inputCls(errors.subject_code)}
          />
          {errors.subject_code && <Err msg={errors.subject_code} />}
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">
            Strand
          </label>
          <select
            name="strand_id"
            value={form.strand_id}
            onChange={handleChange}
            className={inputCls(errors.strand_id)}
          >
            <option value="">General / No specific strand</option>
            {strands.map((strand) => (
              <option key={strand.strand_id} value={strand.strand_id}>
                {strand.strand_name}
              </option>
            ))}
          </select>
        </div>

        <ModalActions onClose={onClose} submitting={submitting} isEdit={isEdit} />
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={`relative bg-white rounded-2xl shadow-xl w-full ${
          wide ? "max-w-lg" : "max-w-sm"
        } max-h-[90vh] overflow-y-auto`}
      >
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

const inputCls = (err) =>
  `w-full rounded-lg border px-4 py-2.5 text-sm text-[#1B5E2C] placeholder:text-[#A8AEBC] bg-white focus:outline-none focus:ring-2 focus:ring-[#F2BE22] ${
    err ? "border-[#B3492B]" : "border-[#CBD9C8]"
  }`;

function Err({ msg }) {
  return <p className="mt-1 text-xs text-[#B3492B]">{msg}</p>;
}
