$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = ".\backups"
$backupFile = "$backupDir\backup_$timestamp.dump"

$pgDump = "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"
$databaseUrl = $env:DATABASE_URL

if (-not (Test-Path $backupDir)) {
  New-Item -ItemType Directory -Path $backupDir | Out-Null
}

if (-not $databaseUrl) {
  Write-Host "DATABASE_URL is not set"
  exit 1
}

& $pgDump $databaseUrl -F c -f $backupFile

if ($LASTEXITCODE -eq 0) {
  Write-Host "Backup created: $backupFile"
} else {
  Write-Host "Backup failed"
  exit 1
}