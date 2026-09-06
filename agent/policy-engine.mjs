const GEN = 10n ** 18n;

function genToWei(value) {
  const [whole = "0", fraction = ""] = String(value).trim().split(".");
  if (!/^\d+$/.test(whole) || !/^\d*$/.test(fraction) || fraction.length > 18) {
    throw new Error("Agent policy contains an invalid GEN amount");
  }
  return BigInt(whole) * GEN + BigInt((fraction + "0".repeat(18)).slice(0, 18));
}

function hostMatches(url, requiredDomain) {
  if (!requiredDomain.trim()) return true;
  try {
    const host = new URL(url).hostname.toLowerCase();
    const required = requiredDomain.trim().toLowerCase().replace(/^\./, "");
    return host === required || host.endsWith(`.${required}`);
  } catch {
    return false;
  }
}

export function evaluateOpportunity(mandate, policy, nowSeconds = Math.floor(Date.now() / 1000)) {
  const reward = BigInt(mandate.reward || "0");
  const bond = BigInt(mandate.provider_bond_required || "0");
  const minReward = genToWei(policy.minRewardGen);
  const maxBond = genToWei(policy.maxBondGen);
  const leadHours = (Number(mandate.work_deadline) - nowSeconds) / 3600;
  const returnMultiple = bond === 0n ? Number.POSITIVE_INFINITY : Number(reward * 100n / bond) / 100;
  const authorities = Array.isArray(mandate.authority_urls) ? mandate.authority_urls : [];

  const checks = [
    { key: "state", pass: mandate.state === "OPEN", detail: mandate.state === "OPEN" ? "Mandate is open" : `State is ${mandate.state}` },
    { key: "reward", pass: reward >= minReward, detail: reward >= minReward ? "Reward clears floor" : "Reward below policy floor" },
    { key: "bond", pass: bond <= maxBond, detail: bond <= maxBond ? "Bond within risk cap" : "Bond exceeds risk cap" },
    { key: "return", pass: returnMultiple >= Number(policy.minReturnMultiple), detail: `${returnMultiple.toFixed(2)}x reward-to-bond` },
    { key: "deadline", pass: leadHours >= Number(policy.minLeadHours), detail: `${Math.max(0, leadHours).toFixed(1)}h execution runway` },
    { key: "authority", pass: authorities.some((url) => hostMatches(url, policy.authorityDomain)), detail: policy.authorityDomain ? `Requires ${policy.authorityDomain}` : `${authorities.length} declared authorities` },
    { key: "integrity", pass: /^sha256:[a-f0-9]{64}$/i.test(mandate.spec_digest) && /\/[a-f0-9]{40}\//i.test(mandate.spec_url), detail: "Commit pin and digest present" },
  ];
  const passed = checks.filter((check) => check.pass).length;
  const hardFailure = checks.some((check) => !check.pass);
  const score = Math.round((passed / checks.length) * 100);

  return {
    mandateId: Number(mandate.id),
    title: mandate.title,
    decision: hardFailure ? "REJECT" : "ACCEPT",
    score,
    rewardWei: reward.toString(),
    bondWei: bond.toString(),
    checks,
    rationale: hardFailure
      ? `${checks.filter((check) => !check.pass).length} policy constraint(s) blocked autonomous acceptance.`
      : `All ${checks.length} constraints passed; this is an executable agent opportunity.`,
  };
}

export function rankOpportunities(mandates, policy, nowSeconds = Math.floor(Date.now() / 1000)) {
  return mandates
    .map((mandate) => evaluateOpportunity(mandate, policy, nowSeconds))
    .sort((left, right) => {
      if (left.decision !== right.decision) return left.decision === "ACCEPT" ? -1 : 1;
      if (left.score !== right.score) return right.score - left.score;
      const rightReward = BigInt(right.rewardWei);
      const leftReward = BigInt(left.rewardWei);
      return rightReward === leftReward ? 0 : rightReward > leftReward ? 1 : -1;
    });
}
