param(
  [string]$RemoteName = "vps",
  [string]$RemoteUrl = "vm3661:/opt/hookloot/repo.git"
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot

$existing = git remote
if ($existing -contains $RemoteName) {
  git remote set-url $RemoteName $RemoteUrl
} else {
  git remote add $RemoteName $RemoteUrl
}

git remote -v
