import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { pathToFileURL } from "node:url";
import { rankOpportunities } from "./policy-engine.mjs";

const address = process.env.AGENT_MANDATE_ADDRESS || "0x74D9b10d6D4274e9B73C507CDB3AE2E67874f617";
const endpoint = process.env.GENLAYER_RPC_URL || "https://rpc-bradbury.genlayer.com";
const policy = {
  minRewardGen: process.env.AGENT_MIN_REWARD_GEN || "0.01",
  maxBondGen: process.env.AGENT_MAX_BOND_GEN || "0.05",
  minReturnMultiple: Number(process.env.AGENT_MIN_RETURN_MULTIPLE || "2"),
  minLeadHours: Number(process.env.AGENT_MIN_LEAD_HOURS || "12"),
  authorityDomain: process.env.AGENT_AUTHORITY_DOMAIN || "",
};

export async function runScout() {
  const client = createClient({ chain: testnetBradbury, endpoint });
  const ids = await client.readContract({ address, functionName: "list_mandate_ids", args: [] });
  const mandates = await Promise.all(ids.map((id) => client.readContract({ address, functionName: "get_mandate", args: [Number(id)] })));
  return {
    agent: "AgentMandate Opportunity Scout",
    cycle: new Date().toISOString(),
    perception: { network: "GenLayer Bradbury", contract: address, mandatesRead: mandates.length },
    policy,
    decisions: rankOpportunities(mandates, policy),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runScout().then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => {
    console.error(`Agent cycle failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
