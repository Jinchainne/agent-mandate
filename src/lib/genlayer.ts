import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

export const RPC_URL = "https://rpc-bradbury.genlayer.com";
export const EXPLORER_URL = "https://explorer-bradbury.genlayer.com";
export const CONTRACT_ADDRESS =
  (import.meta.env.VITE_AGENT_MANDATE_ADDRESS as string) ||
  "0x0000000000000000000000000000000000000000";

function address() {
  if (!/^0x[a-fA-F0-9]{40}$/.test(CONTRACT_ADDRESS) || /^0x0{40}$/.test(CONTRACT_ADDRESS)) {
    throw new Error("AgentMandate contract deployment is pending");
  }
  return CONTRACT_ADDRESS as `0x${string}`;
}

export function readClient() {
  return createClient({ chain: testnetBradbury, endpoint: RPC_URL });
}

export function walletClient(account: `0x${string}`) {
  if (!window.ethereum) throw new Error("Install MetaMask, Rabby, or OKX Wallet");
  return createClient({
    chain: testnetBradbury,
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

async function write(client: any, functionName: string, args: any[], value?: bigint) {
  const hash = await client.writeContract({
    address: address(),
    functionName,
    args,
    ...(value === undefined ? {} : { value }),
  });
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: "ACCEPTED",
    fullTransaction: true,
    retries: 120,
    interval: 3000,
  });
  const status = String(receipt?.statusName ?? receipt?.status_name ?? "ACCEPTED").toUpperCase();
  if (status !== "ACCEPTED") throw new Error(`Transaction was not accepted: ${status}`);
  return receipt;
}

export const writes = {
  createMandate: (client: any, args: any[], value: bigint) =>
    write(client, "create_mandate", args, value),
  acceptMandate: (client: any, id: number, value: bigint) =>
    write(client, "accept_mandate", [id], value),
  submitWork: (client: any, id: number, url: string, digest: string) =>
    write(client, "submit_work", [id, url, digest]),
  evaluate: (client: any, id: number) => write(client, "evaluate", [id]),
  submitCure: (client: any, id: number, url: string, digest: string) =>
    write(client, "submit_cure", [id, url, digest]),
  evaluateCure: (client: any, id: number) => write(client, "evaluate_cure", [id]),
  fileAppeal: (client: any, args: any[], value: bigint) =>
    write(client, "file_appeal", args, value),
  adjudicateAppeal: (client: any, appealId: number) =>
    write(client, "adjudicate_appeal", [appealId]),
  finalizeDecision: (client: any, id: number) => write(client, "finalize_decision", [id]),
  cancelOpen: (client: any, id: number) => write(client, "cancel_open", [id]),
  refundTimedOut: (client: any, id: number) => write(client, "refund_timed_out", [id]),
};

export async function listMandateIds() {
  return readClient().readContract({ address: address(), functionName: "list_mandate_ids", args: [] });
}

export async function readMandate(id: number) {
  return readClient().readContract({ address: address(), functionName: "get_mandate", args: [id] });
}

export async function readAppeal(id: number) {
  return readClient().readContract({ address: address(), functionName: "get_appeal", args: [id] });
}

export async function readPolicy() {
  return readClient().readContract({ address: address(), functionName: "get_policy", args: [] });
}

