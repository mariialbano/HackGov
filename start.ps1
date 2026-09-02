#Requires -Version 5.1
<#
.SYNOPSIS
    Sobe o VidaReal: a API (Spring Boot) e a interface (React + Vite).

.DESCRIPTION
    Confere os pre-requisitos, libera as portas, carrega as variaveis do
    backend/.env e sobe os dois servicos NESTA MESMA JANELA, com os logs
    intercalados e identificados por prefixo.

    Ctrl+C encerra os dois servicos e devolve o terminal.

    Com -Desanexado, os servicos sobem em segundo plano e o terminal fica
    livre; nesse caso encerre depois com .\stop.ps1

.PARAMETER SemNavegador
    Nao abre o navegador ao final.

.PARAMETER Desanexado
    Sobe os servicos em segundo plano e devolve o prompt imediatamente.

.EXAMPLE
    .\start.ps1

.EXAMPLE
    .\start.ps1 -Desanexado
#>

param(
    [switch]$SemNavegador,
    [switch]$Desanexado
)

$ErrorActionPreference = 'Stop'

$raiz      = $PSScriptRoot
$dirApi    = Join-Path $raiz 'backend'
$dirWeb    = Join-Path $raiz 'frontend'
$portaApi  = 3001
$portaWeb  = 5173
$urlApi    = "http://localhost:$portaApi/api/v1/health"
$urlWeb    = "http://localhost:$portaWeb"
$dirEstado = Join-Path $raiz '.run'
$logApi    = Join-Path $dirEstado 'api.log'
$logWeb    = Join-Path $dirEstado 'web.log'

# ---------------------------------------------------------------------------
# Apoio
# ---------------------------------------------------------------------------

function Escrever-Titulo($texto) {
    Write-Host ''
    Write-Host "  $texto" -ForegroundColor White
    Write-Host ('  ' + ('-' * $texto.Length)) -ForegroundColor DarkGray
}

function Escrever-Passo($texto)  { Write-Host "  ... $texto" -ForegroundColor Gray }
function Escrever-Ok($texto)     { Write-Host "  [ok] $texto" -ForegroundColor Green }
function Escrever-Aviso($texto)  { Write-Host "  [!]  $texto" -ForegroundColor Yellow }
function Escrever-Erro($texto)   { Write-Host "  [x]  $texto" -ForegroundColor Red }

function Test-Comando($nome) {
    return [bool](Get-Command $nome -ErrorAction SilentlyContinue)
}

function Get-PidNaPorta($porta) {
    try {
        $conexao = Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction Stop
        return @($conexao)[0].OwningProcess
    } catch {
        return $null
    }
}

function Liberar-Porta($porta, $rotulo) {
    $processo = Get-PidNaPorta $porta
    if ($processo) {
        Escrever-Aviso "A porta $porta ($rotulo) estava ocupada. Encerrando o processo $processo."
        Stop-Process -Id $processo -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

function Aguardar-Url($url, $timeoutSegundos) {
    $limite = (Get-Date).AddSeconds($timeoutSegundos)
    while ((Get-Date) -lt $limite) {
        try {
            $resposta = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
            if ($resposta.StatusCode -eq 200) { return $true }
        } catch {
            Start-Sleep -Milliseconds 800
        }
    }
    return $false
}

# A janela do PowerShell e o pai; o java/node ficam como filhos. Encerrar
# so o pai deixaria o servidor rodando e a porta ocupada.
function Stop-ArvoreProcesso($processoId) {
    Get-CimInstance Win32_Process -Filter "ParentProcessId=$processoId" -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-ArvoreProcesso $_.ProcessId }
    Stop-Process -Id $processoId -Force -ErrorAction SilentlyContinue
}

# Sobe um servico sem abrir janela: a saida vai para um arquivo de log,
# que depois e transmitido para este mesmo console.
function Iniciar-Servico($diretorio, $comando, $arquivoLog) {
    Set-Content -Path $arquivoLog -Value '' -Encoding UTF8

    return Start-Process -FilePath $env:ComSpec `
        -ArgumentList '/c', $comando `
        -WorkingDirectory $diretorio `
        -NoNewWindow -PassThru `
        -RedirectStandardOutput $arquivoLog `
        -RedirectStandardError (($arquivoLog -replace '\.log$', '') + '.err.log')
}

# ---------------------------------------------------------------------------
# 1. Pre-requisitos
# ---------------------------------------------------------------------------

Write-Host ''
Write-Host '  VidaReal' -ForegroundColor DarkYellow
Write-Host '  Plataforma de transparencia publica e educacao financeira' -ForegroundColor DarkGray

Escrever-Titulo 'Verificando pre-requisitos'

$faltando = @()
foreach ($item in @(
    @{ Comando = 'java'; Nome = 'Java 21+';    Onde = 'https://adoptium.net' },
    @{ Comando = 'mvn';  Nome = 'Maven';       Onde = 'https://maven.apache.org' },
    @{ Comando = 'npm';  Nome = 'Node.js 18+'; Onde = 'https://nodejs.org' }
)) {
    if (Test-Comando $item.Comando) {
        Escrever-Ok $item.Nome
    } else {
        Escrever-Erro "$($item.Nome) nao encontrado - instale em $($item.Onde)"
        $faltando += $item.Nome
    }
}

if ($faltando.Count -gt 0) {
    Write-Host ''
    Escrever-Erro "Instale o que falta e rode novamente: $($faltando -join ', ')"
    exit 1
}

# ---------------------------------------------------------------------------
# 2. Dependencias do front-end
# ---------------------------------------------------------------------------

if (-not (Test-Path (Join-Path $dirWeb 'node_modules'))) {
    Escrever-Titulo 'Instalando as dependencias do front-end'
    Escrever-Passo 'Primeira execucao: isso leva alguns minutos.'
    Push-Location $dirWeb
    try {
        npm install --silent
        Escrever-Ok 'Dependencias instaladas'
    } finally {
        Pop-Location
    }
}

# ---------------------------------------------------------------------------
# 3. Variaveis de ambiente da API
# ---------------------------------------------------------------------------

Escrever-Titulo 'Configuracao'

$arquivoEnv = Join-Path $dirApi '.env'
$variaveisDefinidas = 0

if (Test-Path $arquivoEnv) {
    Get-Content $arquivoEnv | Where-Object { $_ -match '^\s*[^#\s].*=' } | ForEach-Object {
        $par = $_ -split '=', 2
        # Os processos filhos herdam o ambiente desta sessao
        [Environment]::SetEnvironmentVariable($par[0].Trim(), $par[1].Trim(), 'Process')
        $script:variaveisDefinidas++
    }
    Escrever-Ok "$variaveisDefinidas variavel(is) carregada(s) de backend\.env"
} else {
    Escrever-Aviso 'backend\.env nao encontrado. O assistente virtual ficara indisponivel.'
    Escrever-Passo 'O resto do sistema funciona normalmente. Modelo em backend\.env.example'
}

if (-not (Test-Path $dirEstado)) {
    New-Item -ItemType Directory -Path $dirEstado | Out-Null
}

# ---------------------------------------------------------------------------
# 4. Subir os servicos
# ---------------------------------------------------------------------------

Escrever-Titulo 'Iniciando os servicos'

Liberar-Porta $portaApi 'API'
Liberar-Porta $portaWeb 'front-end'

$processoApi = $null
$processoWeb = $null

try {
    Escrever-Passo "Subindo a API na porta $portaApi (a primeira compilacao demora)..."
    $processoApi = Iniciar-Servico $dirApi 'mvn spring-boot:run' $logApi

    if (-not (Aguardar-Url $urlApi 180)) {
        Escrever-Erro 'A API nao respondeu a tempo. Ultimas linhas do log:'
        Get-Content $logApi -Tail 15 | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
        throw 'Falha ao subir a API.'
    }
    Escrever-Ok "API no ar em http://localhost:$portaApi/api/v1"

    Escrever-Passo "Subindo o front-end na porta $portaWeb..."
    $processoWeb = Iniciar-Servico $dirWeb 'npm run dev' $logWeb

    if (-not (Aguardar-Url $urlWeb 90)) {
        Escrever-Erro 'O front-end nao respondeu a tempo. Ultimas linhas do log:'
        Get-Content $logWeb -Tail 15 | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
        throw 'Falha ao subir o front-end.'
    }
    Escrever-Ok "Front-end no ar em $urlWeb"

    # Registra o estado para o stop.ps1
    @{
        api        = $processoApi.Id
        web        = $processoWeb.Id
        portaApi   = $portaApi
        portaWeb   = $portaWeb
        iniciadoEm = (Get-Date).ToString('o')
    } | ConvertTo-Json | Set-Content (Join-Path $dirEstado 'servicos.json') -Encoding UTF8

    # -----------------------------------------------------------------------
    # 5. Pronto
    # -----------------------------------------------------------------------

    Escrever-Titulo 'Tudo pronto'
    Write-Host "  Site .......... $urlWeb"                           -ForegroundColor White
    Write-Host "  API ........... http://localhost:$portaApi/api/v1" -ForegroundColor White
    Write-Host ''
    Write-Host '  Usuarios de demonstracao' -ForegroundColor White
    Write-Host '    Cidadao ..... 529.982.247-25   Cidadao@123'   -ForegroundColor Gray
    Write-Host '    Atendente ... 153.509.460-56   Atendente@123' -ForegroundColor Gray
    Write-Host ''

    if (-not $SemNavegador) {
        Start-Process $urlWeb
    }

    if ($Desanexado) {
        Write-Host '  Servicos rodando em segundo plano.' -ForegroundColor DarkYellow
        Write-Host '  Para encerrar, rode: .\stop.ps1'    -ForegroundColor DarkYellow
        Write-Host ''
        return
    }

    # -----------------------------------------------------------------------
    # 6. Transmitir os logs dos dois servicos nesta janela
    # -----------------------------------------------------------------------

    Write-Host '  Logs dos dois servicos abaixo. Ctrl+C encerra tudo.' -ForegroundColor DarkYellow
    Write-Host ''

    # FileShare ReadWrite: le sem travar quem esta escrevendo
    $fluxos = @(
        @{ Rotulo = 'API'; Cor = 'DarkCyan';   Caminho = $logApi },
        @{ Rotulo = 'WEB'; Cor = 'DarkMagenta'; Caminho = $logWeb }
    )

    foreach ($fluxo in $fluxos) {
        $fluxo.Leitor = [System.IO.StreamReader]::new(
            [System.IO.File]::Open($fluxo.Caminho, 'Open', 'Read', 'ReadWrite'))
    }

    while ($true) {
        $leuAlgo = $false

        foreach ($fluxo in $fluxos) {
            while ($null -ne ($linha = $fluxo.Leitor.ReadLine())) {
                $leuAlgo = $true
                if ($linha.Trim()) {
                    Write-Host "  [$($fluxo.Rotulo)] " -ForegroundColor $fluxo.Cor -NoNewline
                    Write-Host $linha
                }
            }
        }

        if ($processoApi.HasExited) {
            Escrever-Erro 'A API encerrou inesperadamente.'
            break
        }
        if ($processoWeb.HasExited) {
            Escrever-Erro 'O front-end encerrou inesperadamente.'
            break
        }

        if (-not $leuAlgo) { Start-Sleep -Milliseconds 200 }
    }

} finally {
    # Roda tambem no Ctrl+C: nao deixa servidor orfao segurando a porta
    if (-not $Desanexado) {
        foreach ($fluxo in $fluxos) {
            if ($fluxo.Leitor) { $fluxo.Leitor.Dispose() }
        }

        Write-Host ''
        Write-Host '  Encerrando os servicos...' -ForegroundColor DarkYellow

        foreach ($processo in @($processoApi, $processoWeb)) {
            if ($processo -and -not $processo.HasExited) {
                Stop-ArvoreProcesso $processo.Id
            }
        }

        Start-Sleep -Seconds 1
        foreach ($porta in @($portaApi, $portaWeb)) {
            $restante = Get-PidNaPorta $porta
            if ($restante) { Stop-ArvoreProcesso $restante }
        }

        Remove-Item (Join-Path $dirEstado 'servicos.json') -Force -ErrorAction SilentlyContinue
        Write-Host '  Tudo encerrado.' -ForegroundColor Green
        Write-Host ''
    }
}
