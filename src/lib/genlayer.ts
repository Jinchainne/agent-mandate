import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

/** Studio Next is the Studio-dev preview: chain ID 61997. */
export const RPC_URL = "https://studio-dev.genlayer.com/api";
export const EXPLORER_URL = "https://explorer-studio-dev.genlayer.com";
export const CHAIN_ID = studioDevnet.id;
/** Accepted Studio Next deployment; an env var may override it for a future release. */
export const CONTRACT_ADDRESS = (import.meta.env.VITE_AGENT_MANDATE_ADDRESS as string) || "0xFc127a1FfFD789B2F4697b3450d53c86D68a0bBB";

export function hasConfiguredContract() {
  return /^0x[a-fA-F0-9]{40}$/.test(CONTRACT_ADDRESS) && !/^0x0{40}$/.test(CONTRACT_ADDRESS);
}

function address() {
  if (!hasConfiguredContract()) {
    throw new Error("AgentMandate contract deployment is pending");
  }
  return CONTRACT_ADDRESS as `0x${string}`;
}

export function readClient() {
  return createClient({ chain: studioDevnet, endpoint: RPC_URL });
}

export function walletClient(account: `0x${string}`) {
  if (!window.ethereum) throw new Error("Install MetaMask, Rabby, or OKX Wallet");
  return createClient({
    chain: studioDevnet,
    account,
    provider: window.ethereum,
    endpoint: RPC_URL,
  });
}

export async function connectWallet() {
  if (!window.ethereum) throw new Error("Install MetaMask, Rabby, or OKX Wallet");
  const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
  return accounts[0] as `0x${string}`;
}

async function write(client: any, functionName: string, args: any[]) {
  const request = {
    address: address(),
    functionName,
    args,
  };
  // Studio Next (Consensus v0.6) requires fee funding derived from the exact call.
  const quote = await client.estimateTransactionFeesForWrite(request);
  const hash = await client.writeContract({
    ...request,
    fees: {
      distribution: quote.distribution,
      messageAllocations: quote.messageAllocations,
      feeValue: quote.feeValue,
    },
  });
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: "ACCEPTED",
    fullTransaction: true,
    retries: 120,
    interval: 3000,
  });
  const status = String(receipt?.statusName ?? receipt?.status_name ?? "ACCEPTED").toUpperCase();
  const execution = String(receipt?.txExecutionResultName ?? receipt?.tx_execution_result_name ?? "").toUpperCase();
  if (status !== "ACCEPTED" || (execution && execution !== "FINISHED_WITH_RETURN")) {
    throw new Error(`Transaction failed: ${status}${execution ? ` / ${execution}` : ""}`);
  }
  return receipt;
}

function parseContractJson<T>(value: unknown): T {
  if (typeof value === "string") return JSON.parse(value) as T;
  return value as T;
}

export const writes = {
  createMandate: (client: any, args: any[], _value: bigint) =>
    write(client, "create_mandate", args),
  acceptMandate: (client: any, id: number, _value: bigint) =>
    write(client, "accept_mandate", [id]),
  submitWork: (client: any, id: number, url: string, digest: string) =>
    write(client, "submit_work", [id, url, digest]),
  evaluate: (client: any, id: number) => write(client, "evaluate", [id]),
  submitCure: (client: any, id: number, url: string, digest: string) =>
    write(client, "submit_cure", [id, url, digest]),
  evaluateCure: (client: any, id: number) => write(client, "evaluate_cure", [id]),
  fileAppeal: (client: any, args: any[], _value: bigint) =>
    write(client, "file_appeal", args),
  adjudicateAppeal: (client: any, appealId: number) =>
    write(client, "adjudicate_appeal", [appealId]),
  finalizeDecision: (client: any, id: number) => write(client, "finalize_decision", [id]),
  cancelOpen: (client: any, id: number) => write(client, "cancel_open", [id]),
  refundTimedOut: (client: any, id: number) => write(client, "refund_timed_out", [id]),
};

export async function listMandateIds() {
  const result = await readClient().readContract({ address: address(), functionName: "list_mandate_ids", args: [] });
  return parseContractJson<Array<number | bigint>>(result);
}

export async function readMandate(id: number) {
  const result = await readClient().readContract({ address: address(), functionName: "get_mandate", args: [id] });
  return parseContractJson(result);
}

export async function readAppeal(id: number) {
  const result = await readClient().readContract({ address: address(), functionName: "get_appeal", args: [id] });
  return parseContractJson(result);
}

export async function readPolicy() {
  const result = await readClient().readContract({ address: address(), functionName: "get_policy", args: [] });
  return parseContractJson(result);
}
