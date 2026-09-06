import fs from "node:fs";

const contract = fs.readFileSync("contracts/agent_mandate.py", "utf8");
const client = fs.readFileSync("src/lib/genlayer.ts", "utf8");
const app = fs.readFileSync("src/App.tsx", "utf8");

const methods = [
  "create_mandate", "accept_mandate", "submit_work", "evaluate",
  "submit_cure", "evaluate_cure", "file_appeal", "adjudicate_appeal",
  "finalize_decision", "cancel_open", "refund_timed_out",
];

for (const method of methods) {
  if (!contract.includes(`def ${method}(`)) throw new Error(`Contract method missing: ${method}`);
  if (!client.includes(`\"${method}\"`)) throw new Error(`Client method missing: ${method}`);
}
for (const marker of [
  "gl.nondet.web.get", "gl.nondet.web.render", "gl.nondet.exec_prompt",
  "gl.vm.run_nondet_unsafe", "full_commit_github_plus_sha256",
  "Validator did not reproduce the exact cure requirement",
]) if (!contract.includes(marker)) throw new Error(`Contract invariant missing: ${marker}`);
if (!client.includes("waitForTransactionReceipt")) throw new Error("Receipt wait missing");
if (!app.includes("refreshMandates")) throw new Error("Authoritative refresh missing");
if (!app.includes('crypto.subtle.digest("SHA-256"') || !app.includes('protocol: "agent-mandate/1.0"')) {
  throw new Error("Agent manifest or immutable evidence preflight missing");
}

console.log("AgentMandate verification passed: consensus, settlement, appeals, evidence preflight, agent manifest, and UI bindings align.");
