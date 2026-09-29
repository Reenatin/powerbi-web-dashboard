param(
  [switch]$SkipNpmInstall
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ToolsRoot = Join-Path $ProjectRoot ".tools"
$PortableNodeDir = Join-Path $ToolsRoot "node"

Set-Location $ProjectRoot

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Get-NodeMajorVersion([string]$NodePath) {
  if (-not $NodePath -or -not (Test-Path $NodePath)) { return $null }

  $versionText = (& $NodePath --version).Trim()
  if ($versionText -notmatch '^v(\d+)\.') { return $null }

  return [int]$Matches[1]
}

function Add-NodeToPath([string]$NodeDir) {
  if ($env:Path -notlike "$NodeDir;*") {
    $env:Path = "$NodeDir;$env:Path"
  }
}

function Find-CompatibleNode {
  $globalNode = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($globalNode) {
    $major = Get-NodeMajorVersion $globalNode.Source
    if ($null -ne $major -and $major -ge 20) {
      return $globalNode.Source
    }
  }

  $portableNode = Join-Path $PortableNodeDir "node.exe"
  if (Test-Path $portableNode) {
    $major = Get-NodeMajorVersion $portableNode
    if ($null -ne $major -and $major -ge 20) {
      Add-NodeToPath $PortableNodeDir
      return $portableNode
    }
  }

  return $null
}

function Get-NodeArchitecture {
  $arch = $env:PROCESSOR_ARCHITECTURE
  if ($env:PROCESSOR_ARCHITEW6432) {
    $arch = $env:PROCESSOR_ARCHITEW6432
  }

  switch ($arch.ToUpperInvariant()) {
    "AMD64" { return "x64" }
    "ARM64" { return "arm64" }
    default {
      throw "Arquitetura Windows nao suportada automaticamente: $arch. Use Node.js 20+ instalado manualmente."
    }
  }
}

function Install-PortableNode {
  Write-Step "Node.js 20+ nao encontrado. Preparando Node.js LTS portatil..."

  $architecture = Get-NodeArchitecture
  $fileKey = "win-$architecture-zip"
  $indexUrl = "https://nodejs.org/dist/index.json"

  Write-Host "Consultando releases oficiais do Node.js..." -ForegroundColor DarkGray
  $releases = Invoke-RestMethod -Uri $indexUrl

  $release = $releases |
    Where-Object {
      if (-not $_.lts) { return $false }
      if ($_.files -notcontains $fileKey) { return $false }

      $major = [int](($_.version -replace '^v', '').Split('.')[0])
      return $major -ge 20
    } |
    Select-Object -First 1

  if (-not $release) {
    throw "Nao foi encontrada uma release LTS compativel no indice oficial do Node.js."
  }

  $version = $release.version
  $zipName = "node-$version-win-$architecture.zip"
  $baseUrl = "https://nodejs.org/dist/$version"
  $zipUrl = "$baseUrl/$zipName"
  $shaUrl = "$baseUrl/SHASUMS256.txt"

  New-Item -ItemType Directory -Force -Path $ToolsRoot | Out-Null

  $downloadDir = Join-Path $ToolsRoot "_download"
  $extractDir = Join-Path $ToolsRoot "_extract"
  Remove-Item $downloadDir -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force -Path $downloadDir | Out-Null
  New-Item -ItemType Directory -Force -Path $extractDir | Out-Null

  $zipPath = Join-Path $downloadDir $zipName
  $shaPath = Join-Path $downloadDir "SHASUMS256.txt"

  Write-Host "Baixando $version ($architecture) de nodejs.org..." -ForegroundColor DarkGray
  Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
  Invoke-WebRequest -Uri $shaUrl -OutFile $shaPath -UseBasicParsing

  Write-Host "Validando SHA-256 publicado pelo Node.js..." -ForegroundColor DarkGray
  $escapedName = [regex]::Escape($zipName)
  $checksumLine = Get-Content $shaPath | Where-Object { $_ -match "\s+$escapedName$" } | Select-Object -First 1

  if (-not $checksumLine) {
    throw "Nao foi possivel localizar o checksum oficial de $zipName."
  }

  $expectedHash = (($checksumLine -split '\s+')[0]).ToLowerInvariant()
  $actualHash = (Get-FileHash -Path $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()

  if ($expectedHash -ne $actualHash) {
    throw "Falha de integridade: o SHA-256 do Node.js baixado nao confere com o publicado em nodejs.org."
  }

  Write-Host "Checksum OK." -ForegroundColor Green
  Write-Host "Extraindo runtime local..." -ForegroundColor DarkGray
  Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

  $extractedNode = Join-Path $extractDir "node-$version-win-$architecture"
  if (-not (Test-Path (Join-Path $extractedNode "node.exe"))) {
    throw "O pacote oficial foi baixado, mas node.exe nao foi encontrado apos a extracao."
  }

  Remove-Item $PortableNodeDir -Recurse -Force -ErrorAction SilentlyContinue
  Move-Item -Path $extractedNode -Destination $PortableNodeDir

  Remove-Item $downloadDir -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue

  Add-NodeToPath $PortableNodeDir

  $nodePath = Join-Path $PortableNodeDir "node.exe"
  $major = Get-NodeMajorVersion $nodePath
  if ($null -eq $major -or $major -lt 20) {
    throw "Node.js portatil foi preparado, mas a versao encontrada nao atende ao requisito Node.js 20+."
  }

  Write-Host "Node.js portatil pronto em .tools\node." -ForegroundColor Green
  return $nodePath
}

Write-Host "Power BI Web Dashboard - Windows Setup" -ForegroundColor White
Write-Host "Project: $ProjectRoot" -ForegroundColor DarkGray

$nodePath = Find-CompatibleNode
if (-not $nodePath) {
  $nodePath = Install-PortableNode
}

$nodeDir = Split-Path -Parent $nodePath
Add-NodeToPath $nodeDir

Write-Step "Validando Node.js e npm"
$nodeVersion = (& $nodePath --version).Trim()
Write-Host "Node.js: $nodeVersion" -ForegroundColor Green

$npmPath = Join-Path $nodeDir "npm.cmd"
if (-not (Test-Path $npmPath)) {
  $globalNpm = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($globalNpm) {
    $npmPath = $globalNpm.Source
  } else {
    throw "npm nao foi encontrado ao lado do Node.js nem no PATH."
  }
}

$npmVersion = (& $npmPath --version).Trim()
Write-Host "npm: v$npmVersion" -ForegroundColor Green

if (-not $SkipNpmInstall) {
  Write-Step "Instalando dependencias do projeto"
  & $npmPath install
  if ($LASTEXITCODE -ne 0) {
    throw "npm install falhou com codigo $LASTEXITCODE."
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
& $npmPath run doctor
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
