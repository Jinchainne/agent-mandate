import fs from "node:fs";

const contract = fs.readFileSync("contracts/agent_mandate_studio_next.py", "utf8");
const client = fs.readFileSync("src/lib/genlayer.ts", "utf8");
const app = fs.readFileSync("src/App.tsx", "utf8");
const agent = fs.readFileSync("agent/policy-engine.mjs", "utf8");
const scout = fs.readFileSync("agent/scout.mjs", "utf8");

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
  "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng",
  "gl.nondet.web.render", "gl.nondet.exec_prompt", "gl.eq_principle.prompt_comparative",
  "VERDICT_PRINCIPLE", "sha256:",
]) if (!contract.includes(marker)) throw new Error(`Studio Next contract invariant missing: ${marker}`);
if (!client.includes("waitForTransactionReceipt")) throw new Error("Receipt wait missing");
for (const marker of ["studioDevnet", "studio-dev.genlayer.com/api", "estimateTransactionFeesForWrite", "messageAllocations"]) {
  if (!client.includes(marker)) throw new Error(`Studio Next client binding missing: ${marker}`);
}
if (client.includes("testnetBradbury") || client.includes("rpc-bradbury")) {
  throw new Error("Client still targets Bradbury instead of Studio Next");
}
if (!app.includes("refreshMandates")) throw new Error("Authoritative refresh missing");
if (!app.includes('crypto.subtle.digest("SHA-256"') || !app.includes('protocol: "agent-mandate/1.0"')) {
  throw new Error("Agent manifest or immutable evidence preflight missing");
}
for (const marker of ["evaluateOpportunity", "rankOpportunities", "policy constraint(s)"]) {
  if (!agent.includes(marker)) throw new Error(`Opportunity agent capability missing: ${marker}`);
}
if (!scout.includes('functionName: "list_mandate_ids"') || !app.includes("Authorize top acceptance")) {
  throw new Error("Autonomous perception or contract action boundary missing");
}

console.log("AgentMandate verification passed: consensus, settlement, appeals, evidence preflight, agent runtime, and UI bindings align.");
