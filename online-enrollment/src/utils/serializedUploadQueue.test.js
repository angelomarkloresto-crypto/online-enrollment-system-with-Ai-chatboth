import assert from "node:assert/strict";
import test from "node:test";
import { createSerializedUploadQueue } from "./serializedUploadQueue.js";

test("serializes front and back upload requests", async () => {
  const enqueue = createSerializedUploadQueue();
  const events = [];
  let releaseFront;
  let frontStarted;
  const frontGate = new Promise((resolve) => {
    releaseFront = resolve;
  });
  const frontStartedPromise = new Promise((resolve) => {
    frontStarted = resolve;
  });

  const front = enqueue(async () => {
    events.push("front-start");
    frontStarted();
    await frontGate;
    events.push("front-finish");
    return "front";
  });
  const back = enqueue(async () => {
    events.push("back-start");
    return "back";
  });

  await frontStartedPromise;
  assert.deepEqual(events, ["front-start"]);
  releaseFront();
  assert.deepEqual(await Promise.all([front, back]), ["front", "back"]);
  assert.deepEqual(events, ["front-start", "front-finish", "back-start"]);
});

test("continues queued uploads after an upload request fails", async () => {
  const enqueue = createSerializedUploadQueue();
  const failure = new Error("upload failed");

  await assert.rejects(enqueue(async () => {
    throw failure;
  }), failure);
  assert.equal(await enqueue(async () => "back"), "back");
});
