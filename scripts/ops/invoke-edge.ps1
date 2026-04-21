param(
  [Parameter(Mandatory = $true)]
  [string]$FunctionName,

  [Parameter(Mandatory = $true)]
  [string]$Action,

  [Parameter(Mandatory = $true)]
  [string]$WalletAddress,

  [Parameter(Mandatory = $true)]
  [string]$SessionToken,

  [string]$BaseUrl = $env:VITE_SUPABASE_URL,
  [string]$AnonKey = $env:VITE_SUPABASE_PUBLISHABLE_KEY,
  [string]$BodyJson = "{}"
)

if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  throw "Missing BaseUrl. Pass -BaseUrl or export VITE_SUPABASE_URL."
}

if ([string]::IsNullOrWhiteSpace($AnonKey)) {
  throw "Missing AnonKey. Pass -AnonKey or export VITE_SUPABASE_PUBLISHABLE_KEY."
}

$extraBody = @{}
if (-not [string]::IsNullOrWhiteSpace($BodyJson)) {
  $parsedBody = $BodyJson | ConvertFrom-Json
  if ($parsedBody -is [System.Collections.IDictionary]) {
    foreach ($entry in $parsedBody.GetEnumerator()) {
      $extraBody[$entry.Key] = $entry.Value
    }
  } elseif ($parsedBody) {
    foreach ($property in $parsedBody.PSObject.Properties) {
      $extraBody[$property.Name] = $property.Value
    }
  }
}

$payload = @{
  action = $Action
  wallet_address = $WalletAddress.ToLowerInvariant()
  session_token = $SessionToken
}

foreach ($key in $extraBody.Keys) {
  $payload[$key] = $extraBody[$key]
}

$headers = @{
  apikey        = $AnonKey
  Authorization = "Bearer $AnonKey"
}

$uri = "$BaseUrl/functions/v1/$FunctionName"
$jsonBody = $payload | ConvertTo-Json -Depth 20

Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -ContentType "application/json" -Body $jsonBody
