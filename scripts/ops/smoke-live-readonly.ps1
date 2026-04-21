param(
  [Parameter(Mandatory = $true)]
  [string]$WalletAddress,

  [Parameter(Mandatory = $true)]
  [string]$SessionToken,

  [string]$BaseUrl = $env:VITE_SUPABASE_URL,
  [string]$AnonKey = $env:VITE_SUPABASE_PUBLISHABLE_KEY
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$invokeScript = Join-Path $scriptDir "invoke-edge.ps1"

Write-Host ""
Write-Host "== Admin check =="
& $invokeScript `
  -FunctionName "admin" `
  -Action "check_admin" `
  -WalletAddress $WalletAddress `
  -SessionToken $SessionToken `
  -BaseUrl $BaseUrl `
  -AnonKey $AnonKey | ConvertTo-Json -Depth 20

Write-Host ""
Write-Host "== Withdraw summary =="
& $invokeScript `
  -FunctionName "admin" `
  -Action "get_admin_withdraw_summary" `
  -WalletAddress $WalletAddress `
  -SessionToken $SessionToken `
  -BaseUrl $BaseUrl `
  -AnonKey $AnonKey | ConvertTo-Json -Depth 20

Write-Host ""
Write-Host "== Weekly payout preview =="
& $invokeScript `
  -FunctionName "admin" `
  -Action "preview_weekly_payouts" `
  -WalletAddress $WalletAddress `
  -SessionToken $SessionToken `
  -BaseUrl $BaseUrl `
  -AnonKey $AnonKey | ConvertTo-Json -Depth 20

Write-Host ""
Write-Host "== Suspicious summary =="
& $invokeScript `
  -FunctionName "admin" `
  -Action "get_suspicious_summary" `
  -WalletAddress $WalletAddress `
  -SessionToken $SessionToken `
  -BaseUrl $BaseUrl `
  -AnonKey $AnonKey | ConvertTo-Json -Depth 20

Write-Host ""
Write-Host "== Suspicious players =="
& $invokeScript `
  -FunctionName "admin" `
  -Action "list_suspicious_players" `
  -WalletAddress $WalletAddress `
  -SessionToken $SessionToken `
  -BaseUrl $BaseUrl `
  -AnonKey $AnonKey `
  -BodyJson '{"limit":10}' | ConvertTo-Json -Depth 20

Write-Host ""
Write-Host "== MON summary =="
& $invokeScript `
  -FunctionName "player-mon" `
  -Action "get_mon_summary" `
  -WalletAddress $WalletAddress `
  -SessionToken $SessionToken `
  -BaseUrl $BaseUrl `
  -AnonKey $AnonKey | ConvertTo-Json -Depth 20
