import assert from "node:assert/strict";
import test from "node:test";
import { buildEnrollmentDocumentPayload } from "./enrollmentDocumentPayload.js";

test("maps successful front and back upload filenames to their submission fields", () => {
  const frontUploadResponse = {
    filename: "report_215d2bec82aa8d1105315c2b3bf098e4.jpg",
    file_name: "report_215d2bec82aa8d1105315c2b3bf098e4.jpg",
  };
  const backUploadResponse = {
    filename: "report_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png",
    file_name: "report_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png",
  };
  const differentObservedPayloadFilename = "report_a82792d20696a136082b42278bd950ed.jpg";

  const payload = buildEnrollmentDocumentPayload({
    frontName: frontUploadResponse.filename,
    backName: backUploadResponse.filename,
    psaName: "report_cccccccccccccccccccccccccccccccc.jpg",
    goodMoralName: "report_dddddddddddddddddddddddddddddddd.png",
  });

  assert.equal(payload.report_card_front, frontUploadResponse.filename);
  assert.equal(payload.report_card_back, backUploadResponse.filename);
  assert.notEqual(payload.report_card_front, differentObservedPayloadFilename);
});
