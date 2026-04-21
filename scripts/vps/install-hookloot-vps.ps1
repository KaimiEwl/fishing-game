param(
  [string]$SshHost = "vm3661",
  [string]$ServerBootstrapDir = "/tmp/hookloot-bootstrap",
  [string]$RootDir = "/opt/hookloot",
  [string]$KeyPath = "C:/Video Test/Antigravity Projects/nft-miner-game/TELEGRAM LIVE/id_ed25519"
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$sshOptions = @(
  "-i", $KeyPath,
  "-o", "BatchMode=yes",
  "-o", "StrictHostKeyChecking=accept-new",
  "-o", "ConnectTimeout=8",
  "-o", "PreferredAuthentications=publickey",
  "-o", "RequestTTY=no"
)

$serverFiles = @(
  (Join-Path $repoRoot "deploy\vps\server\bootstrap-hookloot.sh"),
  (Join-Path $repoRoot "deploy\vps\server\post-receive"),
  (Join-Path $repoRoot "deploy\vps\server\deploy-hookloot.sh"),
  (Join-Path $repoRoot "deploy\vps\server\healthcheck.sh"),
  (Join-Path $repoRoot "deploy\vps\server\prune-releases.sh")
)

foreach ($file in $serverFiles) {
  if (-not (Test-Path $file)) {
    throw "Missing required file: $file"
  }
}

& ssh @sshOptions $SshHost "rm -rf '$ServerBootstrapDir' && mkdir -p '$ServerBootstrapDir'"
foreach ($file in $serverFiles) {
  & scp @sshOptions $file "${SshHost}:${ServerBootstrapDir}/"
}

& ssh @sshOptions $SshHost "chmod +x '$ServerBootstrapDir'/*.sh && '$ServerBootstrapDir/bootstrap-hookloot.sh' '$ServerBootstrapDir' '$RootDir'"
