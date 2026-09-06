import type { Mandate } from "../src/types";

export type AgentPolicy = {
  minRewardGen: string;
  maxBondGen: string;
  minReturnMultiple: number;
  minLeadHours: number;
  authorityDomain: string;
};

export type AgentDecision = {
  mandateId: number;
  title: string;
  decision: "ACCEPT" | "REJECT";
  score: number;
  rewardWei: string;
  bondWei: string;
  checks: Array<{ key: string; pass: boolean; detail: string }>;
  rationale: string;
};

export function evaluateOpportunity(mandate: Mandate, policy: AgentPolicy, nowSeconds?: number): AgentDecision;
export function rankOpportunities(mandates: Mandate[], policy: AgentPolicy, nowSeconds?: number): AgentDecision[];

