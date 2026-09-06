# Autonomous Agent Runtime

AgentMandate includes a provider-side opportunity agent, not merely agent-themed copy. The same policy engine powers the browser runtime and the headless CLI scout.

## Control loop

1. **Perceive:** read `list_mandate_ids`, then fetch every record through `get_mandate` on Bradbury.
2. **Qualify:** fail closed unless the mandate is open, commit-pinned, digest-bound, sufficiently funded, within bond exposure, within deadline runway, and backed by an allowed authority domain.
3. **Rank:** place fully executable opportunities first, then order by policy score and reward.
4. **Explain:** retain every passed and failed constraint in the decision trace.
5. **Act:** the browser agent selects the top passing mandate and prepares `accept_mandate` with the exact required bond. The connected wallet remains the explicit authorization boundary.
6. **Observe:** wait for an `ACCEPTED` GenLayer receipt and refresh authoritative contract state.

The agent never auto-signs, stores a private key, or weakens wallet consent. Autonomous perception and selection are separated from custody by design.

## Headless scout

```bash
npm run agent:scan
```

Optional environment policy:

```text
AGENT_MIN_REWARD_GEN=0.02
AGENT_MAX_BOND_GEN=0.01
AGENT_MIN_RETURN_MULTIPLE=3
AGENT_MIN_LEAD_HOURS=24
AGENT_AUTHORITY_DOMAIN=github.com
```

The command emits a machine-readable cycle containing perception metadata, active policy, ranked decisions, rationales, and complete constraint traces. It performs no signing and needs no secret.

