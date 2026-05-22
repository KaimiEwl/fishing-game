param(
  [Parameter(Mandatory = $true)]
  [string]$FunctionName,

  [Parameter(Mandatory = $true)]
  [string]$Action,

  [Parameter(Mandatory = $true)]
  [string]$WalletAddress,

  [Parameter(Mandatory = $true)]
  [string]$SessionToken,

  [string]$BaseUrl = $(if ($env:HOOKLOOT_API_BASE_URL) { $env:HOOKLOOT_API_BASE_URL } else { "http://127.0.0.1:8787" }),
  [string]$BodyJson = "{}"
)

if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  throw "Missing BaseUrl. Pass -BaseUrl or export HOOKLOOT_API_BASE_URL."
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

$uri = "$($BaseUrl.TrimEnd('/'))/api/edge/$FunctionName"
$jsonBody = $payload | ConvertTo-Json -Depth 20

Invoke-RestMethod -Method Post -Uri $uri -ContentType "application/json" -Body $jsonBody
