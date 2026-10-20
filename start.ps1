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

.PARAMETER ConsoleBanco
    Abre tambem o console web do H2 (http://localhost:8082), com o banco do
    projeto ja preenchido, com a API rodando ao mesmo tempo. Sem esta opcao o
    H2 tranca o arquivo do banco para o primeiro programa que o abrir.

.EXAMPLE
    .\start.ps1

.EXAMPLE
    .\start.ps1 -Desanexado

.EXAMPLE
    .\start.ps1 -ConsoleBanco
#>

param(
    [switch]$SemNavegador,
    [switch]$Desanexado,
    [switch]$ConsoleBanco
)

$ErrorActionPreference = 'Stop'

$raiz      = $PSScriptRoot
$dirApi    = Join-Path $raiz 'backend'
$dirWeb    = Join-Path $raiz 'frontend'
$portaApi  = 3001
$portaWeb  = 5173
$urlApi    = "http://localhost:$portaApi/api/v1/health"
$urlWeb    = "http://localhost:$portaWeb"
$portaConsole = 8082
$urlConsole   = "http://localhost:$portaConsole"
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

# Para cedo se o processo morrer: nao adianta esperar o tempo todo por um
# servico que ja falhou.
function Aguardar-Url($url, $timeoutSegundos, $processo) {
    $limite = (Get-Date).AddSeconds($timeoutSegundos)
    while ((Get-Date) -lt $limite) {
        try {
            $resposta = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
            if ($resposta.StatusCode -eq 200) { return $true }
        } catch {
            if ($processo -and $processo.HasExited) { return $false }
            Start-Sleep -Milliseconds 800
        }
    }
    return $false
}

# ---------------------------------------------------------------------------
# Java e Node: usa o que ja existe na maquina se a versao servir; senao baixa
# uma copia so para o projeto em %LOCALAPPDATA%\VidaReal (caminho curto, fora
# do OneDrive, reaproveitado se o projeto for baixado de novo).
# ---------------------------------------------------------------------------

# Versoes baixadas quando faltam: a ultima correcao destas linhas LTS, as
# testadas com o projeto. Uma linha nova so entra depois de testada aqui.
$javaMinimo     = 21
$nodeLinha      = 24
$dirFerramentas = Join-Path $env:LOCALAPPDATA 'VidaReal'
$arquitetura    = if ($env:PROCESSOR_ARCHITEW6432) { $env:PROCESSOR_ARCHITEW6432 } else { $env:PROCESSOR_ARCHITECTURE }
$ehArm          = $arquitetura -eq 'ARM64'

# Programas de linha de comando escrevem em stderr; no PowerShell 5.1 isso
# vira erro com ErrorActionPreference=Stop. O cmd junta as duas saidas antes.
function Executar-Silencioso($exe, $argumentos) {
    $saida = & $env:ComSpec /c "`"$exe`" $argumentos 2>&1"
    return ($saida | Out-String)
}

# Versao e pasta de instalacao de um java.exe. O java da pasta "javapath" da
# Oracle e so um atalho: a pasta real vem de java.home.
function Get-InfoJava($exe) {
    if (-not $exe -or -not (Test-Path $exe)) { return $null }
    $saida = Executar-Silencioso $exe '-XshowSettings:properties -version'
    if ($saida -notmatch 'java\.specification\.version = (\S+)') { return $null }
    $versao = $Matches[1]
    $versao = if ($versao -like '1.*') { [int]($versao.Split('.')[1]) } else { [int]$versao }
    if ($saida -notmatch 'java\.home = (.+)') { return $null }
    $pastaJava = $Matches[1].Trim()
    return @{
        Versao = $versao
        Home   = $pastaJava
        # A API e compilada na hora: precisa do JDK (javac), nao so do Java
        Jdk    = Test-Path (Join-Path $pastaJava 'bin\javac.exe')
    }
}

function Get-VersaoNode($exe) {
    if (-not $exe -or -not (Test-Path $exe)) { return $null }
    $saida = (Executar-Silencioso $exe '-v').Trim()
    if ($saida -notmatch '^v(\d+)\.(\d+)') { return $null }
    return @{ Texto = $saida; Maior = [int]$Matches[1]; Menor = [int]$Matches[2] }
}

# O Vite 8 exige Node 20.19+ ou 22.12+
function Test-NodeServe($v) {
    if (-not $v) { return $false }
    return ($v.Maior -eq 20 -and $v.Menor -ge 19) -or
           ($v.Maior -eq 22 -and $v.Menor -ge 12) -or
           ($v.Maior -ge 23)
}

function Baixar-Arquivo($url, $destino) {
    if (Test-Path $destino) { Remove-Item $destino -Force }
    # curl.exe vem no Windows 10/11, mostra o progresso e e bem mais rapido
    # que o Invoke-WebRequest do PowerShell 5.1.
    $curl = Join-Path $env:SystemRoot 'System32\curl.exe'
    if (Test-Path $curl) {
        & $curl -L --fail --retry 3 --retry-delay 2 -# -o $destino $url
        if ($LASTEXITCODE -ne 0) { throw "Falha ao baixar $url" }
    } else {
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $url -OutFile $destino -UseBasicParsing
    }
}

function Conferir-Hash($arquivo, $esperado) {
    # .NET direto: o Get-FileHash some quando o PowerShell 5.1 e aberto
    # de dentro do PowerShell 7 (os caminhos de modulo se misturam).
    $fluxo = [System.IO.File]::OpenRead($arquivo)
    try {
        $bytes = [System.Security.Cryptography.SHA256]::Create().ComputeHash($fluxo)
    } finally {
        $fluxo.Dispose()
    }
    $hash = -join ($bytes | ForEach-Object { $_.ToString('x2') })
    if ($hash -ne $esperado.ToLower()) {
        Remove-Item $arquivo -Force -ErrorAction SilentlyContinue
        throw 'O arquivo baixado veio corrompido (hash nao confere). Rode novamente.'
    }
}

# Extrai um .zip que tem uma unica pasta dentro e a renomeia para $destino
function Extrair-Zip($zip, $destino) {
    $temporaria = Join-Path $dirFerramentas 'extraindo'
    if (Test-Path $temporaria) { Remove-Item $temporaria -Recurse -Force }
    New-Item -ItemType Directory -Path $temporaria | Out-Null

    # tar.exe (Windows 10/11) e muito mais rapido que o Expand-Archive
    $tar = Join-Path $env:SystemRoot 'System32\tar.exe'
    if (Test-Path $tar) {
        & $tar -xf $zip -C $temporaria
        if ($LASTEXITCODE -ne 0) { throw "Falha ao extrair $zip" }
    } else {
        Expand-Archive -Path $zip -DestinationPath $temporaria -Force
    }

    $pasta = Get-ChildItem $temporaria -Directory | Select-Object -First 1
    if (Test-Path $destino) { Remove-Item $destino -Recurse -Force }
    Move-Item $pasta.FullName $destino
    Remove-Item $temporaria -Recurse -Force
    Remove-Item $zip -Force
}

function Instalar-Java {
    $arq = if ($ehArm) { 'aarch64' } else { 'x64' }
    Escrever-Passo "Buscando o Java $javaMinimo (Eclipse Temurin)..."
    $info = Invoke-RestMethod -UseBasicParsing -Uri ("https://api.adoptium.net/v3/assets/latest/$javaMinimo/hotspot" +
        "?architecture=$arq&image_type=jdk&os=windows&vendor=eclipse")
    $pacote = @($info)[0].binary.package
    $zip = Join-Path $dirFerramentas $pacote.name
    Escrever-Passo "Baixando $($pacote.name) (~$([math]::Round($pacote.size / 1MB)) MB)..."
    Baixar-Arquivo $pacote.link $zip
    Conferir-Hash $zip $pacote.checksum
    Escrever-Passo 'Extraindo...'
    Extrair-Zip $zip (Join-Path $dirFerramentas 'jdk')
}

function Instalar-Node {
    $arq = if ($ehArm) { 'arm64' } else { 'x64' }
    Escrever-Passo "Buscando a versao mais recente do Node.js $nodeLinha..."
    $versoes = Invoke-RestMethod -UseBasicParsing -Uri 'https://nodejs.org/dist/index.json'
    $lts = $versoes | Where-Object { $_.version -like "v$nodeLinha.*" -and ($_.files -contains "win-$arq-zip") } |
        Select-Object -First 1
    if (-not $lts) { throw "Nao encontrei o Node.js $nodeLinha para baixar." }
    $nome = "node-$($lts.version)-win-$arq.zip"
    $base = "https://nodejs.org/dist/$($lts.version)"
    $zip = Join-Path $dirFerramentas $nome
    Escrever-Passo "Baixando $nome (~35 MB)..."
    Baixar-Arquivo "$base/$nome" $zip
    $somas = (Invoke-WebRequest -UseBasicParsing -Uri "$base/SHASUMS256.txt").Content
    $linha = ($somas -split "`n") | Where-Object { $_ -match "\s$([regex]::Escape($nome))$" } | Select-Object -First 1
    if (-not $linha) { throw 'Nao foi possivel conferir o arquivo do Node.js.' }
    Conferir-Hash $zip ($linha -split '\s+')[0]
    Escrever-Passo 'Extraindo...'
    Extrair-Zip $zip (Join-Path $dirFerramentas 'node')
}

# Devolve o java.exe a usar e deixa JAVA_HOME/PATH apontando para ele (o
# mvnw.cmd prefere o JAVA_HOME ao PATH, entao os dois precisam concordar).
function Resolver-Java {
    $candidatos = @()
    if ($env:JAVA_HOME) { $candidatos += Join-Path $env:JAVA_HOME 'bin\java.exe' }
    $doPath = Get-Command java.exe -ErrorAction SilentlyContinue
    if ($doPath) { $candidatos += $doPath.Source }
    $candidatos += Join-Path $dirFerramentas 'jdk\bin\java.exe'

    $escolhido = $null
    $recusado  = $null
    foreach ($exe in $candidatos) {
        $info = Get-InfoJava $exe
        if (-not $info) { continue }
        if ($info.Versao -ge $javaMinimo -and $info.Jdk) { $escolhido = $info; break }
        if (-not $recusado) { $recusado = $info }
    }

    if (-not $escolhido) {
        if ($recusado) {
            $tipo = if ($recusado.Jdk) { "Java $($recusado.Versao)" } else { "Java $($recusado.Versao) sem compilador (JRE)" }
            Escrever-Aviso "Encontrei $tipo; o projeto precisa do JDK $javaMinimo ou mais novo."
        } else {
            Escrever-Aviso "Java nao encontrado. Vou baixar o JDK $javaMinimo so para este projeto."
        }
        if (-not (Test-Path $dirFerramentas)) { New-Item -ItemType Directory -Path $dirFerramentas | Out-Null }
        Instalar-Java
        $escolhido = Get-InfoJava (Join-Path $dirFerramentas 'jdk\bin\java.exe')
        if (-not $escolhido) { throw 'O Java foi baixado, mas nao executou.' }
    }

    $env:JAVA_HOME = $escolhido.Home
    $env:Path = (Join-Path $escolhido.Home 'bin') + ';' + $env:Path
    Escrever-Ok "Java $($escolhido.Versao) ($($escolhido.Home))"
    return Join-Path $escolhido.Home 'bin\java.exe'
}

function Resolver-Node {
    $candidatos = @()
    $doPath = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($doPath) { $candidatos += $doPath.Source }
    $candidatos += Join-Path $dirFerramentas 'node\node.exe'

    $escolhido = $null
    $recusado  = $null
    foreach ($exe in $candidatos) {
        $versao = Get-VersaoNode $exe
        if (-not $versao) { continue }
        if ((Test-NodeServe $versao) -and (Test-Path (Join-Path (Split-Path $exe) 'npm.cmd'))) {
            $escolhido = $exe; break
        }
        if (-not $recusado) { $recusado = $versao }
    }

    if (-not $escolhido) {
        if ($recusado) {
            Escrever-Aviso "Encontrei o Node.js $($recusado.Texto); o projeto precisa do 20.19+ ou 22.12+."
        } else {
            Escrever-Aviso 'Node.js nao encontrado. Vou baixar uma copia so para este projeto.'
        }
        if (-not (Test-Path $dirFerramentas)) { New-Item -ItemType Directory -Path $dirFerramentas | Out-Null }
        Instalar-Node
        $escolhido = Join-Path $dirFerramentas 'node\node.exe'
        if (-not (Get-VersaoNode $escolhido)) { throw 'O Node.js foi baixado, mas nao executou.' }
    }

    $pasta = Split-Path $escolhido
    $env:Path = $pasta + ';' + $env:Path
    $script:npmCmd = Join-Path $pasta 'npm.cmd'
    Escrever-Ok "Node.js $((Get-VersaoNode $escolhido).Texto) ($pasta)"
    return $escolhido
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

# PowerShell 5.1 nao usa TLS 1.2 por padrao em todas as maquinas
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

# Maven nao entra na lista: a API sobe pelo Maven Wrapper (backend\mvnw.cmd),
# que baixa a versao certa na primeira execucao. Java e Node que faltarem (ou
# estiverem velhos) sao baixados para a pasta abaixo, so para este projeto:
# nao precisa de administrador nem altera o resto do computador.
try {
    $javaExe = Resolver-Java
    $nodeExe = Resolver-Node
} catch {
    Write-Host ''
    Escrever-Erro $_.Exception.Message
    Escrever-Passo 'Confira a internet e rode novamente. Se persistir, instale manualmente:'
    Escrever-Passo "  Java $javaMinimo (JDK) .... https://adoptium.net"
    Escrever-Passo '  Node.js LTS ......... https://nodejs.org'
    exit 1
}

# ---------------------------------------------------------------------------
# 2. Dependencias do front-end e compilacao da API
# ---------------------------------------------------------------------------

# A pasta pode existir pela metade (instalacao interrompida): o que vale e o
# Vite estar la.
if (-not (Test-Path (Join-Path $dirWeb 'node_modules\.bin\vite.cmd'))) {
    Escrever-Titulo 'Instalando as dependencias do front-end'
    Escrever-Passo 'Primeira execucao: isso leva alguns minutos.'
    Push-Location $dirWeb
    try {
        & $npmCmd install --no-audit --no-fund --loglevel=error
        if ($LASTEXITCODE -ne 0) {
            Escrever-Erro 'O npm install falhou (veja as mensagens acima). Confira a internet e rode novamente.'
            exit 1
        }
        Escrever-Ok 'Dependencias instaladas'
    } finally {
        Pop-Location
    }
}

# Na primeira vez o Maven baixa a si mesmo e as bibliotecas da API, o que
# pode levar varios minutos numa rede lenta. Feito aqui, a vista e sem limite
# de tempo; depois a API sobe em segundos.
if (-not (Test-Path (Join-Path $dirApi 'target\classes'))) {
    Escrever-Titulo 'Preparando a API'
    Escrever-Passo 'Primeira execucao: baixando o Maven e as bibliotecas. Isso leva alguns minutos.'
    Push-Location $dirApi
    try {
        & $env:ComSpec /c '.\mvnw.cmd -B -DskipTests compile'
        if ($LASTEXITCODE -ne 0) {
            Escrever-Erro 'A preparacao da API falhou (veja as mensagens acima). Confira a internet e rode novamente.'
            exit 1
        }
        Escrever-Ok 'API compilada'
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

# Console do banco. O H2 em arquivo aceita um programa por vez; com
# AUTO_SERVER o primeiro a abrir (a API) passa a atender tambem o console.
# A variavel vale so para esta execucao e e removida no fim do script.
$jarH2    = $null
$urlBanco = $null
if ($ConsoleBanco) {
    if ($env:VIDAREAL_DB_URL) {
        Escrever-Aviso 'VIDAREAL_DB_URL ja esta definida: o console do banco nao sera aberto.'
    } else {
        $jarH2 = Get-ChildItem (Join-Path $env:USERPROFILE '.m2\repository\com\h2database\h2') `
                -Recurse -Filter 'h2-*.jar' -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -notmatch 'sources|javadoc' } |
            Sort-Object FullName -Descending | Select-Object -First 1
        if ($jarH2) {
            $arquivoBanco = (Join-Path $dirApi 'data\vidareal') -replace '\\', '/'
            $urlBanco = "jdbc:h2:file:$arquivoBanco;AUTO_SERVER=TRUE"
            $env:VIDAREAL_DB_URL = $urlBanco
            Escrever-Ok 'Banco em modo compartilhado (API + console do H2)'
        } else {
            Escrever-Aviso 'Driver do H2 nao encontrado: rode .\start.ps1 uma vez sem -ConsoleBanco.'
        }
    }
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

$processoApi     = $null
$processoWeb     = $null
$processoConsole = $null

try {
    Escrever-Passo "Subindo a API na porta $portaApi (a primeira compilacao demora)..."
    $processoApi = Iniciar-Servico $dirApi '.\mvnw.cmd spring-boot:run' $logApi

    if (-not (Aguardar-Url $urlApi 300 $processoApi)) {
        Escrever-Erro 'A API nao respondeu a tempo. Ultimas linhas do log:'
        Get-Content $logApi -Tail 15 | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
        throw 'Falha ao subir a API.'
    }
    Escrever-Ok "API no ar em http://localhost:$portaApi/api/v1"

    Escrever-Passo "Subindo o front-end na porta $portaWeb..."
    $processoWeb = Iniciar-Servico $dirWeb 'npm run dev' $logWeb

    if (-not (Aguardar-Url $urlWeb 120 $processoWeb)) {
        Escrever-Erro 'O front-end nao respondeu a tempo. Ultimas linhas do log:'
        Get-Content $logWeb -Tail 15 | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
        throw 'Falha ao subir o front-end.'
    }
    Escrever-Ok "Front-end no ar em $urlWeb"

    if ($urlBanco) {
        Escrever-Passo 'Abrindo o console do banco (H2)...'
        Liberar-Porta $portaConsole 'console do banco'

        # Servidor web do H2 numa porta fixa, com a conexao do projeto ja
        # preenchida na tela de login. (O "Console -url" escolhe uma porta
        # aleatoria e some se a aba for fechada.) O Java le este arquivo em
        # ISO-8859-1: acentos do caminho vao como \uXXXX.
        $usuarioBanco = if ($env:VIDAREAL_DB_USER) { $env:VIDAREAL_DB_USER } else { 'sa' }
        $conexao = "VidaReal|org.h2.Driver|$($urlBanco -replace ':', '\:' -replace '=', '\=')|$usuarioBanco"
        $conexao = -join ($conexao.ToCharArray() | ForEach-Object {
            if ([int]$_ -gt 127) { '\u{0:X4}' -f [int]$_ } else { $_ } })
        @("webPort=$portaConsole", 'webAllowOthers=false', 'webSSL=false', "0=$conexao") |
            Set-Content (Join-Path $dirEstado '.h2.server.properties') -Encoding ASCII

        $argumentosConsole = @('-cp', "`"$($jarH2.FullName)`"", 'org.h2.tools.Server',
            '-web', '-webPort', $portaConsole, '-properties', "`"$dirEstado`"")
        $processoConsole = Start-Process -FilePath $javaExe -ArgumentList $argumentosConsole `
            -NoNewWindow -PassThru `
            -RedirectStandardOutput (Join-Path $dirEstado 'console.log') `
            -RedirectStandardError (Join-Path $dirEstado 'console.err.log')

        if (Aguardar-Url $urlConsole 30 $processoConsole) {
            Escrever-Ok "Console do banco em $urlConsole (botao Connect)"
        } else {
            Escrever-Aviso 'O console do banco nao abriu. O site segue funcionando normalmente.'
            Get-Content (Join-Path $dirEstado 'console.err.log') -Tail 5 -ErrorAction SilentlyContinue |
                ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
            if (-not $processoConsole.HasExited) { Stop-ArvoreProcesso $processoConsole.Id }
            $processoConsole = $null
        }
    }

    # Registra o estado para o stop.ps1
    @{
        api        = $processoApi.Id
        web        = $processoWeb.Id
        console    = $(if ($processoConsole) { $processoConsole.Id } else { $null })
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
    if ($processoConsole) {
        Write-Host "  Banco ......... $urlConsole (console do H2)" -ForegroundColor White
    }
    Write-Host ''
    Write-Host '  Usuarios de demonstracao' -ForegroundColor White
    Write-Host '    Cidadao ..... 529.982.247-25   Cidadao@123'   -ForegroundColor Gray
    Write-Host '    Atendente ... 153.509.460-56   Atendente@123' -ForegroundColor Gray
    Write-Host ''

    if (-not $SemNavegador) {
        Start-Process $urlWeb
        if ($processoConsole) { Start-Process $urlConsole }
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

        if ($processoApi.HasExited -or $processoWeb.HasExited) {
            # O stop.ps1 apaga o servicos.json: se sumiu, foi encerramento pedido
            if (-not (Test-Path (Join-Path $dirEstado 'servicos.json'))) {
                Escrever-Passo 'Servicos encerrados pelo stop.'
            } elseif ($processoApi.HasExited) {
                Escrever-Erro 'A API encerrou inesperadamente.'
            } else {
                Escrever-Erro 'O front-end encerrou inesperadamente.'
            }
            break
        }

        if (-not $leuAlgo) { Start-Sleep -Milliseconds 200 }
    }

} finally {
    # A API ja herdou a URL; tirar daqui evita que uma proxima execucao nesta
    # mesma janela, sem -ConsoleBanco, continue no modo compartilhado.
    if ($urlBanco) {
        Remove-Item Env:VIDAREAL_DB_URL -ErrorAction SilentlyContinue
    }

    # Roda tambem no Ctrl+C: nao deixa servidor orfao segurando a porta
    if (-not $Desanexado) {
        foreach ($fluxo in $fluxos) {
            if ($fluxo.Leitor) { $fluxo.Leitor.Dispose() }
        }

        Write-Host ''
        Write-Host '  Encerrando os servicos...' -ForegroundColor DarkYellow

        foreach ($processo in @($processoApi, $processoWeb, $processoConsole)) {
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
