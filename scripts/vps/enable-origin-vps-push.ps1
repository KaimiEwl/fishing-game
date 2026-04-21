param(
  [string]$OriginRemoteName = "origin",
  [string]$VpsPushUrl = "vm3661:/opt/hookloot/repo.git"
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot

$originFetchUrl = (git remote get-url $OriginRemoteName).Trim()
if (-not $originFetchUrl) {
  throw "Could not read fetch URL for remote '$OriginRemoteName'"
}

git config --unset-all "remote.$OriginRemoteName.pushurl" 2>$null
git config --add "remote.$OriginRemoteName.pushurl" $originFetchUrl
git config --add "remote.$OriginRemoteName.pushurl" $VpsPushUrl

git remote -v
