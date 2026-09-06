import assert from "node:assert/strict";
import test from "node:test";
import { evaluateOpportunity, rankOpportunities } from "../agent/policy-engine.mjs";

const NOW = 1_800_000_000;
const policy = {
  minRewardGen: "0.02",
  maxBondGen: "0.02",
  minReturnMultiple: 3,
  minLeadHours: 12,
  authorityDomain: "github.com",
};

function mandate(overrides = {}) {
  return {
    id: 1,
    title: "Audit an autonomous release",
    state: "OPEN",
    reward: "100000000000000000",
    provider_bond_required: "20000000000000000",
    work_deadline: NOW + 48 * 3600,
    spec_url: `https://github.com/agent/release/blob/${"a".repeat(40)}/mandate.md`,
    spec_digest: `sha256:${"b".repeat(64)}`,
    authority_urls: ["https://api.github.com/repos/agent/release/commits/main"],
    ...overrides,
  };
}

test("agent accepts only an opportunity satisfying every policy constraint", () => {
  const decision = evaluateOpportunity(mandate(), policy, NOW);
  assert.equal(decision.decision, "ACCEPT");
  assert.equal(decision.score, 100);
  assert.equal(decision.checks.length, 7);
});

test("agent fails closed on economic, deadline, authority, or integrity risk", () => {
  const decision = evaluateOpportunity(mandate({
    provider_bond_required: "90000000000000000",
    work_deadline: NOW + 3600,
    spec_url: "https://github.com/agent/release/blob/main/mandate.md",
    authority_urls: ["https://example.com/status"],
  }), policy, NOW);
  assert.equal(decision.decision, "REJECT");
  assert.ok(decision.checks.filter((check) => !check.pass).length >= 4);
});

test("agent ranks executable opportunities before rejected mandates", () => {
  const ranked = rankOpportunities([
    mandate({ id: 1, state: "ACTIVE" }),
    mandate({ id: 2, reward: "200000000000000000" }),
  ], policy, NOW);
  assert.equal(ranked[0].mandateId, 2);
  assert.equal(ranked[0].decision, "ACCEPT");
  assert.equal(ranked[1].decision, "REJECT");
});

