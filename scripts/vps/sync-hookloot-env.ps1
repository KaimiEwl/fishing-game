param(
  [string]$SshHost = "vm3661",
  [string]$RemoteEnvPath = "/opt/hookloot/.env.production",
  [string]$KeyPath = "C:/Video Test/Antigravity Projects/nft-miner-game/TELEGRAM LIVE/id_ed25519"
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$envPath = Join-Path $repoRoot ".env"
$wagmiPath = Join-Path $repoRoot "src\lib\wagmi.ts"

if (-not (Test-Path $envPath)) {
  throw "Missing local .env at $envPath"
}

$sshOptions = @(
  "-i", $KeyPath,
  "-o", "BatchMode=yes",
  "-o", "StrictHostKeyChecking=accept-new",
  "-o", "ConnectTimeout=8",
  "-o", "PreferredAuthentications=publickey",
  "-o", "RequestTTY=no"
)

$envMap = @{}
foreach ($line in Get-Content $envPath) {
  if ($line -match '^\s*#' -or [string]::IsNullOrWhiteSpace($line)) {
    continue
  }

  $parts = $line -split '=', 2
  if ($parts.Count -ne 2) {
    continue
  }

  $key = $parts[0].Trim()
  $value = $parts[1].Trim().Trim('"')
  $envMap[$key] = $value
}

$walletConnectProjectId = $envMap["VITE_WALLETCONNECT_PROJECT_ID"]
if (-not $walletConnectProjectId -and (Test-Path $wagmiPath)) {
  $wagmiMatch = Select-String -Path $wagmiPath -Pattern "VITE_WALLETCONNECT_PROJECT_ID \|\| '([^']+)'" | Select-Object -First 1
  if ($wagmiMatch) {
    $walletConnectProjectId = $wagmiMatch.Matches[0].Groups[1].Value
  }
}

$required = @("VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY")
foreach ($key in $required) {
  if (-not $envMap[$key]) {
    throw "Missing $key in local .env"
  }
}

$content = New-Object System.Collections.Generic.List[string]
$content.Add("VITE_BASE_PATH=/")
$content.Add("VITE_SUPABASE_URL=$($envMap["VITE_SUPABASE_URL"])")
$content.Add("VITE_SUPABASE_PUBLISHABLE_KEY=$($envMap["VITE_SUPABASE_PUBLISHABLE_KEY"])")
$content.Add("VITE_WALLETCONNECT_PROJECT_ID=$walletConnectProjectId")

$excludedKeys = @(
  "VITE_BASE_PATH",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_WALLETCONNECT_PROJECT_ID"
)

foreach ($key in ($envMap.Keys | Sort-Object)) {
  if (-not $key.StartsWith("VITE_")) {
    continue
  }

  if ($excludedKeys -contains $key) {
    continue
  }

  $content.Add("$key=$($envMap[$key])")
}

$tempFile = Join-Path $env:TEMP "hookloot.env.production"
Set-Content -Path $tempFile -Value $content -NoNewline:$false

& scp @sshOptions $tempFile "${SshHost}:${RemoteEnvPath}"
& ssh @sshOptions $SshHost "chmod 600 '$RemoteEnvPath' && echo 'Synced $RemoteEnvPath'"
