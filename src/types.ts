export type MandateState =
  | "OPEN"
  | "ACTIVE"
  | "SUBMITTED"
  | "REMEDIABLE"
  | "DECIDED"
  | "APPEALED"
  | "INCONCLUSIVE"
  | "SETTLED"
  | "CANCELLED"
  | "REFUNDED";

export type Mandate = {
  id: number;
  principal: string;
  provider: string;
  title: string;
  brief: string;
  spec_url: string;
  spec_digest: string;
  authority_urls: string[];
  reward: string;
  provider_bond_required: string;
  provider_bond: string;
  state: MandateState;
  submission_url: string;
  submission_digest: string;
  verdict: string;
  criteria_met: number;
  criteria_total: number;
  reasoning: string;
  cure_requirement: string;
  cure_requirement_digest: string;
  cure_url: string;
  cure_digest: string;
  work_deadline: number;
  decision_deadline: number;
  resolution_timeout: number;
  appeal_id: number;
  settled: boolean;
};

export type Appeal = {
  id: number;
  mandate_id: number;
  appellant: string;
  ground: string;
  evidence_url: string;
  evidence_digest: string;
  bond: string;
  outcome: string;
  reasoning: string;
  settled: boolean;
};

