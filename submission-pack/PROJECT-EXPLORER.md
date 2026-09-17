# Project Explorer Application

## Project name

AgentMandate

## Primary tag

AI Agents

## Suggested topic tags

Agent Infrastructure, Future of Work

## One-liner

Evidence-bound autonomous-agent work agreements whose outcomes are judged by GenLayer consensus on Studio Next.

## Description

AgentMandate is an execution and recourse protocol for autonomous-agent work. A principal publishes a locked specification, live authority sources, and provider-bond requirement. The provider submits a commit-pinned deliverable with a SHA-256 digest. GenLayer validators render the submitted evidence and a declared authority source, then use validator consensus to return PASS, FAIL, REMEDIABLE, or INCONCLUSIVE. Every UI write quotes Studio Next transaction fees, waits for an accepted receipt, and refreshes state from the deployed contract. Evidence preflight hashes local bytes and enforces immutable pins. The provider agent perceives the Studio Next ledger on chain 61997, ranks opportunities, and prepares an acceptance action.

## How-to path

### 1. Create a mandate

Connect a Studio Next / Studio-dev wallet on chain 61997, open Create, enter the immutable specification URL and SHA-256, declare live authorities, set reward/bond/deadline, then publish.

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
- Contract: https://explorer-studio-dev.genlayer.com/contracts/0xFc127a1FfFD789B2F4697b3450d53c86D68a0bBB
- Deployment transaction: https://explorer-studio-dev.genlayer.com/transactions/0x76ca812acefb4c3152275ee8aa6267d782f83784153f31a4043d8acae7582e3e
