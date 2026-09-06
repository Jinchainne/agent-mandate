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

AgentMandate is an execution and recourse protocol for autonomous-agent work. A principal locks a specification, live authorities, reward, and provider bond before an agent accepts. The provider submits a commit-pinned deliverable with a SHA-256 digest. GenLayer validators fetch exact bytes and current authority data, score every criterion, and open payout, failure, an exact cure, or an inconclusive state. The losing party gets a bonded appeal. Every UI write waits for an accepted receipt and refreshes chain state. Evidence preflight hashes local bytes and enforces immutable pins. The provider agent repeatedly perceives the Bradbury ledger, applies explainable reward, bond, deadline, authority, and integrity policy, ranks opportunities, and prepares the exact acceptance action. Agent Kit exports portable execution manifests, while a headless CLI runs the same policy engine without a trusted platform API.

## How-to path

### 1. Create a mandate

Connect a Bradbury wallet, open Create, enter the immutable specification URL and SHA-256, declare live authorities, set reward/bond/deadline, then publish.

### 2. Run the provider agent

Open Agent Kit, configure reward, bond, runway, return, and authority policy, then run a live cycle. Inspect the ranked decision trace and authorize the top passing acceptance with a provider wallet.

### 3. Submit immutable work

As provider, enter a full-commit GitHub deliverable URL and matching SHA-256, then wait for the accepted receipt.

### 4. Run consensus

Click Run evaluation. Validators fetch the locked bytes and live authorities; the UI refreshes to PASS, REMEDIABLE, FAIL, or INCONCLUSIVE.

### 5. Cure, appeal, or finalize

Answer an exact cure if requested. Otherwise the losing party may file a bonded appeal, or anyone can finalize after the review window.

## Expected verification outcome

The steward sees real wallet writes, accepted receipt waiting, and refreshed on-chain state. Immutable source hashes are verified before prompting; live authorities are fetched by validators. Exact cure disagreement blocks settlement. Only the losing party can appeal, inconclusive paths return principals, and terminal accounting cannot execute twice.

## Links

- Website: https://agentmandategl.vercel.app/
- GitHub: https://github.com/Jinchainne/agent-mandate
- Contract: https://explorer-bradbury.genlayer.com/address/0x74D9b10d6D4274e9B73C507CDB3AE2E67874f617
