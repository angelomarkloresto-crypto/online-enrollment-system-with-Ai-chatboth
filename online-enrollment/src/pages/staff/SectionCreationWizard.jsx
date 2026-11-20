import { useRef, useState } from "react";
import { apiUrl } from "../../config";

const API_BASE = apiUrl("/backend-online-enrollment/staff");
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MAX_SUBJECTS = 20;
const MIN_REASONABLE_PERIOD_MINUTES = 15;

const GRADE_LEVELS = [
  { value: "7", label: "Grade 7", type: "JHS" },
  { value: "8", label: "Grade 8", type: "JHS" },
  { value: "9", label: "Grade 9", type: "JHS" },
  { value: "10", label: "Grade 10", type: "JHS" },
  { value: "11", label: "Grade 11", type: "SHS" },
  { value: "12", label: "Grade 12", type: "SHS" },
];

const BREAKS = [
  ["morning", "Morning Break"],
  ["lunch", "Lunch Break"],
  ["afternoon", "Afternoon Break"],
];
const emptySection = (index) => ({ section_name: `Section ${index + 1}` });
const emptyTimetable = {
  schedule_type: "morning",
  school_start_time: "",
  school_end_time: "",
  morning_break_start: "",
  morning_break_end: "",
  lunch_break_start: "",
  lunch_break_end: "",
  afternoon_break_start: "",
  afternoon_break_end: "",
  selected_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  total_subjects: "",
};

function toMinutes(value) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value || "")) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function toTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function generatePeriods(timetable, subjects) {
  const start = toMinutes(timetable.school_start_time);
  const end = toMinutes(timetable.school_end_time);
  const breaks = BREAKS
    .map(([name]) => ({
      name,
      start: toMinutes(timetable[`${name}_break_start`]),
      end: toMinutes(timetable[`${name}_break_end`]),
    }))
    .filter((item) => item.start !== null && item.end !== null)
    .sort((left, right) => left.start - right.start);

  const segments = [];
  let cursor = start;
  breaks.forEach((breakTime) => {
    if (cursor < breakTime.start) segments.push({ start: cursor, end: breakTime.start });
    cursor = breakTime.end;
  });
  if (cursor < end) segments.push({ start: cursor, end });

  const subjectCount = subjects.length;
  if (segments.length === 0 || segments.length > subjectCount) {
    return { error: "The subject count is too small to schedule at least one subject in every instructional period between breaks." };
  }
  const availableMinutes = segments.reduce((total, segment) => total + segment.end - segment.start, 0);
  if (availableMinutes < subjectCount) {
    return { error: "There is not enough instructional time for the configured subject count." };
  }

  const subjectsPerSegment = Array(segments.length).fill(1);
  for (let remaining = subjectCount - segments.length; remaining > 0; remaining -= 1) {
    let selectedSegment = 0;
    let largestPeriod = -1;
    segments.forEach((segment, index) => {
      const periodLength = (segment.end - segment.start) / subjectsPerSegment[index];
      if (periodLength > largestPeriod) {
        largestPeriod = periodLength;
        selectedSegment = index;
      }
    });
    subjectsPerSegment[selectedSegment] += 1;
  }

  const periods = [];
  let subjectIndex = 0;
  segments.forEach((segment, segmentIndex) => {
    const segmentMinutes = segment.end - segment.start;
    const periodCount = subjectsPerSegment[segmentIndex];
    const baseDuration = Math.floor(segmentMinutes / periodCount);
    const extraMinutes = segmentMinutes % periodCount;
    let periodStart = segment.start;
    for (let index = 0; index < periodCount; index += 1) {
      const duration = baseDuration + (index < extraMinutes ? 1 : 0);
      periods.push({
        subject_name: subjects[subjectIndex],
        start_time: toTime(periodStart),
        end_time: toTime(periodStart + duration),
        duration,
      });
      periodStart += duration;
      subjectIndex += 1;
    }
  });

  if (periods.some((period) => period.duration < MIN_REASONABLE_PERIOD_MINUTES)) {
    return {
      periods,
      error: `This configuration creates a subject period shorter than ${MIN_REASONABLE_PERIOD_MINUTES} minutes. Adjust school hours, breaks, or the subject count.`,
    };
  }
  return { periods };
}

function validateTimetable(timetable) {
  const errors = {};
  const start = toMinutes(timetable.school_start_time);
  const end = toMinutes(timetable.school_end_time);
  if (start === null) errors.school_start_time = "Enter a valid school start time.";
  if (end === null) errors.school_end_time = "Enter a valid school end time.";
  if (start !== null && end !== null && start >= end) {
    errors.school_end_time = "School end time must be after start time.";
  }
  if (!timetable.selected_days.length) errors.selected_days = "Select at least one school day.";

  const requiredBreaks = timetable.schedule_type === "whole_day"
    ? ["morning", "lunch"]
    : [timetable.schedule_type === "morning" ? "morning" : "afternoon"];
  const enabledBreaks = [];
  BREAKS.forEach(([name, label]) => {
    const breakStart = timetable[`${name}_break_start`];
    const breakEnd = timetable[`${name}_break_end`];
    const required = requiredBreaks.includes(name);
    if (required && !breakStart && !breakEnd) {
      errors[`${name}_break_start`] = `${label} start time is required.`;
      errors[`${name}_break_end`] = `${label} end time is required.`;
      return;
    }
    if (!breakStart && !breakEnd) return;
    if (!breakStart) errors[`${name}_break_start`] = `${label} start time is required.`;
    if (!breakEnd) errors[`${name}_break_end`] = `${label} end time is required.`;
    const breakStartMinutes = toMinutes(breakStart);
    const breakEndMinutes = toMinutes(breakEnd);
    if (breakStart && breakStartMinutes === null) errors[`${name}_break_start`] = "Enter a valid time.";
    if (breakEnd && breakEndMinutes === null) errors[`${name}_break_end`] = "Enter a valid time.";
    if (breakStartMinutes !== null && breakEndMinutes !== null) {
      if (breakStartMinutes >= breakEndMinutes) {
        errors[`${name}_break_end`] = "Break end time must be after start time.";
      } else {
        if (start !== null && breakStartMinutes < start) {
          errors[`${name}_break_start`] = "Breaks must be inside school hours.";
        }
        if (end !== null && breakEndMinutes > end) {
          errors[`${name}_break_end`] = "Breaks must be inside school hours.";
        }
        enabledBreaks.push({ name, label, start: breakStartMinutes, end: breakEndMinutes });
      }
    }
  });

  enabledBreaks.sort((left, right) => left.start - right.start);
  enabledBreaks.forEach((current, index) => {
    if (index > 0 && current.start < enabledBreaks[index - 1].end) {
      errors[`${current.name}_break_start`] = `${current.label} overlaps another break.`;
      errors[`${enabledBreaks[index - 1].name}_break_end`] = `${enabledBreaks[index - 1].label} overlaps another break.`;
    }
  });

  const totalSubjects = Number(timetable.total_subjects);
  if (!Number.isInteger(totalSubjects) || totalSubjects < 1 || totalSubjects > MAX_SUBJECTS) {
    errors.total_subjects = `Enter a whole number from 1 to ${MAX_SUBJECTS}.`;
  }
  return errors;
}

export default function SectionCreationWizard({ strands, existingSections, onClose, onSaved, onError }) {
  const [step, setStep] = useState(0);
  const [setup, setSetup] = useState({
    grade_level: "7",
    strand_id: "",
    max_capacity: "",
    number_of_sections: "1",
  });
  const [sections, setSections] = useState([]);
  const [timetable, setTimetable] = useState(emptyTimetable);
  const [subjects, setSubjects] = useState([]);
  const [setupErrors, setSetupErrors] = useState({});
  const [nameErrors, setNameErrors] = useState([]);
  const [timetableErrors, setTimetableErrors] = useState({});
  const [subjectErrors, setSubjectErrors] = useState([]);
  const [generationError, setGenerationError] = useState("");
  const [periods, setPeriods] = useState([]);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const isSHS = ["11", "12"].includes(String(setup.grade_level));
  const gradeLabel = GRADE_LEVELS.find((grade) => grade.value === String(setup.grade_level))?.label;
  const steps = ["Name Sections", "Grade Timetable", "Add Subjects", "Timetable Preview", "Review and Save"];

  function handleSetupChange(event) {
    const { name, value } = event.target;
    setSetup((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "grade_level" && !["11", "12"].includes(value) ? { strand_id: "" } : {}),
    }));
    setSetupErrors((previous) => ({ ...previous, [name]: "" }));
  }

  function startWizard(event) {
    event.preventDefault();
    const errors = {};
    const count = Number(setup.number_of_sections);
    if (!Number.isInteger(count) || count < 1) errors.number_of_sections = "Enter a positive whole number of sections.";
    if (!Number.isInteger(Number(setup.max_capacity)) || Number(setup.max_capacity) < 1) {
      errors.max_capacity = "Enter a valid section capacity.";
    }
    if (isSHS && !setup.strand_id) errors.strand_id = "Select a strand for SHS sections.";
    setSetupErrors(errors);
    if (Object.keys(errors).length) return;
    setSections(Array.from({ length: count }, (_, index) => sections[index] ?? emptySection(index)));
    setNameErrors(Array.from({ length: count }, () => ""));
    setStep(1);
  }

  function updateSectionName(index, section_name) {
    setSections((previous) => previous.map((section, sectionIndex) =>
      sectionIndex === index ? { ...section, section_name } : section
    ));
    setNameErrors((previous) => previous.map(() => ""));
  }

  function validateNames() {
    const errors = sections.map(() => "");
    const names = new Map();
    const gradeSections = existingSections.filter(
      (section) => String(section.grade_level) === String(setup.grade_level)
    );
    sections.forEach((section, index) => {
      const name = section.section_name.trim();
      const key = name.toLocaleLowerCase();
      if (!name) errors[index] = "Section name is required.";
      else if (name.length > 255) errors[index] = "Section names must be 255 characters or fewer.";
      else if (gradeSections.some((existing) => existing.section_name.trim().toLocaleLowerCase() === key)) {
        errors[index] = "This name already exists for the selected grade.";
      } else if (names.has(key)) errors[index] = `Duplicate name; it is also used for Section ${names.get(key) + 1}.`;
      else names.set(key, index);
    });
    setNameErrors(errors);
    return errors.every((error) => !error);
  }

  function changeTimetable(name, value) {
    setTimetable((previous) => ({ ...previous, [name]: value }));
    setTimetableErrors((previous) => ({ ...previous, [name]: "" }));
    setGenerationError("");
  }

  function changeScheduleType(scheduleType) {
    setTimetable((previous) => ({
      ...previous,
      schedule_type: scheduleType,
      ...(scheduleType === "morning" ? {
        lunch_break_start: "",
        lunch_break_end: "",
        afternoon_break_start: "",
        afternoon_break_end: "",
      } : {}),
      ...(scheduleType === "afternoon" ? {
        morning_break_start: "",
        morning_break_end: "",
        lunch_break_start: "",
        lunch_break_end: "",
      } : {}),
    }));
    setTimetableErrors({});
    setGenerationError("");
  }

  function validateSchedule() {
    const errors = validateTimetable(timetable);
    if (Object.keys(errors).length === 0) {
      const preview = generatePeriods(timetable, Array.from({ length: Number(timetable.total_subjects) }, (_, index) => `Subject ${index + 1}`));
      if (preview.error) errors.generation = preview.error;
    }
    setTimetableErrors(errors);
    setGenerationError(errors.generation ?? "");
    return Object.keys(errors).length === 0;
  }

  function changeSubject(index, value) {
    setSubjects((previous) => previous.map((subject, subjectIndex) => subjectIndex === index ? value : subject));
    setSubjectErrors((previous) => previous.map(() => ""));
    setGenerationError("");
  }

  function validateSubjects() {
    const errors = subjects.map(() => "");
    const names = new Map();
    subjects.forEach((subject, index) => {
      const name = subject.trim();
      const key = name.toLocaleLowerCase();
      if (!name) errors[index] = "Subject name is required.";
      else if (name.length > 255) errors[index] = "Subject names must be 255 characters or fewer.";
      else if (names.has(key)) errors[index] = `Duplicate subject; it is also used for Subject ${names.get(key) + 1}.`;
      else names.set(key, index);
    });
    setSubjectErrors(errors);
    return errors.every((error) => !error);
  }

  function goToTimetable() {
    if (validateNames()) setStep(2);
  }

  function goToSubjects() {
    if (!validateSchedule()) return;
    const count = Number(timetable.total_subjects);
    setSubjects((previous) => Array.from({ length: count }, (_, index) => previous[index] ?? ""));
    setSubjectErrors(Array.from({ length: count }, () => ""));
    setStep(3);
  }

  function generatePreview() {
    if (!validateSubjects()) return;
    const result = generatePeriods(timetable, subjects.map((subject) => subject.trim()));
    if (result.error) {
      setGenerationError(result.error);
      setStep(2);
      return;
    }
    setPeriods(result.periods);
    setGenerationError("");
    setStep(4);
  }

  function validateAll() {
    const namesValid = validateNames();
    const scheduleValid = validateSchedule();
    const subjectsValid = validateSubjects();
    if (!namesValid) {
      setStep(1);
      return false;
    }
    if (!scheduleValid) {
      setStep(2);
      return false;
    }
    if (!subjectsValid) {
      setStep(3);
      return false;
    }
    const result = generatePeriods(timetable, subjects.map((subject) => subject.trim()));
    if (result.error) {
      setGenerationError(result.error);
      setStep(2);
      return false;
    }
    setPeriods(result.periods);
    return true;
  }

  async function saveSections() {
    if (savingRef.current || !validateAll()) return;
    const payload = {
      grade_level: Number(setup.grade_level),
      number_of_sections: sections.length,
      sections: sections.map((section) => ({
        section_name: section.section_name.trim(),
        strand_id: isSHS ? Number(setup.strand_id) : null,
        max_capacity: Number(setup.max_capacity),
      })),
      grade_timetable: {
        grade_level: Number(setup.grade_level),
        schedule_type: timetable.schedule_type,
        school_start_time: timetable.school_start_time,
        school_end_time: timetable.school_end_time,
        total_subjects: Number(timetable.total_subjects),
        selected_days: timetable.selected_days,
        morning_break_start: timetable.morning_break_start || null,
        morning_break_end: timetable.morning_break_end || null,
        lunch_break_start: timetable.lunch_break_start || null,
        lunch_break_end: timetable.lunch_break_end || null,
        afternoon_break_start: timetable.afternoon_break_start || null,
        afternoon_break_end: timetable.afternoon_break_end || null,
        subjects: subjects.map((subject, index) => ({
          subject_name: subject.trim(),
          display_order: index + 1,
        })),
      },
    };

    savingRef.current = true;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/create_section.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message ?? "Sections could not be saved.");
      if (data.count !== sections.length || !Array.isArray(data.sections) || data.sections.length !== sections.length) {
        throw new Error("The server did not confirm that all sections were saved. Refresh the section list before trying again.");
      }
      if (data.timetable_applied !== true) {
        throw new Error("The server saved the sections but did not confirm that the grade-level timetable was applied. Refresh the section list before trying again.");
      }
      onSaved(`${data.count} sections created with the ${gradeLabel} timetable.`);
    } catch (error) {
      onError(error.message || "Could not reach the server.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function toggleDay(day) {
    setTimetable((previous) => ({
      ...previous,
      selected_days: previous.selected_days.includes(day)
        ? previous.selected_days.filter((selected) => selected !== day)
        : [...previous.selected_days, day],
    }));
    setTimetableErrors((previous) => ({ ...previous, selected_days: "" }));
  }

  const scheduleLabel = timetable.schedule_type === "whole_day"
    ? "Whole Day"
    : timetable.schedule_type === "morning" ? "Morning" : "Afternoon";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-4 sm:px-6">
      <button type="button" aria-label="Close section wizard" disabled={saving} onClick={onClose} className="absolute inset-0 bg-black/40 disabled:cursor-wait" />
      <div className="relative flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="flex shrink-0 items-center justify-between border-b border-[#D9E8D5] px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-[#8C6B12]">Section management</p>
            <h2 className="mt-1 text-lg text-[#1B5E2C] sm:text-xl" style={{ fontFamily: "'Fraunces', serif" }}>
              {step === 0 ? "Add Sections" : "Section Creation Wizard"}
            </h2>
            {step > 0 && <p className="mt-0.5 text-xs text-[#86A18A]">{gradeLabel}</p>}
          </div>
          <button type="button" disabled={saving} onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D9E8D5] text-[#86A18A] hover:text-[#1B5E2C] disabled:opacity-50">✕</button>
        </header>

        {step > 0 && (
          <nav aria-label="Section creation progress" className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-[#D9E8D5] px-5 py-3 sm:px-7">
            {steps.map((label, index) => {
              const number = index + 1;
              const done = step > number;
              const active = step === number;
              return (
                <div key={label} className="flex min-w-0 flex-1 items-center">
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${done ? "bg-[#1B5E2C] text-white" : active ? "bg-[#F2BE22] text-[#1B5E2C]" : "bg-[#EFF4ED] text-[#86A18A]"}`}>{done ? "✓" : number}</span>
                    <span className={`hidden text-xs font-medium sm:inline ${active ? "text-[#1B5E2C]" : "text-[#86A18A]"}`}>{label}</span>
                  </div>
                  {index < steps.length - 1 && <div className={`mx-2 h-px flex-1 ${done ? "bg-[#1B5E2C]" : "bg-[#D9E8D5]"}`} />}
                </div>
              );
            })}
          </nav>
        )}

        <main className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          {step === 0 && (
            <form id="section-wizard-form" onSubmit={startWizard} noValidate className="mx-auto max-w-2xl space-y-5">
              <div>
                <h3 className="text-lg font-medium text-[#1B5E2C]">Create sections in one grade level</h3>
                <p className="mt-1 text-sm text-[#5B6478]">All sections created together will share one grade-level timetable.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Grade level">
                  <select name="grade_level" value={setup.grade_level} onChange={handleSetupChange} className={inputClass()}>
                    {GRADE_LEVELS.map((grade) => <option key={grade.value} value={grade.value}>{grade.label} ({grade.type})</option>)}
                  </select>
                </Field>
                <Field label={<>Strand {!isSHS && <span className="font-normal text-[#86A18A]">(JHS — not required)</span>}</>} error={setupErrors.strand_id}>
                  <select name="strand_id" value={setup.strand_id} onChange={handleSetupChange} disabled={!isSHS} className={`${inputClass(setupErrors.strand_id)} disabled:cursor-not-allowed disabled:bg-[#FAFAF5] disabled:text-[#A8AEBC]`}>
                    <option value="">— None —</option>
                    {strands.map((strand) => <option key={strand.strand_id} value={strand.strand_id}>{strand.strand_name}</option>)}
                  </select>
                </Field>
                <Field label="Number of Sections to Create" error={setupErrors.number_of_sections}>
                  <input name="number_of_sections" type="number" min="1" step="1" value={setup.number_of_sections} onChange={handleSetupChange} className={inputClass(setupErrors.number_of_sections)} />
                </Field>
                <Field label="Max capacity per section" error={setupErrors.max_capacity}>
                  <input name="max_capacity" type="number" min="1" step="1" value={setup.max_capacity} onChange={handleSetupChange} placeholder="e.g. 40" className={inputClass(setupErrors.max_capacity)} />
                </Field>
              </div>
            </form>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-[#1B5E2C]">Name Your Sections</h3>
                <p className="mt-1 text-sm text-[#5B6478]">Give each section a unique name within {gradeLabel}.</p>
              </div>
              {sections.map((section, index) => (
                <Field key={index} label={`Section ${index + 1}`} error={nameErrors[index]}>
                  <input value={section.section_name} maxLength={255} onChange={(event) => updateSectionName(index, event.target.value)} placeholder={`Section ${index + 1}`} className={inputClass(nameErrors[index])} />
                </Field>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-medium text-[#1B5E2C]">Setup {gradeLabel} Timetable</h3>
                <p className="mt-1 text-sm text-[#5B6478]">Configure one schedule shared by all {sections.length} sections in this grade.</p>
              </div>
              <section className="space-y-3">
                <h4 className="text-sm font-semibold text-[#1B5E2C]">Class Schedule Type</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    ["morning", "Morning"],
                    ["afternoon", "Afternoon"],
                    ["whole_day", "Whole Day"],
                  ].map(([value, label]) => (
                    <button key={value} type="button" onClick={() => changeScheduleType(value)} className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${timetable.schedule_type === value ? "border-[#1B5E2C] bg-[#EFF4ED] text-[#1B5E2C]" : "border-[#CBD9C8] text-[#5B6478] hover:border-[#1B5E2C]"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-3 rounded-xl border border-[#D9E8D5] p-4 sm:p-5">
                <h4 className="text-sm font-semibold text-[#1B5E2C]">School Time Configuration</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="School Start Time" error={timetableErrors.school_start_time}>
                    <input type="time" value={timetable.school_start_time} onChange={(event) => changeTimetable("school_start_time", event.target.value)} className={inputClass(timetableErrors.school_start_time)} />
                  </Field>
                  <Field label="School End Time" error={timetableErrors.school_end_time}>
                    <input type="time" value={timetable.school_end_time} onChange={(event) => changeTimetable("school_end_time", event.target.value)} className={inputClass(timetableErrors.school_end_time)} />
                  </Field>
                  {BREAKS.filter(([name]) => (
                    timetable.schedule_type === "whole_day"
                      ? name !== "lunch"
                      : name === (timetable.schedule_type === "morning" ? "morning" : "afternoon")
                  )).map(([name, label]) => {
                    const optional = timetable.schedule_type === "whole_day" && name === "afternoon";
                    return (
                      <div key={name} className="grid grid-cols-1 gap-3 rounded-lg bg-[#FAFAF5] p-3 sm:col-span-2 sm:grid-cols-2">
                        <p className="text-xs font-medium text-[#1B5E2C] sm:col-span-2">{label}{optional ? " (Optional)" : ""}</p>
                        <Field label={`${label} Start Time`} error={timetableErrors[`${name}_break_start`]}>
                          <input type="time" value={timetable[`${name}_break_start`]} onChange={(event) => changeTimetable(`${name}_break_start`, event.target.value)} className={inputClass(timetableErrors[`${name}_break_start`])} />
                        </Field>
                        <Field label={`${label} End Time`} error={timetableErrors[`${name}_break_end`]}>
                          <input type="time" value={timetable[`${name}_break_end`]} onChange={(event) => changeTimetable(`${name}_break_end`, event.target.value)} className={inputClass(timetableErrors[`${name}_break_end`])} />
                        </Field>
                      </div>
                    );
                  })}
                </div>
                {timetable.schedule_type === "whole_day" && (
                  <div className="grid grid-cols-1 gap-3 rounded-lg bg-[#FAFAF5] p-3 sm:grid-cols-2">
                    <p className="text-xs font-medium text-[#1B5E2C] sm:col-span-2">Lunch Break</p>
                    <Field label="Lunch Break Start Time" error={timetableErrors.lunch_break_start}>
                      <input type="time" value={timetable.lunch_break_start} onChange={(event) => changeTimetable("lunch_break_start", event.target.value)} className={inputClass(timetableErrors.lunch_break_start)} />
                    </Field>
                    <Field label="Lunch Break End Time" error={timetableErrors.lunch_break_end}>
                      <input type="time" value={timetable.lunch_break_end} onChange={(event) => changeTimetable("lunch_break_end", event.target.value)} className={inputClass(timetableErrors.lunch_break_end)} />
                    </Field>
                  </div>
                )}
              </section>

              <section>
                <h4 className="mb-2 text-sm font-semibold text-[#1B5E2C]">School Days</h4>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => {
                    const active = timetable.selected_days.includes(day);
                    return <button key={day} type="button" onClick={() => toggleDay(day)} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${active ? "bg-[#1B5E2C] text-white" : "border border-[#CBD9C8] bg-white text-[#5B6478]"}`}>{day.slice(0, 3)}</button>;
                  })}
                </div>
                {timetableErrors.selected_days && <ErrorText>{timetableErrors.selected_days}</ErrorText>}
              </section>

              <Field label="Total Number of Subjects" error={timetableErrors.total_subjects}>
                <input type="number" min="1" max={MAX_SUBJECTS} step="1" value={timetable.total_subjects} onChange={(event) => changeTimetable("total_subjects", event.target.value)} placeholder="e.g. 9" className={inputClass(timetableErrors.total_subjects)} />
              </Field>
              {generationError && <div className="rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 px-4 py-3 text-sm text-[#B3492B]">{generationError}</div>}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-[#1B5E2C]">Add {gradeLabel} Subjects</h3>
                <p className="mt-1 text-sm text-[#5B6478]">Enter the {timetable.total_subjects} subjects shared by every section in this grade.</p>
              </div>
              {subjects.map((subject, index) => (
                <Field key={index} label={`Subject ${index + 1}`} error={subjectErrors[index]}>
                  <input value={subject} maxLength={255} onChange={(event) => changeSubject(index, event.target.value)} placeholder={`Subject ${index + 1}`} className={inputClass(subjectErrors[index])} />
                </Field>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-[#1B5E2C]">Generated {gradeLabel} Timetable</h3>
                <p className="mt-1 text-sm text-[#5B6478]">Preview of the calculated subject periods for {timetable.selected_days.join(", ")}.</p>
              </div>
              <TimetableSummary timetable={timetable} scheduleLabel={scheduleLabel} />
              <TimetableTable periods={periods} />
              {generationError && <div className="rounded-lg border border-[#B3492B]/30 bg-[#B3492B]/10 px-4 py-3 text-sm text-[#B3492B]">{generationError}</div>}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-medium text-[#1B5E2C]">Review and Save</h3>
                <p className="mt-1 text-sm text-[#5B6478]">This grade-level timetable will be applied to every section listed below.</p>
              </div>
              <div className="rounded-xl border border-[#D9E8D5] bg-[#FAFAF5] p-4">
                <p className="text-sm text-[#5B6478]"><b className="text-[#1B5E2C]">Grade level:</b> {gradeLabel}</p>
                <p className="mt-1 text-sm text-[#5B6478]"><b className="text-[#1B5E2C]">Sections:</b> {sections.map((section) => section.section_name).join(", ")}</p>
              </div>
              <section className="rounded-xl border border-[#D9E8D5] p-4">
                <h4 className="mb-3 font-medium text-[#1B5E2C]">Shared Schedule</h4>
                <TimetableSummary timetable={timetable} scheduleLabel={scheduleLabel} />
              </section>
              <section className="rounded-xl border border-[#D9E8D5] p-4">
                <h4 className="mb-3 font-medium text-[#1B5E2C]">Generated Subject Timetable</h4>
                <TimetableTable periods={periods} />
              </section>
            </div>
          )}
        </main>

        <footer className="flex shrink-0 flex-col gap-3 border-t border-[#D9E8D5] bg-white px-5 py-4 sm:flex-row sm:justify-between sm:px-7">
          <div>
            {step > 0
              ? <button type="button" disabled={saving} onClick={() => setStep(step - 1)} className="w-full rounded-lg border border-[#CBD9C8] px-4 py-2.5 text-sm text-[#5B6478] hover:border-[#1B5E2C] sm:w-auto">Back</button>
              : <button type="button" disabled={saving} onClick={onClose} className="w-full rounded-lg border border-[#CBD9C8] px-4 py-2.5 text-sm text-[#5B6478] sm:w-auto">Cancel</button>}
          </div>
          {step === 0 ? (
            <button type="submit" form="section-wizard-form" className={primaryButtonClass}>Next</button>
          ) : step === 1 ? (
            <button type="button" onClick={goToTimetable} className={primaryButtonClass}>Next</button>
          ) : step === 2 ? (
            <button type="button" onClick={goToSubjects} className={primaryButtonClass}>Next</button>
          ) : step === 3 ? (
            <button type="button" onClick={generatePreview} className={primaryButtonClass}>Generate Timetable</button>
          ) : step === 4 ? (
            <button type="button" onClick={() => setStep(5)} className={primaryButtonClass}>Next</button>
          ) : (
            <button type="button" onClick={saveSections} disabled={saving} className={`${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-60`}>
              {saving ? "Saving Sections…" : "Save Sections"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function TimetableSummary({ timetable, scheduleLabel }) {
  const time = (value) => value ? formatTime(value) : "—";
  return (
    <div className="space-y-1.5 text-sm text-[#5B6478]">
      <p><b className="text-[#1B5E2C]">Schedule type:</b> {scheduleLabel}</p>
      <p><b className="text-[#1B5E2C]">School time:</b> {time(timetable.school_start_time)} – {time(timetable.school_end_time)}</p>
      {BREAKS.filter(([name]) => timetable[`${name}_break_start`] && timetable[`${name}_break_end`]).map(([name, label]) => (
        <p key={name}><b className="text-[#1B5E2C]">{label}:</b> {time(timetable[`${name}_break_start`])} – {time(timetable[`${name}_break_end`])}</p>
      ))}
      <p><b className="text-[#1B5E2C]">Total subjects:</b> {timetable.total_subjects}</p>
      <p><b className="text-[#1B5E2C]">School days:</b> {timetable.selected_days.join(", ") || "—"}</p>
    </div>
  );
}

function TimetableTable({ periods }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[#D9E8D5]">
      <table className="w-full text-sm">
        <thead className="bg-[#1B5E2C] text-left text-[#FAFAF5]">
          <tr>
            <th className="px-4 py-2.5 font-medium">#</th>
            <th className="px-4 py-2.5 font-medium">Subject</th>
            <th className="px-4 py-2.5 font-medium">Start</th>
            <th className="px-4 py-2.5 font-medium">End</th>
            <th className="px-4 py-2.5 font-medium">Duration</th>
          </tr>
        </thead>
        <tbody>
          {periods.map((period, index) => (
            <tr key={`${period.subject_name}-${index}`} className="border-t border-[#EFF4ED]">
              <td className="px-4 py-2.5 text-[#86A18A]">{index + 1}</td>
              <td className="px-4 py-2.5 font-medium text-[#1B5E2C]">{period.subject_name}</td>
              <td className="px-4 py-2.5 text-[#5B6478]">{formatTime(period.start_time)}</td>
              <td className="px-4 py-2.5 text-[#5B6478]">{formatTime(period.end_time)}</td>
              <td className="px-4 py-2.5 text-[#5B6478]">{period.duration} min</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatTime(value) {
  const [hours, minutes] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[#1B5E2C]">{label}</label>
      {children}
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}

function ErrorText({ children }) {
  return <p className="mt-1 text-xs text-[#B3492B]">{children}</p>;
}

const inputClass = (error) =>
  `w-full rounded-lg border px-3 py-2.5 text-sm text-[#1B5E2C] placeholder:text-[#A8AEBC] bg-white focus:outline-none focus:ring-2 focus:ring-[#F2BE22] ${
    error ? "border-[#B3492B]" : "border-[#CBD9C8]"
  }`;

const primaryButtonClass =
  "w-full rounded-lg bg-[#1B5E2C] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#164A22] sm:w-auto";
