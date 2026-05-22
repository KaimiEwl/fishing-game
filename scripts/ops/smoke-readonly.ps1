param(
  [Parameter(Mandatory = $true)]
  [string]$WalletAddress,

  [Parameter(Mandatory = $true)]
  [string]$SessionToken,

  [string]$BaseUrl = $(if ($env:HOOKLOOT_API_BASE_URL) { $env:HOOKLOOT_API_BASE_URL } else { "http://127.0.0.1:8787" })
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$invokeScript = Join-Path $scriptDir "invoke-edge.ps1"

Write-Host ""
Write-Host "== Owned API admin check =="
& $invokeScript `
  -FunctionName "admin" `
  -Action "check_admin" `
  -WalletAddress $WalletAddress `
  -SessionToken $SessionToken `
  -BaseUrl $BaseUrl | ConvertTo-Json -Depth 20

Write-Host ""
Write-Host "== Withdraw summary =="
& $invokeScript `
  -FunctionName "admin" `
  -Action "get_admin_withdraw_summary" `
  -WalletAddress $WalletAddress `
  -SessionToken $SessionToken `
  -BaseUrl $BaseUrl | ConvertTo-Json -Depth 20

Write-Host ""
Write-Host "== Weekly payout preview =="
& $invokeScript `
  -FunctionName "admin" `
  -Action "preview_weekly_payouts" `
  -WalletAddress $WalletAddress `
  -SessionToken $SessionToken `
  -BaseUrl $BaseUrl | ConvertTo-Json -Depth 20

Write-Host ""
Write-Host "== Suspicious summary =="
& $invokeScript `
  -FunctionName "admin" `
  -Action "get_suspicious_summary" `
  -WalletAddress $WalletAddress `
  -SessionToken $SessionToken `
  -BaseUrl $BaseUrl | ConvertTo-Json -Depth 20

Write-Host ""
Write-Host "== Suspicious players =="
& $invokeScript `
  -FunctionName "admin" `
  -Action "list_suspicious_players" `
  -WalletAddress $WalletAddress `
  -SessionToken $SessionToken `
  -BaseUrl $BaseUrl `
  -BodyJson '{"limit":10}' | ConvertTo-Json -Depth 20

Write-Host ""
Write-Host "== MON summary =="
& $invokeScript `
  -FunctionName "player-mon" `
  -Action "get_mon_summary" `
  -WalletAddress $WalletAddress `
  -SessionToken $SessionToken `
  -BaseUrl $BaseUrl | ConvertTo-Json -Depth 20
