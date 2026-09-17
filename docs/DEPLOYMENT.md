# Deployment

## Preflight

```bash
npm ci
npm test
npm run verify
npm run build
python -m py_compile contracts/agent_mandate.py
python -m genvm_linter.cli check contracts/agent_mandate.py
```

## Studio Next contract (chain 61997)

Studio Next is the Studio-dev release-candidate environment. Use its canonical RPC, `https://studio-dev.genlayer.com/api`, and the matching v0.6 release-candidate tooling. Do not use the Bradbury or stable Studionet presets: they point at different chains.

```powershell
# Requires GenLayer CLI v0.40 RC or later and an unlocked, funded Studio Next account.
.\scripts\deploy-studio-next.ps1
```

The script verifies chain `61997`, requests a current non-zero fee quote, and sends the deployment with that fee deposit. If the account has no GEN on Studio Next, it stops; do not substitute Studionet or Bradbury.

Deploy without constructor arguments. Wait for `ACCEPTED`, verify validator agreement and `FINISHED_WITH_RETURN`, inspect the deployed schema, then call `get_policy` and `list_mandate_ids` as read canaries. Record the exact address, transaction hash, deployment timestamp, and source SHA-256 in `deployments/studio-next.json`.

## Frontend

Set both `VITE_AGENT_MANDATE_ADDRESS` (frontend) and `AGENT_MANDATE_ADDRESS` (headless scout) to the accepted chain-61997 contract, rebuild, and deploy the repository root. Verify the production bundle contains the accepted address and no fallback address.

## Reviewer app flow

1. Connect a wallet configured for Studio Next / Studio-dev (chain `61997`).
2. The app reads `list_mandate_ids` and `get_mandate` from the recorded Studio Next contract through `https://studio-dev.genlayer.com/api`.
3. Create a mandate, then accept it from a second wallet with the exact provider bond.
4. Submit immutable work and call **Run evaluation**. The frontend waits for an `ACCEPTED` receipt, then refreshes contract state.
5. Verify the resulting `PASS`, `FAIL`, `REMEDIABLE`, or `INCONCLUSIVE` state in the docket. Exercise cure/appeal/finalization as applicable.

