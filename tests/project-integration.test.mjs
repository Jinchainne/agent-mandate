import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("contract uses consequential non-deterministic consensus", () => {
  const contract = read("contracts/agent_mandate.py");
  for (const marker of [
    "gl.nondet.web.get",
    "gl.nondet.web.render",
    "gl.nondet.exec_prompt",
    "gl.vm.run_nondet_unsafe",
    "_assessment_matches",
    "_settle(mandate",
    "Validator did not reproduce the exact cure requirement",
  ]) assert.ok(contract.includes(marker), `missing ${marker}`);
});

test("frontend binds the complete contract transaction lifecycle", () => {
  const client = read("src/lib/genlayer.ts");
  const app = read("src/App.tsx");
  for (const method of [
    "create_mandate", "accept_mandate", "submit_work", "evaluate",
    "submit_cure", "evaluate_cure", "file_appeal", "adjudicate_appeal",
    "finalize_decision", "cancel_open", "refund_timed_out",
  ]) assert.ok(client.includes(`\"${method}\"`), `missing client write ${method}`);
  assert.ok(client.includes("waitForTransactionReceipt"));
  assert.ok(client.includes('status !== "ACCEPTED"'));
  assert.ok(app.includes("refreshMandates"));
});

test("submission artifacts expose reviewer verification paths", () => {
  const readme = read("README.md");
  const walkthrough = read("docs/JUDGE-WALKTHROUGH.md");
  assert.ok(readme.includes("Why GenLayer is essential"));
  assert.ok(readme.includes("Agent Tank Hackathon"));
  assert.ok(walkthrough.includes("Expected verification outcome"));
});

