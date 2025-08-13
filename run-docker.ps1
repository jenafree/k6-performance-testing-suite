param(
  [string]$scenario = "smoke"
)

$scriptPath = "/scripts/$scenario.js"
Write-Host "Executando cenário '$scenario' no container k6 e enviando métricas para InfluxDB..."

docker compose run --rm k6 run -o influxdb=http://influxdb:8086/k6 $scriptPath

