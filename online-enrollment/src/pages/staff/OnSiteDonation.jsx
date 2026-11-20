import { useEffect, useMemo, useRef, useState } from "react";
import { apiUrl } from "../../config";

const API_BASE = apiUrl("/backend-online-enrollment/staff");
const INPUT_CLASS =
  "mt-1.5 w-full rounded-lg border border-[#CBD9C8] bg-white px-3 py-2.5 text-sm text-[#1B5E2C] outline-none focus:border-[#1B5E2C] focus:ring-1 focus:ring-[#1B5E2C] disabled:bg-[#FAFAF5]";
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function getErrorMessage(data, fallback) {
  return typeof data?.message === "string" && data.message.trim()
    ? data.message
    : fallback;
}

function getImageUrl(imageUrl, itemDonationId) {
  if (imageUrl) {
    if (/^(?:https?:)?\/\//i.test(imageUrl)) return imageUrl;
    const route = imageUrl.replace(/^\/+/, "");
    return apiUrl(
      route.startsWith("backend-online-enrollment/")
        ? `/${route}`
        : `/backend-online-enrollment/${route}`,
    );
  }
  return `${API_BASE}/get_on_site_item_donation_image.php?item_donation_id=${encodeURIComponent(itemDonationId)}`;
}

function formatRecordedAt(value) {
  if (!value) return "—";
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

export default function OnSiteDonation() {
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [grade, setGrade] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [gradesLoading, setGradesLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [donations, setDonations] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [donationsLoading, setDonationsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [donationLoadError, setDonationLoadError] = useState("");
  const [notice, setNotice] = useState(null);
  const [activeStudent, setActiveStudent] = useState(null);
  const [itemName, setItemName] = useState("");
  const [itemImage, setItemImage] = useState(null);
  const [itemImageError, setItemImageError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const sectionsForGrade = useMemo(
    () => sections.filter((section) => String(section.grade_level) === grade),
    [sections, grade],
  );
  const studentsByLrn = useMemo(
    () => new Map(students.map((student) => [String(student.lrn), student])),
    [students],
  );

  useEffect(() => {
    if (!itemImage) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(itemImage);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [itemImage]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadGrades() {
      setGradesLoading(true);
      setLoadError("");
      try {
        const response = await fetch(`${API_BASE}/get_on_site_grades.php`, {
          credentials: "include",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          setLoadError(getErrorMessage(data, "Could not load available grade levels."));
          return;
        }
        setGrades((data.grades ?? []).map(String));
      } catch (error) {
        if (error.name !== "AbortError") setLoadError("Could not reach the server to load grade levels.");
      } finally {
        if (!controller.signal.aborted) setGradesLoading(false);
      }
    }
    loadGrades();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setSectionId("");
    setStudents([]);
    setDonations([]);
    setLoadError("");
    setDonationLoadError("");
    if (!grade) {
      setSections([]);
      setSectionsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    async function loadSections() {
      setSectionsLoading(true);
      try {
        const params = new URLSearchParams({ grade_level: grade });
        const response = await fetch(`${API_BASE}/get_on_site_sections.php?${params}`, {
          credentials: "include",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          setSections([]);
          setLoadError(getErrorMessage(data, "Could not load sections for this grade."));
          return;
        }
        setSections(data.sections ?? []);
      } catch (error) {
        if (error.name !== "AbortError") {
          setSections([]);
          setLoadError("Could not reach the server to load sections.");
        }
      } finally {
        if (!controller.signal.aborted) setSectionsLoading(false);
      }
    }
    loadSections();
    return () => controller.abort();
  }, [grade]);

  useEffect(() => {
    setStudents([]);
    setDonations([]);
    setLoadError("");
    setDonationLoadError("");
    if (!grade || !sectionId) {
      setStudentsLoading(false);
      setDonationsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    async function loadSectionData() {
      setStudentsLoading(true);
      setDonationsLoading(true);
      const params = new URLSearchParams({ grade_level: grade, section_id: sectionId });
      const donationParams = new URLSearchParams({ section_id: sectionId });
      const [studentsResult, donationsResult] = await Promise.allSettled([
        fetch(`${API_BASE}/get_on_site_students.php?${params}`, {
          credentials: "include",
          signal: controller.signal,
        }).then(async (response) => ({ response, data: await response.json() })),
        fetch(`${API_BASE}/get_on_site_item_donations.php?${donationParams}`, {
          credentials: "include",
          signal: controller.signal,
        }).then(async (response) => ({ response, data: await response.json() })),
      ]);

      if (controller.signal.aborted) return;
      if (studentsResult.status === "fulfilled" && studentsResult.value.response.ok && studentsResult.value.data.success) {
        setStudents(studentsResult.value.data.students ?? []);
      } else if (studentsResult.status === "rejected" && studentsResult.reason?.name === "AbortError") {
        return;
      } else {
        setLoadError(studentsResult.status === "fulfilled"
          ? getErrorMessage(studentsResult.value.data, "Could not load students for this section.")
          : "Could not reach the server to load students.");
      }
      if (donationsResult.status === "fulfilled" && donationsResult.value.response.ok && donationsResult.value.data.success) {
        setDonations(donationsResult.value.data.donations ?? []);
      } else if (donationsResult.status === "rejected" && donationsResult.reason?.name === "AbortError") {
        return;
      } else {
        setDonationLoadError(donationsResult.status === "fulfilled"
          ? getErrorMessage(donationsResult.value.data, "Could not load physical donation records.")
          : "Could not reach the server to load physical donation records.");
      }
      setStudentsLoading(false);
      setDonationsLoading(false);
    }
    loadSectionData();
    return () => controller.abort();
  }, [grade, sectionId, refreshKey]);

  function chooseGrade(event) {
    setGrade(event.target.value);
    setSectionId("");
    setSections([]);
    setStudents([]);
    setDonations([]);
    setNotice(null);
  }

  function chooseSection(event) {
    setSectionId(event.target.value);
    setStudents([]);
    setDonations([]);
    setNotice(null);
  }

  function closeModal() {
    setActiveStudent(null);
    setItemName("");
    setItemImage(null);
    setItemImageError("");
    setFormError("");
  }

  function selectImage(event) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    setItemImageError("");
    setFormError("");
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setItemImageError("Choose a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setItemImageError("The image must be 5 MB or smaller.");
      return;
    }
    setItemImage(file);
  }

  async function saveDonation(event) {
    event.preventDefault();
    if (savingRef.current) return;
    if (!activeStudent) return;
    if (!itemName.trim()) {
      setFormError("Enter the donated item name.");
      return;
    }
    if (itemImageError) return;

    savingRef.current = true;
    setSaving(true);
    setFormError("");
    const body = new FormData();
    body.append("lrn", String(activeStudent.lrn));
    body.append("enrollment_id", String(activeStudent.enrollment_id));
    body.append("grade_level", String(activeStudent.grade_level ?? grade));
    body.append("section_id", String(sectionId));
    body.append("item_name", itemName.trim());
    if (itemImage) body.append("item_image", itemImage);

    try {
      const response = await fetch(`${API_BASE}/create_on_site_item_donation.php`, {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setFormError(getErrorMessage(data, "Could not save this donation."));
        return;
      }
      closeModal();
      setNotice({ type: "success", text: data.message ?? "Physical item donation recorded successfully." });
      setRefreshKey((key) => key + 1);
    } catch {
      setFormError("Could not reach the server. Please try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 px-4 py-6 sm:px-6">
      <header>
        <p className="mb-1 text-xs uppercase tracking-[0.15em] text-[#8C6B12]">Staff Portal</p>
        <h2 className="text-xl text-[#1B5E2C] sm:text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>
          On-Site Donations
        </h2>
        <p className="mt-1 text-sm text-[#86A18A]">Record physical donated items for online and on-site students. GCash donations are managed separately.</p>
      </header>

      {notice && (
        <p role={notice.type === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${notice.type === "success" ? "border-[#1B5E2C]/30 bg-[#1B5E2C]/10 text-[#1B5E2C]" : "border-[#B3492B]/30 bg-[#B3492B]/10 text-[#B3492B]"}`}>
          {notice.text}
        </p>
      )}

      <section className="grid gap-4 rounded-2xl border border-[#D9E8D5] bg-white p-4 sm:grid-cols-2 sm:p-5">
        <label className="block text-sm font-medium text-[#1B5E2C]">
          Grade level
          <select className={INPUT_CLASS} value={grade} onChange={chooseGrade} disabled={gradesLoading}>
            <option value="">{gradesLoading ? "Loading grades…" : "Select grade"}</option>
            {grades.map((item) => <option key={item} value={item}>Grade {item}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-[#1B5E2C]">
          Section
          <select className={INPUT_CLASS} value={sectionId} onChange={chooseSection} disabled={!grade || sectionsLoading}>
            <option value="">{sectionsLoading ? "Loading sections…" : "Select section"}</option>
            {sectionsForGrade.map((section) => (
              <option key={section.section_id} value={section.section_id}>{section.section_name}</option>
            ))}
          </select>
        </label>
        {loadError && <p role="alert" className="sm:col-span-2 text-sm text-[#B3492B]">{loadError}</p>}
      </section>

      {sectionId && (
        <>
          <section className="overflow-hidden rounded-2xl border border-[#D9E8D5] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9E8D5] px-4 py-3 sm:px-5">
              <h3 className="font-semibold text-[#1B5E2C]">
                Students — Grade {grade}, {sectionsForGrade.find((section) => String(section.section_id) === sectionId)?.section_name ?? "Selected section"}
              </h3>
              <button
                type="button"
                onClick={() => setRefreshKey((key) => key + 1)}
                disabled={studentsLoading || donationsLoading}
                className="rounded-lg border border-[#CBD9C8] px-3 py-2 text-xs font-medium text-[#1B5E2C] transition-colors hover:bg-[#F4F7F1] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {studentsLoading || donationsLoading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-[#1B5E2C] text-[#FAFAF5]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Student Name</th>
                    <th className="px-4 py-3 font-medium">LRN</th>
                    <th className="px-4 py-3 font-medium">Grade</th>
                    <th className="px-4 py-3 font-medium">Section</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsLoading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-[#86A18A]">Loading students…</td></tr>
                  ) : loadError ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-[#B3492B]">Student list could not be loaded.</td></tr>
                  ) : students.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-[#86A18A]">No students found for this section.</td></tr>
                  ) : students.map((student) => (
                    <tr key={student.enrollment_id} className="border-t border-[#EFF4ED]">
                      <td className="px-4 py-3 font-medium text-[#1B5E2C]">{student.student_name || "—"}</td>
                      <td className="px-4 py-3 text-[#5B6478]">{student.lrn || "—"}</td>
                      <td className="px-4 py-3 text-[#5B6478]">Grade {student.grade_level ?? grade}</td>
                      <td className="px-4 py-3 text-[#5B6478]">{sectionsForGrade.find((section) => String(section.section_id) === sectionId)?.section_name ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => setActiveStudent(student)} className="rounded-lg bg-[#1B5E2C] px-3 py-2 text-xs font-medium text-white hover:bg-[#164A22]">
                          Donate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#D9E8D5] bg-white">
            <div className="border-b border-[#D9E8D5] px-4 py-3 sm:px-5">
              <h3 className="font-semibold text-[#1B5E2C]">Physical donation records</h3>
              <p className="mt-1 text-sm text-[#86A18A]">Records for the selected section only.</p>
            </div>
            {donationLoadError && <p role="alert" className="m-4 rounded-lg bg-[#B3492B]/10 px-4 py-3 text-sm text-[#B3492B]">{donationLoadError}</p>}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#1B5E2C] text-[#FAFAF5]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Student Name</th>
                    <th className="px-4 py-3 font-medium">Donated Item</th>
                    <th className="px-4 py-3 font-medium">Picture</th>
                    <th className="px-4 py-3 font-medium">Date and Time</th>
                    <th className="px-4 py-3 font-medium">Recorded By</th>
                  </tr>
                </thead>
                <tbody>
                  {donationsLoading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-[#86A18A]">Loading donation records…</td></tr>
                  ) : donations.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-[#86A18A]">{donationLoadError ? "Donation records could not be loaded." : "No physical item donations recorded for this section."}</td></tr>
                  ) : donations.map((donation) => {
                    const student = studentsByLrn.get(String(donation.lrn));
                    return (
                      <tr key={donation.item_donation_id} className="border-t border-[#EFF4ED]">
                        <td className="px-4 py-3 font-medium text-[#1B5E2C]">{student?.student_name ?? donation.lrn ?? "—"}</td>
                        <td className="px-4 py-3 text-[#5B6478]">{donation.item_name}</td>
                        <td className="px-4 py-3">
                          {donation.item_image_url || donation.item_image ? (
                            <a href={getImageUrl(donation.item_image_url, donation.item_donation_id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[#1B5E2C] hover:underline">
                              <img src={getImageUrl(donation.item_image_url, donation.item_donation_id)} alt={`${donation.item_name} donation`} loading="lazy" className="h-12 w-16 rounded border border-[#D9E8D5] bg-[#FAFAF5] object-cover" />
                              <span className="sr-only">View image</span>
                            </a>
                          ) : <span className="text-[#86A18A]">No image</span>}
                        </td>
                        <td className="px-4 py-3 text-[#5B6478]">{formatRecordedAt(donation.recorded_at)}</td>
                        <td className="px-4 py-3 text-[#5B6478]">{donation.recorded_by || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {activeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) closeModal();
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="donation-modal-title" className="my-auto w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="border-b border-[#D9E8D5] px-5 py-4">
              <h3 id="donation-modal-title" className="text-lg font-semibold text-[#1B5E2C]">Record Physical Donation</h3>
              <p className="mt-1 text-sm text-[#5B6478]">Donation for <span className="font-semibold text-[#1B5E2C]">{activeStudent.student_name || activeStudent.lrn}</span></p>
            </div>
            <form onSubmit={saveDonation} className="space-y-4 p-5">
              {formError && <p role="alert" className="rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 px-3 py-2.5 text-sm text-[#B3492B]">{formError}</p>}
              <label className="block text-sm font-medium text-[#1B5E2C]">
                Donated item name *
                <input className={INPUT_CLASS} value={itemName} onChange={(event) => {
                  setItemName(event.target.value);
                  setFormError("");
                }} maxLength={255} placeholder="e.g. Floor Wax, Electric Fan, Broom" autoFocus />
              </label>
              <label className="block text-sm font-medium text-[#1B5E2C]">
                Item picture (optional)
                <input className="mt-1.5 block w-full text-sm text-[#5B6478] file:mr-3 file:rounded-lg file:border-0 file:bg-[#1B5E2C] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#164A22]" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={selectImage} />
                <span className="mt-1 block text-xs font-normal text-[#86A18A]">JPG, PNG, or WEBP · maximum 5 MB</span>
                {itemImageError && <span role="alert" className="mt-1 block text-xs font-normal text-[#B3492B]">{itemImageError}</span>}
              </label>
              {previewUrl && itemImage && (
                <div className="rounded-lg border border-[#D9E8D5] bg-[#FAFAF5] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-medium text-[#5B6478]">{itemImage.name}</span>
                    <button type="button" onClick={() => {
                      setItemImage(null);
                      setItemImageError("");
                    }} className="text-xs font-medium text-[#B3492B] hover:underline">
                      Remove image
                    </button>
                  </div>
                  <img src={previewUrl} alt="Selected donation item preview" className="mt-2 max-h-56 w-full rounded-lg object-contain" />
                </div>
              )}
              <div className="flex justify-end gap-3 border-t border-[#D9E8D5] pt-4">
                <button type="button" onClick={closeModal} disabled={saving} className="rounded-lg border border-[#CBD9C8] px-4 py-2.5 text-sm font-medium text-[#1B5E2C] hover:bg-[#FAFAF5] disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="rounded-lg bg-[#1B5E2C] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#164A22] disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? "Saving…" : "Save Donation"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
