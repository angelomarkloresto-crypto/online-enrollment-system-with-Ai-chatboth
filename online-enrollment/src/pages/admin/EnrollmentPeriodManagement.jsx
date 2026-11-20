import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "../../config";
import { useNavigate } from "react-router-dom";

const ADMIN_API = apiUrl("/backend-online-enrollment/admin");
const COVERAGE_LABELS = {
  all_grade_levels: "All Grade Levels",
  shs_second_semester: "Senior High School – 2nd Semester",
};

async function requestJson(url, options = {}) {
  const response = await fetch(url, { credentials: "include", ...options });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }
  if (!response.ok || !data.success) {
    throw new Error(data.message || "The request could not be completed.");
  }
  return data;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

function availableTransitions(status) {
  if (status === "Draft") return ["Open", "Archived"];
  if (status === "Open") return ["Closed"];
  if (status === "Closed") return ["Open", "Archived"];
  return [];
}

export default function EnrollmentPeriodManagement() {
  const navigate = useNavigate();
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [schoolYear, setSchoolYear] = useState("");
  const [coverage, setCoverage] = useState("all_grade_levels");
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [toast, setToast] = useState(null);
  const submitLock = useRef(false);

  const loadPeriods = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await requestJson(`${ADMIN_API}/get_enrollment_periods.php`);
      setPeriods(Array.isArray(data.periods) ? data.periods : []);
    } catch (error) {
      setPeriods([]);
      setLoadError(error.message || "Enrollment periods could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPeriods();
  }, [loadPeriods, reloadKey]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function createPeriod(event) {
    event.preventDefault();
    if (submitLock.current) return;
    const match = /^(\d{4})-(\d{4})$/.exec(schoolYear.trim());
    if (!match || Number(match[2]) !== Number(match[1]) + 1) {
      setFormError("Enter a consecutive school year, for example 2026-2027.");
      return;
    }
    if (opensAt && closesAt && new Date(closesAt) <= new Date(opensAt)) {
      setFormError("The closing date must be after the opening date.");
      return;
    }

    submitLock.current = true;
    setSaving(true);
    setFormError("");
    try {
      const data = await requestJson(`${ADMIN_API}/create_enrollment_period.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_year: schoolYear.trim(),
          coverage,
          opens_at: opensAt,
          closes_at: closesAt,
        }),
      });
      setShowCreate(false);
      setSchoolYear("");
      setCoverage("all_grade_levels");
      setOpensAt("");
      setClosesAt("");
      setToast({ message: data.message || "Enrollment period created as Draft.", success: true });
      setReloadKey((key) => key + 1);
    } catch (error) {
      setFormError(error.message || "Enrollment period could not be created.");
    } finally {
      submitLock.current = false;
      setSaving(false);
    }
  }

  async function updateStatus() {
    if (!pendingAction || submitLock.current) return;
    submitLock.current = true;
    setUpdatingId(pendingAction.period.enrollment_period_id);
    try {
      const data = await requestJson(`${ADMIN_API}/update_enrollment_period_status.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollment_period_id: pendingAction.period.enrollment_period_id,
          status: pendingAction.status,
        }),
      });
      setPendingAction(null);
      setToast({ message: data.message || `Enrollment period ${pendingAction.status.toLowerCase()}.`, success: true });
      setReloadKey((key) => key + 1);
    } catch (error) {
      setPendingAction(null);
      setToast({ message: error.message || "Enrollment period status could not be updated.", success: false });
    } finally {
      submitLock.current = false;
      setUpdatingId(null);
    }
  }

  return (
    <div className="min-h-full min-w-0 bg-[#FAFAF5] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-6">
          <p className="mb-1 text-xs uppercase tracking-[0.15em] text-[#8C6B12]">Gogon High School</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl text-[#1B5E2C] sm:text-3xl" style={{ fontFamily: "'Fraunces', serif" }}>
                Enrollment Period Management
              </h1>
              <p className="mt-1 text-sm text-[#5B6478]">Manage school-year and semester enrollment periods.</p>
            </div>
            <button
              type="button"
              onClick={() => { setFormError(""); setShowCreate(true); }}
              className="w-fit rounded-lg bg-[#1B5E2C] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#164A22]"
            >
              Create New Enrollment Period
            </button>
          </div>
        </header>

        {toast && (
          <p role={toast.success ? "status" : "alert"} className={`mb-4 rounded-lg border px-4 py-3 text-sm ${toast.success ? "border-[#D9E8D5] bg-white text-[#1B5E2C]" : "border-[#B3492B]/30 bg-[#B3492B]/10 text-[#B3492B]"}`}>
            {toast.message}
          </p>
        )}
        {loadError && (
          <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 px-4 py-3 text-sm text-[#B3492B]">
            <span>{loadError}</span>
            <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="font-semibold underline">Retry</button>
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-[#D9E8D5] bg-white">
          <div className="border-b border-[#EFF4ED] px-4 py-4 sm:px-5">
            <h2 className="font-semibold text-[#1B5E2C]">Enrollment Periods</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1350px] text-left text-sm">
              <thead className="bg-[#1B5E2C] text-[#FAFAF5]">
                <tr>
                  <th className="px-4 py-3 font-medium">School Year</th>
                  <th className="px-4 py-3 font-medium">Enrollment Coverage</th>
                  <th className="px-4 py-3 font-medium">Semester</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Applications</th>
                  <th className="px-4 py-3 font-medium">Enrolled Students</th>
                  <th className="px-4 py-3 font-medium">Opens At</th>
                  <th className="px-4 py-3 font-medium">Closes At</th>
                  <th className="px-4 py-3 font-medium">Date Created</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-[#5B6478]">Loading enrollment periods…</td></tr>
                ) : loadError ? (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-[#5B6478]">Enrollment periods could not be loaded.</td></tr>
                ) : periods.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-[#5B6478]">No enrollment periods have been created.</td></tr>
                ) : periods.map((period) => (
                  <tr key={period.enrollment_period_id} className="border-t border-[#EFF4ED]">
                    <td className="px-4 py-3.5 font-medium text-[#1B5E2C]">{period.school_year}</td>
                    <td className="px-4 py-3.5 text-[#5B6478]">{COVERAGE_LABELS[period.coverage] || period.coverage}</td>
                    <td className="px-4 py-3.5 text-[#5B6478]">{period.semester || "—"}</td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-full bg-[#EFF4ED] px-2.5 py-1 text-xs font-medium text-[#1B5E2C]">{period.status}</span>
                    </td>
                    <td className="px-4 py-3.5 text-[#5B6478]">{period.application_attempts ?? 0}</td>
                    <td className="px-4 py-3.5 text-[#5B6478]">{period.enrolled_students ?? 0}</td>
                    <td className="px-4 py-3.5 text-[#5B6478]">{formatDate(period.opens_at)}</td>
                    <td className="px-4 py-3.5 text-[#5B6478]">{formatDate(period.closes_at)}</td>
                    <td className="px-4 py-3.5 text-[#5B6478]">{formatDate(period.created_at)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/student-records?period_id=${encodeURIComponent(period.enrollment_period_id)}`)}
                          className="rounded-lg border border-[#CBD9C8] px-3 py-2 text-xs font-medium text-[#1B5E2C] hover:bg-[#EFF4ED]"
                        >
                          View
                        </button>
                        {availableTransitions(period.status).map((status) => (
                          <button
                            key={status}
                            type="button"
                            disabled={updatingId === period.enrollment_period_id}
                            onClick={() => setPendingAction({ period, status })}
                            className="rounded-lg bg-[#1B5E2C] px-3 py-2 text-xs font-medium text-white hover:bg-[#164A22] disabled:opacity-60"
                          >
                            {updatingId === period.enrollment_period_id ? "Saving…" : status === "Archived" ? "Archive" : status === "Closed" ? "Close" : status}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        {!loading && !loadError && periods.length > 0 && (
          <p className="mt-3 text-xs text-[#5B6478]">
            New periods are created as Draft. Archived periods cannot be reopened or deleted.
          </p>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="create-period-title" className="my-auto w-full max-w-xl rounded-2xl bg-white shadow-xl">
            <div className="border-b border-[#D9E8D5] px-5 py-4">
              <h2 id="create-period-title" className="text-lg font-semibold text-[#1B5E2C]">Create New Enrollment Period</h2>
              <p className="mt-1 text-sm text-[#5B6478]">The new period will remain Draft until you open it.</p>
            </div>
            <form onSubmit={createPeriod} className="space-y-4 p-5">
              {formError && <p role="alert" className="rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 px-3 py-2.5 text-sm text-[#B3492B]">{formError}</p>}
              <label className="block text-sm font-medium text-[#1B5E2C]">
                School Year
                <input
                  required
                  value={schoolYear}
                  onChange={(event) => setSchoolYear(event.target.value)}
                  placeholder="2026-2027"
                  pattern="\d{4}-\d{4}"
                  className="mt-1.5 w-full rounded-lg border border-[#CBD9C8] px-3 py-2.5 outline-none focus:border-[#1B5E2C]"
                />
              </label>
              <label className="block text-sm font-medium text-[#1B5E2C]">
                Enrollment Coverage
                <select value={coverage} onChange={(event) => setCoverage(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#CBD9C8] bg-white px-3 py-2.5 outline-none focus:border-[#1B5E2C]">
                  <option value="all_grade_levels">All Grade Levels</option>
                  <option value="shs_second_semester">Senior High School – 2nd Semester</option>
                </select>
              </label>
              <p className="rounded-lg bg-[#EFF4ED] px-3 py-2.5 text-sm text-[#5B6478]">
                Semester: <span className="font-medium text-[#1B5E2C]">{coverage === "shs_second_semester" ? "2nd sem" : "1st sem"}</span>
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-[#1B5E2C]">
                  Opens At (optional)
                  <input type="datetime-local" value={opensAt} onChange={(event) => setOpensAt(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#CBD9C8] px-3 py-2.5 outline-none focus:border-[#1B5E2C]" />
                </label>
                <label className="block text-sm font-medium text-[#1B5E2C]">
                  Closes At (optional)
                  <input type="datetime-local" value={closesAt} onChange={(event) => setClosesAt(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#CBD9C8] px-3 py-2.5 outline-none focus:border-[#1B5E2C]" />
                </label>
              </div>
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowCreate(false)} disabled={saving} className="rounded-lg border border-[#CBD9C8] px-4 py-2.5 text-sm text-[#1B5E2C] disabled:opacity-60">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-[#1B5E2C] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">{saving ? "Creating…" : "Create Enrollment Period"}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="period-action-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 id="period-action-title" className="text-lg font-semibold text-[#1B5E2C]">Confirm {pendingAction.status === "Archived" ? "Archive" : pendingAction.status}</h2>
            <p className="mt-2 text-sm text-[#5B6478]">
              {pendingAction.status === "Open"
                ? "Open this enrollment period for eligible students?"
                : pendingAction.status === "Closed"
                  ? "Close this period? Students will no longer be able to submit or resubmit applications."
                  : "Archive this period? It will remain available as read-only history."}
            </p>
            <p className="mt-2 text-sm font-medium text-[#1B5E2C]">
              {pendingAction.period.school_year} · {COVERAGE_LABELS[pendingAction.period.coverage] || pendingAction.period.coverage}
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setPendingAction(null)} disabled={updatingId !== null} className="rounded-lg border border-[#CBD9C8] px-4 py-2.5 text-sm text-[#1B5E2C] disabled:opacity-60">Cancel</button>
              <button type="button" onClick={updateStatus} disabled={updatingId !== null} className="rounded-lg bg-[#1B5E2C] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">{updatingId !== null ? "Saving…" : `Confirm ${pendingAction.status === "Archived" ? "Archive" : pendingAction.status}`}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
