param(
  [string]$SshHost = "hookloot-vps",
  [string]$RemoteEnvPath = "/opt/hookloot/.env.production",
  [string]$KeyPath = $env:HOOKLOOT_SSH_KEY
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$envPath = Join-Path $repoRoot ".env"
$wagmiPath = Join-Path $repoRoot "src\lib\wagmi.ts"

if (-not (Test-Path $envPath)) {
  throw "Missing local .env at $envPath"
}

$sshOptions = @(
  "-o", "BatchMode=yes",
  "-o", "StrictHostKeyChecking=accept-new",
  "-o", "ConnectTimeout=8",
  "-o", "PreferredAuthentications=publickey",
  "-o", "RequestTTY=no"
)
if (-not [string]::IsNullOrWhiteSpace($KeyPath)) {
  $sshOptions = @("-i", $KeyPath) + $sshOptions
}

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

if (-not $envMap["HOOKLOOT_SESSION_SECRET"] -and -not $envMap["SESSION_TOKEN_SECRET"]) {
  throw "Missing HOOKLOOT_SESSION_SECRET or SESSION_TOKEN_SECRET in local .env"
}

$content = New-Object System.Collections.Generic.List[string]
$content.Add("VITE_BASE_PATH=/")
$content.Add("VITE_WALLETCONNECT_PROJECT_ID=$walletConnectProjectId")

$publicViteKeys = @(
  "VITE_BAIT_BUCKETS_V2_ENABLED",
  "VITE_COLLECTION_BOOK_ENABLED",
  "VITE_COLLECTION_BOOK_ROLLOUT_PERCENT",
  "VITE_CUBE_REBALANCE_ENABLED",
  "VITE_CUBE_REBALANCE_ROLLOUT_PERCENT",
  "VITE_ECONOMY_ROLLOUT_ALLOWLIST",
  "VITE_LEGACY_DAILY_BONUS_DISABLED",
  "VITE_PLAYER_AUDIT_LOGS_ENABLED",
  "VITE_PREMIUM_SESSIONS_ENABLED",
  "VITE_PREMIUM_SESSIONS_ROLLOUT_PERCENT",
  "VITE_REFERRAL_BAIT_ENABLED",
  "VITE_WALLET_BAIT_BONUS_ENABLED",
  "VITE_WEEKLY_MISSIONS_ENABLED",
  "VITE_WEEKLY_MISSIONS_ROLLOUT_PERCENT"
)

foreach ($key in ($envMap.Keys | Sort-Object)) {
  if ($publicViteKeys -notcontains $key) {
    continue
  }

  $content.Add("$key=$($envMap[$key])")
}

$serverKeys = @(
  "HOOKLOOT_SESSION_SECRET",
  "SESSION_TOKEN_SECRET",
  "HOOKLOOT_RECEIVER_ADDRESS",
  "HOOKLOOT_ADMIN_WALLETS",
  "ADMIN_WALLET_ADDRESS",
  "MONAD_RPC_URL",
  "HOOKLOOT_ALLOW_UNVERIFIED_PAYMENTS"
)

foreach ($key in $serverKeys) {
  if ($envMap[$key]) {
    $content.Add("$key=$($envMap[$key])")
  }
}

$tempFile = Join-Path $env:TEMP "hookloot.env.production"
Set-Content -Path $tempFile -Value $content -NoNewline:$false

& scp @sshOptions $tempFile "${SshHost}:${RemoteEnvPath}"
& ssh @sshOptions $SshHost "chmod 600 '$RemoteEnvPath' && echo 'Synced $RemoteEnvPath'"
