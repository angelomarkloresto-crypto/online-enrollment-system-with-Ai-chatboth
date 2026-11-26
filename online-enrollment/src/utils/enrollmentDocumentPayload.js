export function buildEnrollmentDocumentPayload({
  frontName,
  backName,
  psaName,
  goodMoralName,
}) {
  return {
    report_card_front: frontName,
    report_card_back: backName,
    birth_certificate: psaName || null,
    good_moral: goodMoralName || null,
  };
}
