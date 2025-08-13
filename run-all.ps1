param(
  [string[]]$scenarios = @("smoke", "load", "stress", "spike", "soak", "auth", "api-crud", "breaking-point", "capacity", "endurance", "volume"),
  [string]$scriptDir = "$PSScriptRoot\scripts",
  [string]$resultsRoot = "$PSScriptRoot\results"
)

if (-not (Get-Command k6 -ErrorAction SilentlyContinue)) {
  Write-Host "k6 não encontrado. Instale com winget install Grafana.k6 ou use Docker (ver README)."
  exit 1
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$runDir = Join-Path $resultsRoot $timestamp
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

$results = @()

foreach ($scenario in $scenarios) {
  $scriptPath = Join-Path $scriptDir ($scenario + ".js")
  if (-not (Test-Path $scriptPath)) {
    Write-Warning "Cenário '$scenario' não encontrado em $scriptDir. Pulando."
    $results += [PSCustomObject]@{
      Scenario = $scenario
      Status   = "skipped"
      ExitCode = $null
      Script   = $scriptPath
      Summary  = $null
      Log      = $null
    }
    continue
  }

  $summaryPath = Join-Path $runDir ("{0}.summary.json" -f $scenario)
  $logPath = Join-Path $runDir ("{0}.console.log" -f $scenario)

  Write-Host "▶ Executando cenário '$scenario'..."
  & k6 run $scriptPath --summary-export $summaryPath *>&1 | Tee-Object -FilePath $logPath
  $exit = $LASTEXITCODE

  $status = if ($exit -eq 0) { "passed" } else { "failed" }

  $sumPathOut = $null
  if (Test-Path $summaryPath) { $sumPathOut = $summaryPath }
  $logPathOut = $null
  if (Test-Path $logPath) { $logPathOut = $logPath }

  $results += [PSCustomObject]@{
    Scenario = $scenario
    Status   = $status
    ExitCode = $exit
    Script   = $scriptPath
    Summary  = $sumPathOut
    Log      = $logPathOut
  }
}

# Salva agregação da execução
$aggregate = [PSCustomObject]@{
  startedAt = (Get-Date).ToString("s")
  runDir    = $runDir
  results   = $results
}
$aggregatePath = Join-Path $runDir "aggregate.json"
$aggregate | ConvertTo-Json -Depth 5 | Out-File -Encoding UTF8 $aggregatePath

# Imprime resumo
Write-Host ""
Write-Host "==== Resumo ===="
foreach ($r in $results) {
  $ec = if ($null -eq $r.ExitCode) { "-" } else { $r.ExitCode }
  Write-Host ("{0,-8} {1,-7} exit={2}" -f $r.Scenario, $r.Status, $ec)
}
Write-Host ""
Write-Host "Resultados salvos em: $runDir"
Write-Host "Arquivo agregado: $aggregatePath"

# Exit code geral (falha se qualquer cenário falhar)
$failed = $results | Where-Object { $_.Status -eq "failed" }
if ($failed.Count -gt 0) {
  exit 1
} else {
  exit 0
}


