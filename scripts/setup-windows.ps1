param(
  [switch]$SkipNpmInstall
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Refresh-SessionPath {
  $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")

  $parts = @()
  if ($machinePath) { $parts += $machinePath }
  if ($userPath) { $parts += $userPath }

  $env:Path = ($parts -join ";")

  $nodeDefault = Join-Path $env:ProgramFiles "nodejs"
  if ((Test-Path $nodeDefault) -and ($env:Path -notlike "*$nodeDefault*")) {
    $env:Path = "$env:Path;$nodeDefault"
  }
}

function Get-NodeMajorVersion {
  $node = Get-Command node.exe -ErrorAction SilentlyContinue
  if (-not $node) { return $null }

  $versionText = (& node.exe --version).Trim()
  if ($versionText -notmatch '^v(\d+)\.') { return $null }

  return [int]$Matches[1]
}

Write-Host "Power BI Web Dashboard - Windows Setup" -ForegroundColor White
Write-Host "Project: $ProjectRoot" -ForegroundColor DarkGray

Refresh-SessionPath

$nodeMajor = Get-NodeMajorVersion

if ($null -eq $nodeMajor -or $nodeMajor -lt 20) {
  if ($null -eq $nodeMajor) {
    Write-Step "Node.js nao encontrado. Instalando Node.js LTS..."
  } else {
    Write-Step "Node.js v$nodeMajor encontrado, mas o projeto exige Node.js 20+. Atualizando para LTS..."
  }

  $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
  if (-not $winget) {
    Write-Host ""
    Write-Host "ERRO: winget nao foi encontrado neste Windows." -ForegroundColor Red
    Write-Host "Instale o Node.js LTS manualmente em https://nodejs.org/en/download" -ForegroundColor Yellow
    Write-Host "Depois execute setup-windows.cmd novamente." -ForegroundColor Yellow
    exit 2
  }

  & winget.exe install --id OpenJS.NodeJS.LTS --exact --source winget --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: winget nao conseguiu instalar o Node.js LTS." -ForegroundColor Red
    exit $LASTEXITCODE
  }

  Refresh-SessionPath
  $nodeMajor = Get-NodeMajorVersion

  if ($null -eq $nodeMajor -or $nodeMajor -lt 20) {
    Write-Host "ERRO: Node.js foi instalado, mas ainda nao esta disponivel nesta sessao." -ForegroundColor Red
    Write-Host "Feche esta janela e execute setup-windows.cmd novamente." -ForegroundColor Yellow
    exit 3
  }
}

Write-Step "Validando Node.js e npm"
$nodeVersion = (& node.exe --version).Trim()
Write-Host "Node.js: $nodeVersion" -ForegroundColor Green

$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npm) {
  Write-Host "ERRO: npm nao foi encontrado mesmo com Node.js disponivel." -ForegroundColor Red
  Write-Host "Reinstale o Node.js LTS e tente novamente." -ForegroundColor Yellow
  exit 4
}

$npmVersion = (& npm.cmd --version).Trim()
Write-Host "npm: v$npmVersion" -ForegroundColor Green

if (-not $SkipNpmInstall) {
  Write-Step "Instalando dependencias do projeto"
  & npm.cmd install
  if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: npm install falhou." -ForegroundColor Red
    exit $LASTEXITCODE
  }
}

if (-not (Test-Path ".env")) {
  Write-Step "Criando arquivo .env"
  Copy-Item ".env.example" ".env"
  Write-Host ".env criado a partir de .env.example." -ForegroundColor Green
  Write-Host "As credenciais do Power BI continuam vazias por seguranca." -ForegroundColor Yellow
} else {
  Write-Step "Arquivo .env ja existe"
  Write-Host "O arquivo existente foi preservado." -ForegroundColor Green
}

Write-Step "Executando diagnostico"
& npm.cmd run doctor
$doctorExit = $LASTEXITCODE

Write-Host ""
Write-Host "============================================================" -ForegroundColor DarkGray
Write-Host "Setup finalizado." -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor White
Write-Host "1. Se quiser conectar ao Power BI, preencha as variaveis do arquivo .env."
Write-Host "2. Configure cards, graficos e filtros em config\dashboard.json."
Write-Host "3. Execute start-windows.cmd para iniciar o projeto."
Write-Host "4. Abra http://localhost:5173"
Write-Host ""
Write-Host "O diagnostico pode mostrar credenciais Power BI ausentes. Isso e esperado" -ForegroundColor Yellow
Write-Host "enquanto o .env ainda nao estiver configurado." -ForegroundColor Yellow

exit $doctorExit
