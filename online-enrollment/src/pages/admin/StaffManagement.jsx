import { useState, useEffect } from "react";

/**
 * StaffManagement.jsx
 * Talks to: get_staff.php, create_staff.php, update_staff.php,
 *           delete_staff.php, update_staff_status.php
 *
 * Backend notes:
 *  - get_staff.php returns proper JSON ({ success, message: [...staff] }).
 *  - create_staff.php, update_staff.php, delete_staff.php, update_staff_status.php
 *    all echo plain text instead of JSON, so this page checks response text for
 *    "Error" to decide success/failure. Recommend switching these to
 *    header("Content-Type: application/json") + json_encode(...) for consistency.
 *  - create_staff.php uses die("Email already exists") on duplicate email — this
 *    skips closing the DB connection and breaks the plain-text-success pattern
 *    used elsewhere, but is still handled below as a fail case.
 */

const API_BASE = "http://localhost/backend-online-enrollment/admin";

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [search, setSearch] = useState("");
  const [modalMode, setModalMode] = useState(null); // null | "create" | "edit"
  const [activeStaff, setActiveStaff] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // staff object
  const [toast, setToast] = useState(null); // { type, text }

  useEffect(() => {
    loadStaff();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function loadStaff() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${API_BASE}/get_staff.php`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setStaff(data.message || []);
      } else {
        setLoadError("Could not load staff list.");
      }
    } catch {
      setLoadError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(member) {
    const nextStatus = member.status === "Active" ? "Inactive" : "Active";
    setStaff((prev) =>
      prev.map((s) =>
        s.staff_id === member.staff_id ? { ...s, status: nextStatus } : s
      )
    );
    try {
      const body = new FormData();
      body.append("staff_id", member.staff_id);
      body.append("status", nextStatus);
      const res = await fetch(`${API_BASE}/update_staff_status.php`, {
        method: "POST",
        credentials: "include",
        body,
      });
      const text = await res.text();
      if (/error/i.test(text)) {
        throw new Error(text);
      }
      setToast({ type: "success", text: `${member.full_name} marked ${nextStatus.toLowerCase()}.` });
    } catch {
      setStaff((prev) =>
        prev.map((s) =>
          s.staff_id === member.staff_id ? { ...s, status: member.status } : s
        )
      );
      setToast({ type: "error", text: "Could not update status." });
    }
  }

  async function handleDelete(member) {
    try {
      const body = new FormData();
      body.append("staff_id", member.staff_id);
      const res = await fetch(`${API_BASE}/delete_staff.php`, {
        method: "POST",
        credentials: "include",
        body,
      });
      const text = await res.text();
      if (/error/i.test(text)) throw new Error(text);
      setStaff((prev) => prev.filter((s) => s.staff_id !== member.staff_id));
      setToast({ type: "success", text: `${member.full_name} removed.` });
    } catch {
      setToast({ type: "error", text: "Could not delete staff member." });
    } finally {
      setConfirmDelete(null);
    }
  }

  const filtered = staff.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen w-full bg-[#FAFAF5] px-4 sm:px-6 lg:px-10 py-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-[#8C6B12] mb-1">
              Gogon High School
            </p>
            <h1
              className="text-2xl sm:text-3xl text-[#1B5E2C]"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Staff Accounts
            </h1>
          </div>
          <button
            onClick={() => {
              setActiveStaff(null);
              setModalMode("create");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1B5E2C] text-white text-sm font-medium px-4 py-2.5 hover:bg-[#164A22] transition-colors"
          >
            <span className="text-lg leading-none">+</span> Add Staff
          </button>
        </header>

        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full sm:w-72 rounded-lg border border-[#CBD9C8] px-4 py-2.5 text-sm text-[#1B5E2C] placeholder:text-[#86A18A] bg-white focus:outline-none focus:ring-2 focus:ring-[#F2BE22]"
          />
        </div>

        {loadError && (
          <div className="mb-4 rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 text-[#B3492B] text-sm px-4 py-3">
            {loadError}
          </div>
        )}

        {/* Table — desktop */}
        <div className="hidden md:block bg-white rounded-2xl border border-[#D9E8D5] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1B5E2C] text-[#FAFAF5] text-left">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="border-t border-[#EFF4ED]">
                    <td className="px-5 py-4" colSpan={4}>
                      <div className="h-4 w-full max-w-xs rounded bg-[#EFF4ED] animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-10 text-center text-[#86A18A]"
                  >
                    No staff accounts found.
                  </td>
                </tr>
              ) : (
                filtered.map((member) => (
                  <tr
                    key={member.staff_id}
                    className="border-t border-[#EFF4ED] hover:bg-[#FAFAF5] transition-colors"
                  >
                    <td className="px-5 py-3.5 text-[#1B5E2C] font-medium">
                      {member.full_name}
                    </td>
                    <td className="px-5 py-3.5 text-[#5B6478]">
                      {member.email}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleToggleStatus(member)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          member.status === "Active"
                            ? "bg-[#1B5E2C]/10 text-[#1B5E2C]"
                            : "bg-[#86A18A]/15 text-[#5B6478]"
                        }`}
                        title="Click to toggle status"
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            member.status === "Active"
                              ? "bg-[#1B5E2C]"
                              : "bg-[#86A18A]"
                          }`}
                        />
                        {member.status || "Active"}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => {
                          setActiveStaff(member);
                          setModalMode("edit");
                        }}
                        className="text-[#8C6B12] hover:text-[#6E5410] text-sm font-medium mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDelete(member)}
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

        {/* Cards — mobile */}
        <div className="md:hidden space-y-3">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-[#D9E8D5] p-4"
              >
                <div className="h-4 w-2/3 rounded bg-[#EFF4ED] animate-pulse mb-2" />
                <div className="h-3 w-1/2 rounded bg-[#EFF4ED] animate-pulse" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#D9E8D5] p-8 text-center text-[#86A18A] text-sm">
              No staff accounts found.
            </div>
          ) : (
            filtered.map((member) => (
              <div
                key={member.staff_id}
                className="bg-white rounded-xl border border-[#D9E8D5] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[#1B5E2C] font-medium truncate">
                      {member.full_name}
                    </p>
                    <p className="text-[#5B6478] text-sm truncate">
                      {member.email}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleStatus(member)}
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      member.status === "Active"
                        ? "bg-[#1B5E2C]/10 text-[#1B5E2C]"
                        : "bg-[#86A18A]/15 text-[#5B6478]"
                    }`}
                  >
                    {member.status || "Active"}
                  </button>
                </div>
                <div className="flex gap-4 mt-3 pt-3 border-t border-[#EFF4ED]">
                  <button
                    onClick={() => {
                      setActiveStaff(member);
                      setModalMode("edit");
                    }}
                    className="text-[#8C6B12] text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmDelete(member)}
                    className="text-[#B3492B] text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {modalMode && (
        <StaffFormModal
          mode={modalMode}
          staffMember={activeStaff}
          apiBase={API_BASE}
          onClose={() => setModalMode(null)}
          onSaved={(message) => {
            setModalMode(null);
            setToast({ type: "success", text: message });
            loadStaff();
          }}
          onError={(message) => setToast({ type: "error", text: message })}
        />
      )}

      {confirmDelete && (
        <ConfirmDeleteModal
          staffMember={confirmDelete}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}

      {toast && (
        <div
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm shadow-lg ${
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

function StaffFormModal({ mode, staffMember, apiBase, onClose, onSaved, onError }) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState({
    full_name: staffMember?.full_name || "",
    email: staffMember?.email || "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.full_name.trim()) next.full_name = "Full name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = "Enter a valid email address.";
    if (!isEdit && form.password.length < 8)
      next.password = "Password must be at least 8 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("full_name", form.full_name.trim());
      body.append("email", form.email.trim());

      let url;
      if (isEdit) {
        body.append("staff_id", staffMember.staff_id);
        url = `${apiBase}/update_staff.php`;
      } else {
        body.append("password", form.password);
        url = `${apiBase}/create_staff.php`;
      }

      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        body,
      });
      const text = await res.text();

      if (/error/i.test(text) || /already exists/i.test(text)) {
        onError(text || "Something went wrong.");
        setSubmitting(false);
        return;
      }

      onSaved(isEdit ? "Staff account updated." : "Staff account created.");
    } catch {
      onError("Could not reach the server.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h2
          className="text-xl text-[#1B5E2C] mb-5"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {isEdit ? "Edit Staff Account" : "Add Staff Account"}
        </h2>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">
              Full name
            </label>
            <input
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              placeholder="Juan Dela Cruz"
              className={`w-full rounded-lg border px-4 py-2.5 text-sm text-[#1B5E2C] placeholder:text-[#A8AEBC] focus:outline-none focus:ring-2 focus:ring-[#F2BE22] ${
                errors.full_name ? "border-[#B3492B]" : "border-[#CBD9C8]"
              }`}
            />
            {errors.full_name && (
              <p className="mt-1 text-xs text-[#B3492B]">{errors.full_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">
              Email address
            </label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="staff@gogonhs.edu.ph"
              className={`w-full rounded-lg border px-4 py-2.5 text-sm text-[#1B5E2C] placeholder:text-[#A8AEBC] focus:outline-none focus:ring-2 focus:ring-[#F2BE22] ${
                errors.email ? "border-[#B3492B]" : "border-[#CBD9C8]"
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-[#B3492B]">{errors.email}</p>
            )}
          </div>

          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-[#1B5E2C] mb-1.5">
                Temporary password
              </label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                className={`w-full rounded-lg border px-4 py-2.5 text-sm text-[#1B5E2C] placeholder:text-[#A8AEBC] focus:outline-none focus:ring-2 focus:ring-[#F2BE22] ${
                  errors.password ? "border-[#B3492B]" : "border-[#CBD9C8]"
                }`}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-[#B3492B]">
                  {errors.password}
                </p>
              )}
            </div>
          )}

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
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Create account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ staffMember, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl text-center">
        <h2
          className="text-xl text-[#1B5E2C] mb-2"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          Remove staff account?
        </h2>
        <p className="text-sm text-[#5B6478] mb-6">
          This will permanently delete <strong>{staffMember.full_name}</strong>'s
          account. This can't be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-[#CBD9C8] text-[#5B6478] text-sm font-medium py-2.5 hover:bg-[#FAFAF5] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-[#B3492B] text-white text-sm font-medium py-2.5 hover:bg-[#963B22] transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
