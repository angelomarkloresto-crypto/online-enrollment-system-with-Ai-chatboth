import assert from "node:assert/strict";
import test from "node:test";
import { buildEnrollmentDocumentPayload } from "./enrollmentDocumentPayload.js";

test("uses the scanned front upload filename as report_card_front", () => {
  const frontFilename = "report_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg";
  const backFilename = "report_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png";

  const payload = buildEnrollmentDocumentPayload({
    frontName: frontFilename,
    backName: backFilename,
    psaName: "report_cccccccccccccccccccccccccccccccc.jpg",
    goodMoralName: "report_dddddddddddddddddddddddddddddddd.png",
  });

  assert.equal(payload.report_card_front, frontFilename);
  assert.equal(payload.report_card_back, backFilename);
});
