# Apoio de backup-banco.ps1 e restaurar-banco.ps1 (nao e executado sozinho).
#
# Usa as ferramentas do proprio H2 (org.h2.tools.Script e RunScript), que ja
# vem com o projeto: nenhuma dependencia nova. O backup e um arquivo .sql com
# o esquema e todos os dados, legivel e portavel.

$ErrorActionPreference = 'Stop'

$script:portaApi = 3001
$script:usuarioBanco = if ($env:VIDAREAL_DB_USER) { $env:VIDAREAL_DB_USER } else { 'sa' }
$script:senhaBanco = if ($env:VIDAREAL_DB_PASSWORD) { $env:VIDAREAL_DB_PASSWORD } else { '' }

function Escrever-Ok($texto)    { Write-Host "  [ok] $texto" -ForegroundColor Green }
function Escrever-Passo($texto) { Write-Host "  ... $texto" -ForegroundColor Gray }
function Escrever-Erro($texto)  { Write-Host "  [x]  $texto" -ForegroundColor Red }

# Java: o do JAVA_HOME, o do PATH ou o baixado pelo start.ps1.
function Resolver-Java {
    $candidatos = @()
    if ($env:JAVA_HOME) { $candidatos += Join-Path $env:JAVA_HOME 'bin\java.exe' }
    $doPath = Get-Command java.exe -ErrorAction SilentlyContinue
    if ($doPath) { $candidatos += $doPath.Source }
    $candidatos += Join-Path $env:LOCALAPPDATA 'VidaReal\jdk\bin\java.exe'
    foreach ($exe in $candidatos) {
        if ($exe -and (Test-Path $exe)) { return $exe }
    }
    throw 'Java nao encontrado. Rode .\start.ps1 uma vez (ele baixa o JDK) ou instale o JDK 21.'
}

# O driver do H2 fica no repositorio local do Maven depois do primeiro start.
function Resolver-JarH2 {
    $jar = Get-ChildItem (Join-Path $env:USERPROFILE '.m2\repository\com\h2database\h2') `
            -Recurse -Filter 'h2-*.jar' -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notmatch 'sources|javadoc' } |
        Sort-Object FullName -Descending | Select-Object -First 1
    if (-not $jar) {
        throw 'Driver do H2 nao encontrado. Rode .\start.ps1 uma vez para o Maven baixa-lo.'
    }
    return $jar.FullName
}

# O H2 em arquivo aceita um programa por vez: com a API no ar, o arquivo esta
# em uso. Parar antes tambem evita copiar o banco no meio de uma gravacao.
function Exigir-ApiParada {
    $escutando = Get-NetTCPConnection -LocalPort $script:portaApi -State Listen -ErrorAction SilentlyContinue
    if ($escutando) {
        throw "A API esta no ar (porta $($script:portaApi)). Encerre com .\stop.ps1 e rode de novo."
    }
}

# URL JDBC de um banco em arquivo; o caminho vai sem a extensao .mv.db.
function Get-UrlBanco($arquivoBanco) {
    return 'jdbc:h2:file:' + ($arquivoBanco -replace '\\', '/')
}

# Roda uma ferramenta do H2 (Script ou RunScript) e falha se ela falhar.
function Invoke-FerramentaH2($classe, $argumentos) {
    $java = Resolver-Java
    $jar = Resolver-JarH2
    # Senha vazia precisa de aspas literais: o PowerShell 5.1 descarta "" ao
    # chamar programas externos e o H2 receberia -password sem valor.
    $senha = if ($script:senhaBanco -eq '') { '""' } else { $script:senhaBanco }
    $saida = & $java -cp $jar $classe @argumentos '-user' $script:usuarioBanco '-password' $senha 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Falha em $classe`: $($saida | Out-String)"
    }
}

function Get-HashArquivo($caminho) {
    $fluxo = [System.IO.File]::OpenRead($caminho)
    try {
        $bytes = [System.Security.Cryptography.SHA256]::Create().ComputeHash($fluxo)
    } finally {
        $fluxo.Dispose()
    }
    return -join ($bytes | ForEach-Object { $_.ToString('x2') })
}
