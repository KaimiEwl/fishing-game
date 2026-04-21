param(
  [Parameter(Mandatory = $true)]
  [string]$WalletAddress,

  [Parameter(Mandatory = $true)]
  [string]$SessionToken,

  [string]$BaseUrl = $env:VITE_SUPABASE_URL,
  [string]$AnonKey = $env:VITE_SUPABASE_PUBLISHABLE_KEY,

  [int]$WithdrawLimit = 10,
  [int]$SuspiciousLimit = 10,
  [int]$SocialLimit = 10,
  [int]$WeeklyBatchLimit = 5
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$invokeScript = Join-Path $scriptDir "invoke-edge.ps1"

function Invoke-OpsAction {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FunctionName,

    [Parameter(Mandatory = $true)]
    [string]$Action,

    [hashtable]$Payload = @{}
  )

  $bodyJson = ($Payload | ConvertTo-Json -Depth 20 -Compress)

  & $invokeScript `
    -FunctionName $FunctionName `
    -Action $Action `
    -WalletAddress $WalletAddress `
    -SessionToken $SessionToken `
    -BaseUrl $BaseUrl `
    -AnonKey $AnonKey `
    -BodyJson $bodyJson
}

$adminCheck = Invoke-OpsAction -FunctionName "admin" -Action "check_admin"
if (-not $adminCheck.is_admin) {
  throw "Wallet does not have admin access for this report."
}

$withdrawSummary = Invoke-OpsAction -FunctionName "admin" -Action "get_admin_withdraw_summary"
$pendingWithdraws = Invoke-OpsAction -FunctionName "admin" -Action "list_withdraw_requests" -Payload @{
  status = "pending"
  limit = $WithdrawLimit
}
$weeklyPreview = Invoke-OpsAction -FunctionName "admin" -Action "preview_weekly_payouts"
$weeklyBatches = Invoke-OpsAction -FunctionName "admin" -Action "list_weekly_payout_batches" -Payload @{
  limit = $WeeklyBatchLimit
}
$suspiciousSummary = Invoke-OpsAction -FunctionName "admin" -Action "get_suspicious_summary"
$suspiciousPlayers = Invoke-OpsAction -FunctionName "admin" -Action "list_suspicious_players" -Payload @{
  limit = $SuspiciousLimit
}
$pendingSocial = Invoke-OpsAction -FunctionName "admin" -Action "list_social_task_verifications" -Payload @{
  status = "pending_verification"
  limit = $SocialLimit
}
$verifiedSocial = Invoke-OpsAction -FunctionName "admin" -Action "list_social_task_verifications" -Payload @{
  status = "verified"
  limit = $SocialLimit
}

$report = [PSCustomObject]@{
  generatedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
  projectUrl = $BaseUrl
  adminWalletAddress = $WalletAddress.ToLowerInvariant()
  adminCheck = $adminCheck
  withdrawSummary = $withdrawSummary.summary
  pendingWithdrawRequests = $pendingWithdraws.requests
  weeklyPreview = [PSCustomObject]@{
    weekKey = $weeklyPreview.week_key
    alreadyApplied = $weeklyPreview.already_applied
    previewCount = @($weeklyPreview.preview).Count
    preview = $weeklyPreview.preview
  }
  weeklyBatches = $weeklyBatches.batches
  suspiciousSummary = $suspiciousSummary.summary
  suspiciousPlayers = $suspiciousPlayers.players
  socialQueue = [PSCustomObject]@{
    pendingVerificationCount = @($pendingSocial.verifications).Count
    pendingVerification = $pendingSocial.verifications
    verifiedCount = @($verifiedSocial.verifications).Count
    verifiedReadyToClaim = $verifiedSocial.verifications
  }
}

$report | ConvertTo-Json -Depth 20
