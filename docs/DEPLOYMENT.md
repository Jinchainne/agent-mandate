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

## Bradbury contract

Deploy `contracts/agent_mandate.py` without constructor arguments. Wait for `ACCEPTED`, verify validator agreement and `FINISHED_WITH_RETURN`, inspect the deployed schema, then call `get_policy` and `list_mandate_ids` as read canaries.

Record the exact address, transaction hash, deployment timestamp, and source SHA-256 in `deployments/bradbury.json`.

## Frontend

Set `VITE_AGENT_MANDATE_ADDRESS` to the accepted contract, rebuild, and deploy the repository root. Verify the production bundle contains the accepted address and no zero-address fallback.

