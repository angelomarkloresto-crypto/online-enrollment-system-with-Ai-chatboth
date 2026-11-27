const SHS_SEMESTERS = ["1st sem", "2nd sem"];

export function filterSectionsByGradeAndSemester(sections, gradeFilter, semesterFilter) {
  if (gradeFilter === "All") return sections;

  return sections.filter((section) => {
    if (String(section.grade_level) !== String(gradeFilter)) {
      return false;
    }

    const isSHS = ["11", "12"].includes(String(section.grade_level));
    return !isSHS || section.semester === semesterFilter;
  });
}

export function sectionSemesterLabel(section) {
  if (String(section.grade_level) === "11" || String(section.grade_level) === "12") {
    return section.semester === "1st sem" ? "1st Semester"
      : section.semester === "2nd sem" ? "2nd Semester"
        : "\u2014";
  }
  return "";
}

export function getSectionSemesterUpdate(form, section, isEdit) {
  const gradeChanged = isEdit && String(form.grade_level) !== String(section.grade_level);
  const shouldSubmit = !isEdit
    || gradeChanged
    || form.semester !== (section.semester ?? "");
  const isSHS = ["11", "12"].includes(String(form.grade_level));

  return {
    shouldSubmit,
    isValid: !isSHS || !shouldSubmit || SHS_SEMESTERS.includes(form.semester),
  };
}
