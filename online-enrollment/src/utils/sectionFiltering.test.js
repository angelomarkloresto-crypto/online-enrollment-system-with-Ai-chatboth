import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  filterSectionsByGradeAndSemester,
  getSectionSemesterUpdate,
  sectionSemesterLabel,
} from "./sectionFiltering.js";

const sections = [
  { section_id: 1, grade_level: 7, semester: null },
  { section_id: 2, grade_level: 7, semester: null },
  { section_id: 3, grade_level: 8, semester: null },
  { section_id: 4, grade_level: 8, semester: null },
  { section_id: 5, grade_level: 9, semester: null },
  { section_id: 6, grade_level: 9, semester: null },
  { section_id: 7, grade_level: 10, semester: null },
  { section_id: 8, grade_level: 10, semester: "legacy value" },
  { section_id: 9, grade_level: 11, semester: "1st sem" },
  { section_id: 10, grade_level: 11, semester: "2nd sem" },
  { section_id: 11, grade_level: 11, semester: null },
  { section_id: 12, grade_level: 12, semester: "1st sem" },
  { section_id: 13, grade_level: 12, semester: "2nd sem" },
  { section_id: 14, grade_level: 12, semester: "unknown" },
];

test("JHS grade filters include every section without semester filtering", () => {
  assert.deepEqual(
    filterSectionsByGradeAndSemester(sections, "7", "").map(({ section_id }) => section_id),
    [1, 2],
  );
  assert.deepEqual(
    filterSectionsByGradeAndSemester(sections, "8", "1st sem").map(({ section_id }) => section_id),
    [3, 4],
  );
  assert.deepEqual(
    filterSectionsByGradeAndSemester(sections, "9", "2nd sem").map(({ section_id }) => section_id),
    [5, 6],
  );
  assert.deepEqual(
    filterSectionsByGradeAndSemester(sections, "10", "").map(({ section_id }) => section_id),
    [7, 8],
  );
});

test("Grade 11 filters require both the selected grade and saved semester", () => {
  assert.deepEqual(
    filterSectionsByGradeAndSemester(sections, "11", "1st sem").map(({ section_id }) => section_id),
    [9],
  );
  assert.deepEqual(
    filterSectionsByGradeAndSemester(sections, "11", "2nd sem").map(({ section_id }) => section_id),
    [10],
  );
});

test("Grade 12 filters require both the selected grade and saved semester", () => {
  assert.deepEqual(
    filterSectionsByGradeAndSemester(sections, "12", "1st sem").map(({ section_id }) => section_id),
    [12],
  );
  assert.deepEqual(
    filterSectionsByGradeAndSemester(sections, "12", "2nd sem").map(({ section_id }) => section_id),
    [13],
  );
});

test("an empty semester result stays empty instead of falling back", () => {
  assert.deepEqual(
    filterSectionsByGradeAndSemester(sections, "11", "3rd sem"),
    [],
  );
  assert.deepEqual(filterSectionsByGradeAndSemester(sections, "12", "1st sem"), [sections[11]]);
});

test("All Grades includes every section irrespective of semester selection", () => {
  assert.deepEqual(filterSectionsByGradeAndSemester(sections, "All", "1st sem"), sections);
  assert.deepEqual(filterSectionsByGradeAndSemester(sections, "All", "2nd sem"), sections);
});

test("semester labels are blank for JHS and reflect only valid saved SHS semesters", () => {
  assert.equal(sectionSemesterLabel(sections[0]), "");
  assert.equal(sectionSemesterLabel(sections[8]), "1st Semester");
  assert.equal(sectionSemesterLabel(sections[9]), "2nd Semester");
  assert.equal(sectionSemesterLabel(sections[10]), "\u2014");
  assert.equal(sectionSemesterLabel({ grade_level: 12, semester: "unexpected" }), "\u2014");
});

test("editing unrelated section fields omits the saved semester, including legacy NULL", () => {
  const form = { grade_level: 11, semester: "", section_name: "Updated" };
  const legacySection = { grade_level: 11, semester: null, section_name: "Existing" };
  const update = getSectionSemesterUpdate(form, legacySection, true);

  assert.deepEqual(update, { shouldSubmit: false, isValid: true });
});

test("editing can submit a valid semester change, and rejects invalid SHS changes", () => {
  const section = { grade_level: 12, semester: "1st sem" };
  const changedForm = { grade_level: 12, semester: "2nd sem" };
  assert.deepEqual(getSectionSemesterUpdate(changedForm, section, true), {
    shouldSubmit: true,
    isValid: true,
  });
  assert.deepEqual(getSectionSemesterUpdate({ ...changedForm, semester: "" }, section, true), {
    shouldSubmit: true,
    isValid: false,
  });
});

test("new SHS sections require a valid semester while JHS remains semester-free", () => {
  assert.deepEqual(getSectionSemesterUpdate({ grade_level: 11, semester: "" }, null, false), {
    shouldSubmit: true,
    isValid: false,
  });
  assert.deepEqual(getSectionSemesterUpdate({ grade_level: 7, semester: "" }, null, false), {
    shouldSubmit: true,
    isValid: true,
  });
});

test("filter controls render filtered sections and only update local filter state", () => {
  const componentSource = readFileSync(
    new URL("../pages/staff/StrandsAndSections.jsx", import.meta.url),
    "utf8",
  );

  assert.match(
    componentSource,
    /const filtered = filterSectionsByGradeAndSemester\(sections, gradeFilter, semesterFilter\)/,
  );
  assert.equal((componentSource.match(/filtered\.map\(\(sec, idx\)/g) ?? []).length, 2);
  assert.match(componentSource, /const showSemesterFilter = \["11", "12"\]\.includes\(gradeFilter\)/);
  assert.match(componentSource, /const showSemesterColumn = gradeFilter === "All" \|\| showSemesterFilter/);
  assert.match(componentSource, /showSemesterFilter && \(/);
  assert.match(componentSource, /<option value="1st sem">1st Semester<\/option>/);
  assert.match(componentSource, /<option value="2nd sem">2nd Semester<\/option>/);
  assert.match(componentSource, /if \(semesterUpdate\.shouldSubmit\) body\.append\("semester", form\.semester\)/);
  assert.match(componentSource, /onClick=\{\(\) => setGradeFilter\(g\)\}/);
  assert.match(componentSource, /onChange=\{\(event\) => setSemesterFilter\(event\.target\.value\)\}/);
  assert.doesNotMatch(
    componentSource.match(/onClick=\{\(\) => setGradeFilter\(g\)\}/)[0],
    /fetch|loadAll|setSections/,
  );
  assert.doesNotMatch(
    componentSource.match(/onChange=\{\(event\) => setSemesterFilter\(event\.target\.value\)\}/)[0],
    /fetch|loadAll|setSections/,
  );
});
