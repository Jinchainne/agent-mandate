import { startTransition, useEffect, useState } from "react";
import {
  CONTRACT_ADDRESS,
  EXPLORER_URL,
  connectWallet,
  listMandateIds,
  readAppeal,
  readMandate,
  walletClient,
  writes,
} from "./lib/genlayer";
import type { Appeal, Mandate } from "./types";

type View = "docket" | "create" | "protocol";

const ZERO = "0x0000000000000000000000000000000000000000";

function short(value: string, size = 6) {
  if (!value || value.length <= size * 2 + 3) return value || "not set";
  return `${value.slice(0, size)}...${value.slice(-size)}`;
}

function genToWei(value: string) {
  const [whole = "0", fraction = ""] = value.trim().split(".");
  if (!/^\d+$/.test(whole) || !/^\d*$/.test(fraction) || fraction.length > 18) {
    throw new Error("Enter a valid GEN amount with at most 18 decimals");
  }
  return BigInt(whole) * 10n ** 18n + BigInt((fraction + "0".repeat(18)).slice(0, 18));
}

function formatGen(wei: string) {
  const value = BigInt(wei || "0");
  const whole = value / 10n ** 18n;
  const fraction = (value % 10n ** 18n).toString().padStart(18, "0").slice(0, 4).replace(/0+$/, "");
  return `${whole}${fraction ? `.${fraction}` : ""} GEN`;
}

function dateTime(timestamp: number) {
  if (!timestamp) return "not scheduled";
  return new Date(timestamp * 1000).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function defaultDeadline() {
  const value = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 16);
}

function App() {
  const [view, setView] = useState<View>("docket");
  const [account, setAccount] = useState<`0x${string}` | "">("");
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [appealRecord, setAppealRecord] = useState<Appeal | null>(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("Reading the Bradbury mandate ledger");

  const [draft, setDraft] = useState({
    title: "",
    brief: "",
    specUrl: "",
    specDigest: "sha256:",
    authorities: "",
    reward: "0.05",
    bond: "0.01",
    deadline: defaultDeadline(),
  });
  const [submission, setSubmission] = useState({ url: "", digest: "sha256:" });
  const [cure, setCure] = useState({ url: "", digest: "sha256:" });
  const [appeal, setAppeal] = useState({
    ground: "EVIDENCE_OMITTED",
    url: "",
    digest: "sha256:",
  });

  const selected = mandates.find((item) => Number(item.id) === selectedId) ?? null;
  const policyBoundToExecution = Boolean(
    selected?.settled && (selected.verdict === "PASS" || selected.verdict === "FAIL"),
  );

  async function refreshMandates(focusId?: number) {
    try {
      const rawIds = (await listMandateIds()) as Array<number | bigint>;
      const records = await Promise.all(rawIds.map((id) => readMandate(Number(id)) as Promise<Mandate>));
      records.sort((a, b) => Number(b.id) - Number(a.id));
      startTransition(() => {
        setMandates(records);
        setSelectedId((current) => focusId ?? current ?? (records[0] ? Number(records[0].id) : null));
      });
      setNotice(records.length ? `Synchronized ${records.length} on-chain mandate${records.length === 1 ? "" : "s"}` : "Ledger synchronized. No mandates yet.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to read the contract");
    }
  }

  useEffect(() => {
    void refreshMandates();
  }, []);

  useEffect(() => {
    if (!selected?.appeal_id) {
      setAppealRecord(null);
      return;
    }
    void (readAppeal(selected.appeal_id) as Promise<Appeal>)
      .then(setAppealRecord)
      .catch(() => setAppealRecord(null));
  }, [selected?.appeal_id]);

  async function transact(label: string, action: (client: ReturnType<typeof walletClient>) => Promise<unknown>) {
    if (!account) {
      setNotice("Connect a Bradbury wallet before signing a transaction");
      return;
    }
    setBusy(label);
    setNotice(`${label}: waiting for wallet signature`);
    try {
      await action(walletClient(account));
      setNotice(`${label}: accepted by GenLayer consensus; refreshing state`);
      await refreshMandates(selectedId ?? undefined);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : `${label} failed`);
    } finally {
      setBusy("");
    }
  }

  async function connect() {
    try {
      const address = await connectWallet();
      setAccount(address);
      setNotice(`Connected ${short(address)}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Wallet connection failed");
    }
  }

  function actionButton(label: string, action: () => void, className = "") {
    return <button className={className} disabled={Boolean(busy)} onClick={action}>{busy === label ? "Consensus pending..." : label}</button>;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView("docket")}>
          <span className="brand-mark"><i /><i /><i /></span>
          <span><b>AgentMandate</b><small>work that settles itself</small></span>
        </button>
        <nav aria-label="Primary navigation">
          {(["docket", "create", "protocol"] as View[]).map((item) => (
            <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>{item}</button>
          ))}
        </nav>
        <button className="wallet" onClick={connect}>{account ? short(account) : "Connect wallet"}</button>
      </header>

      <div className="network-rail">
        <span><i /> Bradbury testnet</span>
        <span className="rail-notice">{notice}</span>
        <a href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">Contract {short(CONTRACT_ADDRESS, 5)}</a>
      </div>

      {view === "docket" && (
        <main className="docket-layout">
          <aside className="mandate-index">
            <div className="section-kicker">Public work ledger</div>
            <div className="index-heading"><h1>Mandates</h1><button onClick={() => void refreshMandates()}>Refresh</button></div>
            <p>Escrowed jobs between principals and autonomous providers.</p>
            <div className="index-list">
              {mandates.map((mandate) => (
                <button key={mandate.id} className={selectedId === Number(mandate.id) ? "selected" : ""} onClick={() => setSelectedId(Number(mandate.id))}>
                  <span className="index-number">{String(mandate.id).padStart(2, "0")}</span>
                  <span><b>{mandate.title}</b><small>{mandate.state} / {formatGen(mandate.reward)}</small></span>
                </button>
              ))}
              {!mandates.length && <div className="empty-index"><b>The ledger is open.</b><span>Create the first evidence-bound mandate.</span><button onClick={() => setView("create")}>Draft mandate</button></div>}
            </div>
          </aside>

          <section className="mandate-stage">
            {selected ? (
              <>
                <div className="case-head">
                  <div><span className="eyebrow">MANDATE {String(selected.id).padStart(4, "0")}</span><h2>{selected.title}</h2><p>{selected.brief}</p></div>
                  <span className={`status status-${selected.state.toLowerCase()}`}>{selected.state}</span>
                </div>

                <div className="metric-strip">
                  <span><small>Escrow</small>{formatGen(selected.reward)}</span>
                  <span><small>Provider bond</small>{formatGen(selected.provider_bond_required)}</span>
                  <span><small>Work closes</small>{dateTime(selected.work_deadline)}</span>
                  <span><small>Criteria</small>{selected.criteria_total ? `${selected.criteria_met}/${selected.criteria_total}` : "pending"}</span>
                </div>

                <div className="evidence-grid">
                  <article className="ledger-card">
                    <div className="section-kicker">Locked instruction</div>
                    <h3>Specification</h3>
                    <a href={selected.spec_url} target="_blank" rel="noreferrer">{selected.spec_url}</a>
                    <code>{selected.spec_digest}</code>
                    <h3>Declared live authorities</h3>
                    {selected.authority_urls.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer">{url}</a>)}
                  </article>
                  <article className="ledger-card">
                    <div className="section-kicker">Execution parties</div>
                    <dl><dt>Principal</dt><dd>{short(selected.principal, 8)}</dd><dt>Provider</dt><dd>{selected.provider === ZERO ? "unassigned" : short(selected.provider, 8)}</dd></dl>
                    {selected.submission_url && <><h3>Immutable deliverable</h3><a href={selected.submission_url} target="_blank" rel="noreferrer">{selected.submission_url}</a><code>{selected.submission_digest}</code></>}
                  </article>
                  <article className="ledger-card verdict-card">
                    <div className="section-kicker">Consensus record</div>
                    <strong>{selected.verdict || "AWAITING EVALUATION"}</strong>
                    <p>{selected.reasoning || "Validators will independently fetch the locked artifacts and declared live authorities."}</p>
                    <p className="binding-line">{policyBoundToExecution ? "Consensus verdict is bound to closed on-chain accounting." : "No winner-selected payout is available before a final contract route."}</p>
                    {selected.cure_requirement && <div className="cure-callout"><small>Exact cure / {short(selected.cure_requirement_digest, 12)}</small>{selected.cure_requirement}</div>}
                  </article>
                </div>

                {appealRecord && <article className="appeal-record"><span>APPEAL {appealRecord.id}</span><b>{appealRecord.ground} / {appealRecord.outcome || "OPEN"}</b><p>{appealRecord.reasoning || "Bonded appeal awaiting independent adjudication."}</p></article>}

                <section className="action-deck">
                  <div><span className="section-kicker">Next valid transition</span><h3>Operate this mandate</h3></div>
                  {selected.state === "OPEN" && <div className="action-row">{actionButton("Accept mandate", () => void transact("Accept mandate", (client) => writes.acceptMandate(client, selected.id, BigInt(selected.provider_bond_required))))}{actionButton("Cancel open", () => void transact("Cancel open", (client) => writes.cancelOpen(client, selected.id)), "secondary")}</div>}
                  {selected.state === "ACTIVE" && <form onSubmit={(event) => { event.preventDefault(); void transact("Submit work", (client) => writes.submitWork(client, selected.id, submission.url, submission.digest)); }}><input required value={submission.url} onChange={(e) => setSubmission({ ...submission, url: e.target.value })} placeholder="Full-commit GitHub deliverable URL" /><input required value={submission.digest} onChange={(e) => setSubmission({ ...submission, digest: e.target.value })} placeholder="sha256: content digest" /><button disabled={Boolean(busy)}>Submit immutable work</button></form>}
                  {(selected.state === "SUBMITTED" || selected.state === "INCONCLUSIVE") && <div className="action-row">{actionButton("Run evaluation", () => void transact("Run evaluation", (client) => writes.evaluate(client, selected.id)))}{actionButton("Recover timeout", () => void transact("Recover timeout", (client) => writes.refundTimedOut(client, selected.id)), "secondary")}</div>}
                  {selected.state === "REMEDIABLE" && <form onSubmit={(event) => { event.preventDefault(); void transact("Submit cure", (client) => writes.submitCure(client, selected.id, cure.url, cure.digest)); }}><p className="form-note">The provider must answer the exact consensus requirement above.</p><input required value={cure.url} onChange={(e) => setCure({ ...cure, url: e.target.value })} placeholder="Full-commit GitHub cure URL" /><input required value={cure.digest} onChange={(e) => setCure({ ...cure, digest: e.target.value })} placeholder="sha256: cure digest" /><button disabled={Boolean(busy)}>Submit cure</button>{selected.cure_url && <button type="button" className="secondary" onClick={() => void transact("Evaluate cure", (client) => writes.evaluateCure(client, selected.id))}>Evaluate exact cure</button>}</form>}
                  {selected.state === "DECIDED" && <form onSubmit={(event) => { event.preventDefault(); void transact("File appeal", (client) => writes.fileAppeal(client, [selected.id, appeal.ground, appeal.url, appeal.digest], BigInt(selected.provider_bond_required))); }}><p className="form-note">Only the losing party may appeal before {dateTime(selected.decision_deadline)}.</p><select value={appeal.ground} onChange={(e) => setAppeal({ ...appeal, ground: e.target.value })}><option>EVIDENCE_OMITTED</option><option>REQUIREMENT_MISREAD</option><option>LIVE_SOURCE_ERROR</option></select><input required value={appeal.url} onChange={(e) => setAppeal({ ...appeal, url: e.target.value })} placeholder="Immutable appeal evidence URL" /><input required value={appeal.digest} onChange={(e) => setAppeal({ ...appeal, digest: e.target.value })} placeholder="sha256: appeal evidence digest" /><button disabled={Boolean(busy)}>File bonded appeal</button><button type="button" className="secondary" onClick={() => void transact("Finalize decision", (client) => writes.finalizeDecision(client, selected.id))}>Finalize after window</button></form>}
                  {selected.state === "APPEALED" && <div className="action-row">{actionButton("Adjudicate appeal", () => void transact("Adjudicate appeal", (client) => writes.adjudicateAppeal(client, selected.appeal_id)))}{actionButton("Recover timeout", () => void transact("Recover timeout", (client) => writes.refundTimedOut(client, selected.id)), "secondary")}</div>}
                  {(selected.state === "SETTLED" || selected.state === "REFUNDED" || selected.state === "CANCELLED") && <p className="terminal-note">Accounting is closed. Stored liabilities are zero and this mandate cannot settle twice.</p>}
                </section>
              </>
            ) : (
              <div className="hero-empty"><span className="section-kicker">Autonomous work, enforceable terms</span><h1>A handshake<br />with consequences.</h1><p>Specify the task. Fund the outcome. Let independent validators inspect the actual work and authoritative world state before value moves.</p><button onClick={() => setView("create")}>Create a mandate</button></div>
            )}
          </section>
        </main>
      )}

      {view === "create" && (
        <main className="create-layout">
          <section className="create-intro"><span className="section-kicker">New principal instruction</span><h1>Write terms<br />an agent cannot blur.</h1><p>The specification and every submitted artifact are pinned to Git commits and byte digests. Live sources are declared before a provider accepts.</p><ol><li>Lock specification</li><li>Fund reward</li><li>Set provider bond</li><li>Declare authorities</li></ol></section>
          <form className="create-form" onSubmit={(event) => { event.preventDefault(); const authorities = draft.authorities.split("\n").map((value) => value.trim()).filter(Boolean); void transact("Create mandate", (client) => writes.createMandate(client, [draft.title, draft.brief, draft.specUrl, draft.specDigest, authorities, genToWei(draft.bond), Math.floor(new Date(draft.deadline).getTime() / 1000)], genToWei(draft.reward))).then(() => setView("docket")); }}>
            <div className="form-title"><span>01</span><h2>Mandate identity</h2></div>
            <label>Title<input required minLength={4} maxLength={80} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Audit an agent-generated release" /></label>
            <label>Operational brief<textarea required minLength={30} maxLength={1000} value={draft.brief} onChange={(e) => setDraft({ ...draft, brief: e.target.value })} placeholder="State the real-world outcome and who depends on it." /></label>
            <div className="form-title"><span>02</span><h2>Locked acceptance law</h2></div>
            <label>Specification URL<input required value={draft.specUrl} onChange={(e) => setDraft({ ...draft, specUrl: e.target.value })} placeholder="https://github.com/org/repo/blob/<40-char-commit>/mandate.md" /></label>
            <label>Specification SHA-256<input required value={draft.specDigest} onChange={(e) => setDraft({ ...draft, specDigest: e.target.value })} /></label>
            <label>Live authority URLs<textarea required value={draft.authorities} onChange={(e) => setDraft({ ...draft, authorities: e.target.value })} placeholder="One public authoritative HTTPS URL per line, maximum three" /></label>
            <div className="form-title"><span>03</span><h2>Economic commitment</h2></div>
            <div className="form-pair"><label>Reward in test GEN<input required value={draft.reward} onChange={(e) => setDraft({ ...draft, reward: e.target.value })} /></label><label>Provider bond in test GEN<input required value={draft.bond} onChange={(e) => setDraft({ ...draft, bond: e.target.value })} /></label></div>
            <label>Work deadline<input required type="datetime-local" value={draft.deadline} onChange={(e) => setDraft({ ...draft, deadline: e.target.value })} /></label>
            <button className="wide" disabled={Boolean(busy)}>{busy === "Create mandate" ? "Waiting for consensus..." : "Fund and publish mandate"}</button>
          </form>
        </main>
      )}

      {view === "protocol" && (
        <main className="protocol-layout">
          <span className="section-kicker">Protocol anatomy</span><h1>Three layers of credible work.</h1>
          <div className="protocol-grid">
            <article><span>01</span><h2>Immutable instruction</h2><p>The task specification, provider output, cure, and appeal evidence each bind a full Git commit and SHA-256 digest. Validators hash raw bytes before reading content.</p></article>
            <article><span>02</span><h2>Live-world adjudication</h2><p>Declared authoritative sources are fetched by every validator. Consensus scores criteria and returns PASS, REMEDIABLE, FAIL, or INCONCLUSIVE.</p></article>
            <article><span>03</span><h2>Economic recourse</h2><p>Matched exposure, exact cure reproduction, losing-party appeals, permissionless finalization, and timeout refunds turn the decision into safe settlement.</p></article>
          </div>
          <div className="flow-line"><b>CREATE</b><i /><b>ACCEPT</b><i /><b>SUBMIT</b><i /><b>ASSESS</b><i /><b>CURE / APPEAL</b><i /><b>SETTLE</b></div>
          <aside className="why-box"><div><span className="section-kicker">Why GenLayer</span><h2>The hard part is judgment, not payment.</h2></div><p>A deterministic contract can hold funds and compare hashes. It cannot decide whether an agent's work satisfies prose criteria against changing public facts. AgentMandate makes that judgment a validator-consensus operation and binds its result to value transfer.</p></aside>
        </main>
      )}

      <footer><span>AgentMandate / Agent Tank 2026</span><span>Testnet GEN only. No promised monetary value.</span></footer>
    </div>
  );
}

export default App;
