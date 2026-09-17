param(
  [string]$ContractPath = "contracts/agent_mandate_studio_next.py"
)

$ErrorActionPreference = "Stop"

$cli = "npx --yes genlayer@0.40.0-rc.3"
Invoke-Expression "$cli network set studio-dev"
$network = Invoke-Expression "$cli network info" | Out-String
if ($network -notmatch "chainId: '61997'" -or $network -notmatch "studio-dev.genlayer.com/api") {
  throw "Studio Next network verification failed."
}

# Studio Next requires an explicit non-zero fee deposit. Quote it immediately
# before deployment because network pricing is dynamic.
$quoteLine = Invoke-Expression "$cli estimate-fees --json" | Where-Object { $_ -match '^\{' } | Select-Object -Last 1
if (-not $quoteLine) { throw "GenLayer CLI did not return a fee quote." }
$quote = $quoteLine | ConvertFrom-Json
$fees = @{ distribution = $quote.distribution } | ConvertTo-Json -Compress -Depth 12

Write-Host "Deploying $ContractPath to Studio Next (chain 61997)..."
Invoke-Expression "$cli deploy --contract $ContractPath --fees '$fees' --fee-value $($quote.feeValue)"
