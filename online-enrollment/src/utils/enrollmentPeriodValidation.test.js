import assert from "node:assert/strict";
import test from "node:test";
import { findVerifiedEnrollmentPeriod } from "./enrollmentPeriodValidation.js";

const gradeSevenPeriod = {
  enrollment_period_id: 4,
  school_year: "2026-2027",
  coverage: "all_grade_levels",
  semester: "1st sem",
  status: "Open",
  opens_at: null,
  closes_at: null,
  eligible: true,
  eligible_grade_level: 7,
  eligible_semester: null,
  eligibility_message: null,
  latest_attempt: null,
};

test("rechecks the reported Open Grade 7 period with null dates and no semester", () => {
  assert.equal(
    findVerifiedEnrollmentPeriod([gradeSevenPeriod], 4, "7", null),
    gradeSevenPeriod,
  );
});

test("normalizes the selected period ID when a cached value is a numeric string", () => {
  assert.equal(
    findVerifiedEnrollmentPeriod([gradeSevenPeriod], "4", "7", null),
    gradeSevenPeriod,
  );
});

test("rejects closed, ineligible, mismatched-grade, and mismatched-ID periods", () => {
  for (const changes of [
    { status: "Closed" },
    { eligible: false },
    { eligible_grade_level: 8 },
  ]) {
    assert.equal(
      findVerifiedEnrollmentPeriod(
        [{ ...gradeSevenPeriod, ...changes }],
        4,
        7,
        null,
      ),
      null,
    );
  }

  assert.equal(
    findVerifiedEnrollmentPeriod([gradeSevenPeriod], 5, 7, null),
    null,
  );
});
