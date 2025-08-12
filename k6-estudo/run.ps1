param([string]$scenario = "smoke", [string]$scriptDir = "$PSScriptRoot\scripts")
if (-not (Get-Command k6 -ErrorAction SilentlyContinue)) {
  Write-Host "k6 não encontrado. Instale com winget install Grafana.k6 ou use Docker (ver README)."
  exit 1
}
$scriptPath = Join-Path $scriptDir ($scenario + ".js")
if (-not (Test-Path $scriptPath)) {
  Write-Host "Cenário $scenario não encontrado em $scriptDir"
  exit 1
}
k6 run $scriptPath