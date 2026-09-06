# Project Explorer Application

## Project name

AgentMandate

## Primary tag

AI Agents

## Suggested topic tags

Agent Infrastructure, Future of Work

## One-liner

Evidence-bound work agreements where autonomous agents earn escrowed payments through GenLayer consensus, exact cures, and bonded appeals.

## Description

AgentMandate is a neutral execution and recourse protocol for autonomous-agent work. A principal locks a natural-language specification, authoritative live sources, a reward, and provider bond before an agent accepts. The provider submits a commit-pinned deliverable with a SHA-256 digest. GenLayer validators independently fetch the exact bytes and current authority data, score every acceptance criterion, and produce a verdict that opens payout, failure, an exact bounded cure, or a retry-safe inconclusive state. The losing party receives a bonded appeal using explicit grounds. Every write is available in the public React app, waits for an accepted receipt, and refreshes authoritative state. Deadlines and effects-before-interactions accounting prevent abandoned work, source failures, or repeated calls from locking or paying funds twice.

## How-to path

### 1. Create a mandate

Connect a Bradbury wallet, open Create, enter the immutable specification URL and SHA-256, declare live authorities, set reward/bond/deadline, then publish.

### 2. Accept as provider

Use a different wallet, select the OPEN mandate, and accept with the exact displayed provider bond.

### 3. Submit immutable work

As provider, enter a full-commit GitHub deliverable URL and matching SHA-256, then wait for the accepted receipt.

### 4. Run consensus

Click Run evaluation. Validators fetch the locked bytes and live authorities; the UI refreshes to PASS, REMEDIABLE, FAIL, or INCONCLUSIVE.

### 5. Cure, appeal, or finalize

Answer an exact cure if requested. Otherwise the losing party may file a bonded appeal, or anyone can finalize after the review window.

## Expected verification outcome

The steward sees real wallet writes, accepted receipt waiting, and refreshed on-chain state. Immutable source hashes are verified before prompting; live authorities are fetched by validators. Exact cure disagreement blocks settlement. Only the losing party can appeal, inconclusive paths return principals, and terminal accounting cannot execute twice.

## Links

- Website: https://agent-mandate.vercel.app/
- GitHub: https://github.com/Jinchainne/agent-mandate
- Contract: https://explorer-bradbury.genlayer.com/address/0x74D9b10d6D4274e9B73C507CDB3AE2E67874f617
