# Release Audit Mandate

## Objective

Inspect the AgentMandate release and publish an evidence-backed audit manifest for the exact repository revision assigned by the principal.

## Acceptance criteria

1. Identify the exact commit reviewed and include its full 40-character hash.
2. Confirm that the production build completes without TypeScript errors.
3. Confirm that contract compilation and GenVM validation pass.
4. List every public write method exposed by the deployed contract schema.
5. Record whether the live application references the same accepted contract address.
6. Include links to the immutable source revision and Bradbury explorer contract.

## Output

Submit one Markdown or JSON manifest in a public GitHub repository pinned to a full commit. The manifest must state pass/fail for every criterion and must not rely on screenshots alone.

