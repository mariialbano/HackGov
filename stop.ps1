#Requires -Version 5.1
<#
.SYNOPSIS
    Encerra o VidaReal: a API (Spring Boot) e a interface (React + Vite).

.DESCRIPTION
    Para os processos registrados pelo start.ps1 em .run/servicos.json,
    incluindo os filhos (a janela do PowerShell abre o java e o node como
    processos separados). Depois varre as portas 3001 e 5173 como rede de
    seguranca, para pegar tambem servicos iniciados a mao.

.PARAMETER Silencioso
    Nao imprime as mensagens de progresso.

.EXAMPLE
    .\stop.ps1
#>

param(
    [switch]$Silencioso
)

$ErrorActionPreference = 'SilentlyContinue'

$raiz         = $PSScriptRoot
$arquivoEstado = Join-Path $raiz '.run\servicos.json'
$portas       = @(3001, 5173)

function Escrever($texto, $cor = 'Gray') {
    if (-not $Silencioso) { Write-Host $texto -ForegroundColor $cor }
}

# A janela do PowerShell e o pai; o java/node sao filhos. Parar so o pai
# deixaria o servidor rodando e a porta ocupada.
function Stop-ArvoreProcesso($processoId) {
    Get-CimInstance Win32_Process -Filter "ParentProcessId=$processoId" |
        ForEach-Object { Stop-ArvoreProcesso $_.ProcessId }
    Stop-Process -Id $processoId -Force -ErrorAction SilentlyContinue
}

function Get-PidNaPorta($porta) {
    try {
        $conexao = Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction Stop
        return @($conexao)[0].OwningProcess
    } catch {
        return $null
    }
}

Escrever ''
Escrever '  Encerrando o VidaReal' 'DarkYellow'
Escrever ''

$encerrados = 0

# --- 1. Processos registrados pelo start.ps1 ------------------------------

if (Test-Path $arquivoEstado) {
    $estado = Get-Content $arquivoEstado -Raw | ConvertFrom-Json

    foreach ($servico in @(
        @{ Id = $estado.api; Nome = 'API (Spring Boot)' },
        @{ Id = $estado.web; Nome = 'Front-end (Vite)' }
    )) {
        if ($servico.Id -and (Get-Process -Id $servico.Id -ErrorAction SilentlyContinue)) {
            Stop-ArvoreProcesso $servico.Id
            Escrever "  [ok] $($servico.Nome) encerrado" 'Green'
            $encerrados++
        }
    }

    Remove-Item $arquivoEstado -Force -ErrorAction SilentlyContinue
}

# --- 2. Varredura das portas (pega o que foi iniciado a mao) ----------------

Start-Sleep -Seconds 1

foreach ($porta in $portas) {
    $processoId = Get-PidNaPorta $porta
    if ($processoId) {
        Stop-ArvoreProcesso $processoId
        Escrever "  [ok] Porta $porta liberada (processo $processoId)" 'Green'
        $encerrados++
    }
}

# --- 3. Confirmacao ---------------------------------------------------------

Start-Sleep -Seconds 1
$aindaOcupadas = @()

foreach ($porta in $portas) {
    if (Get-PidNaPorta $porta) { $aindaOcupadas += $porta }
}

Escrever ''
if ($aindaOcupadas.Count -gt 0) {
    Escrever "  [!]  Ainda ocupada(s): $($aindaOcupadas -join ', '). Feche as janelas manualmente." 'Yellow'
} elseif ($encerrados -eq 0) {
    Escrever '  Nada estava rodando.' 'DarkGray'
} else {
    Escrever '  Tudo encerrado. Portas 3001 e 5173 livres.' 'Green'
}
Escrever ''
