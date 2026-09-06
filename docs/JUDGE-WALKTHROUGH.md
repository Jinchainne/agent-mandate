# Judge Walkthrough

## Exact path

1. Open the public application and connect a Bradbury-compatible wallet.
2. Select **Create** and fund a mandate with a full-commit specification URL, its SHA-256, one live authority, reward, provider bond, and future deadline.
3. From a different wallet, open the mandate and accept it with the exact displayed bond.
4. As provider, submit a full-commit GitHub deliverable URL and matching SHA-256.
5. Run evaluation and wait for the accepted receipt. The UI refreshes the contract state.
6. If `REMEDIABLE`, submit immutable cure evidence and run **Evaluate exact cure**.
7. If `DECIDED`, let the losing party file an explicit-ground bonded appeal or finalize after the review window.
8. Inspect the terminal zeroed accounting and explorer transaction.

## Expected verification outcome

The reviewer should see that every visible action writes the deployed contract, waits for an accepted receipt, and refreshes on-chain state. Validator-fetching and semantic consensus must determine the verdict. A digest mismatch or source failure must remain inconclusive and must not pay either alleged winner. Exact cure-digest disagreement must prevent settlement. Only the losing wallet can appeal, and no terminal route can pay twice.

## Code evidence

- `contracts/agent_mandate.py`: `_fetch_anchor`, `_assess`, `evaluate_cure`, `adjudicate_appeal`, `_settle`.
- `src/lib/genlayer.ts`: every write plus accepted receipt waiting.
- `src/App.tsx`: role-oriented transaction controls and authoritative refresh.
- `tests/test_contract_behavior.py`: economic and consensus regressions.

