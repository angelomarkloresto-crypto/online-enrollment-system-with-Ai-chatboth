export function findVerifiedEnrollmentPeriod(
  periods,
  enrollmentPeriodId,
  gradeLevel,
  semester,
) {
  const expectedPeriodId = Number(enrollmentPeriodId);
  const expectedGradeLevel = Number(gradeLevel);
  if (
    !Array.isArray(periods)
    || !Number.isSafeInteger(expectedPeriodId)
    || expectedPeriodId < 1
    || !Number.isInteger(expectedGradeLevel)
  ) {
    return null;
  }

  const expectedSemester = String(semester ?? "");
  return periods.find((period) =>
    Number(period.enrollment_period_id) === expectedPeriodId
    && period.status === "Open"
    && period.eligible === true
    && Number(period.eligible_grade_level) === expectedGradeLevel
    && String(period.eligible_semester ?? "") === expectedSemester,
  ) ?? null;
}
