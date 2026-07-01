# ─────────────────────────────────────────────────────────────────
# deploy.ps1  —  Deploy Lilly's → VPS (lilly.upflu.digital:3003)
#
# Uso:
#   .\deploy.ps1           deploy completo
#   .\deploy.ps1 -Restart  só reinicia PM2
#   .\deploy.ps1 -Status   status PM2
#   .\deploy.ps1 -Logs     logs em tempo real
#   .\deploy.ps1 -Ssh      terminal interativo no VPS
# ─────────────────────────────────────────────────────────────────
param(
    [string]$VpsHost = "152.228.142.26",
    [string]$VpsUser = "ubuntu",
    [string]$Remote  = "/opt/lillys",
    [string]$KeyFile = "$env:USERPROFILE\.ssh\id_ovh",
    [switch]$Restart,
    [switch]$Status,
    [switch]$Logs,
    [switch]$Ssh
)

$VPS       = "${VpsUser}@${VpsHost}"
$LocalPath = $PSScriptRoot

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "    $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "`nERRO: $msg" -ForegroundColor Red; exit 1 }
function Invoke-Remote { param($cmd); ssh -i $KeyFile -o StrictHostKeyChecking=no $VPS $cmd }

function Check-SSH {
    Step "Conectando em $VPS..."
    $r = ssh -i $KeyFile -o ConnectTimeout=10 -o StrictHostKeyChecking=no $VPS "echo ok" 2>&1
    if ($LASTEXITCODE -ne 0) { Fail "SSH falhou. Chave: $KeyFile" }
    Ok "Conectado."
}

if ($Ssh)     { ssh -i $KeyFile -o StrictHostKeyChecking=no $VPS; exit 0 }
if ($Status)  { Check-SSH; Invoke-Remote "pm2 show lillys"; exit 0 }
if ($Logs)    { Check-SSH; ssh -i $KeyFile -o StrictHostKeyChecking=no $VPS "pm2 logs lillys --lines 80"; exit 0 }
if ($Restart) { Check-SSH; Step "Reiniciando..."; Invoke-Remote "pm2 restart lillys && pm2 list"; exit 0 }

# ── Deploy completo ───────────────────────────────────────────────
Check-SSH

$Items = @(
    "app", "components", "lib", "public", "supabase",
    "next.config.ts", "package.json", "package-lock.json",
    "tsconfig.json", "postcss.config.mjs", "eslint.config.mjs",
    "ecosystem.config.js"
)
$Existing = $Items | Where-Object { Test-Path (Join-Path $LocalPath $_) }

Step "Empacotando ($($Existing.Count) itens)..."
$TmpTar = [System.IO.Path]::Combine($env:TEMP, "lillys-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').tar.gz")
& tar @("-czf", $TmpTar, "-C", $LocalPath) $Existing
if ($LASTEXITCODE -ne 0) { Fail "tar falhou." }
$sizeMB = [math]::Round((Get-Item $TmpTar).Length / 1MB, 1)
Ok "$sizeMB MB"

Step "Enviando para VPS..."
scp -i $KeyFile $TmpTar "${VPS}:/tmp/lillys-deploy.tar.gz"
if ($LASTEXITCODE -ne 0) { Remove-Item $TmpTar -EA SilentlyContinue; Fail "scp falhou." }
Remove-Item $TmpTar -EA SilentlyContinue
Ok "Enviado."

# Ler .env.local e escapar para o heredoc
$envContent = Get-Content "$LocalPath\.env.local" -Raw

$remoteScript = @"
set -e
mkdir -p $Remote
echo '-- Extraindo...'
tar -xzf /tmp/lillys-deploy.tar.gz -C $Remote
rm -f /tmp/lillys-deploy.tar.gz
cd $Remote
echo '-- Instalando dependencias...'
npm install --production=false 2>&1 | tail -5
echo '-- Buildando...'
npm run build 2>&1 | tail -25
echo '-- PM2...'
if pm2 show lillys > /dev/null 2>&1; then
  pm2 restart lillys
else
  pm2 start ecosystem.config.js
fi
pm2 save
echo ''
echo 'Deploy concluido!'
pm2 show lillys | grep -E 'name|status|port|restart'
"@

Step "Buildando e iniciando no VPS..."
ssh -i $KeyFile -o StrictHostKeyChecking=no $VPS $remoteScript
if ($LASTEXITCODE -ne 0) { Fail "Falha no servidor." }

Ok "Deploy finalizado. Acesse: https://lilly.upflu.digital"
