# Security Policy

AgentMandate is a Bradbury testnet experiment. Faucet-issued test GEN has no promised monetary value.

## Trust boundaries

The frontend is untrusted. Wallet ownership, roles, deadlines, digest formats, state transitions, appeal eligibility, and settlement accounting are enforced by the contract.

Immutable source content and live web pages can contain prompt injection. The contract separates them as untrusted evidence, verifies immutable bytes before decoding, uses strict JSON schemas, validates cross-field invariants, and requires validator replication of settlement-controlling fields.

## Core controls

- Full-commit GitHub URLs and SHA-256 are required for specifications and party-produced evidence.
- Live authority URLs are bounded, fixed before provider acceptance, and reject local/private/metadata targets.
- Provider and appeal bonds must match exactly.
- `PASS` requires all reported criteria to be satisfied.
- `REMEDIABLE` requires one non-empty exact cure and stores its digest.
- Cure validators must reproduce the stored requirement digest.
- Only the current losing party can appeal.
- Transport and digest failures are inconclusive, never an automatic win.
- Settlement effects happen before transfers and cannot execute twice.
- Permissionless deadlines prevent abandoned work or consensus uncertainty from locking funds forever.

## Known limitations

Generic HTTPS authority validation cannot prove that a chosen domain is institutionally authoritative. The principal declares sources before acceptance and the provider prices that source risk into acceptance. Production versions should add source registries, DNS/IP resolution checks, content-size enforcement at transport, and richer multi-authority quorum policies.

## Reporting

Open a GitHub issue without secrets. Never publish private keys, wallet recovery phrases, API keys, GitHub tokens, or Vercel tokens.

