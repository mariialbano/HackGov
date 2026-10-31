#Requires -Version 5.1
<#
.SYNOPSIS
    Restaura o banco H2 do VidaReal a partir de um backup .sql.

.DESCRIPTION
    O banco atual NAO e apagado: o arquivo e movido para
    backend\data\antes-da-restauracao-AAAAMMDD-HHMMSS\, e so entao o backup
    e carregado em um banco novo. Se a restauracao falhar, o banco original
    e devolvido ao lugar. A API precisa estar parada (.\stop.ps1).

.PARAMETER Backup
    Arquivo .sql criado por backup-banco.ps1.

.PARAMETER ArquivoBanco
    Banco a restaurar, sem a extensao .mv.db. Padrao: backend\data\vidareal.

.EXAMPLE
    .\restaurar-banco.ps1 -Backup .\backups\vidareal-20261030-230000.sql
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$Backup,
    [string]$ArquivoBanco = (Join-Path $PSScriptRoot 'data\vidareal')
)

. (Join-Path $PSScriptRoot 'banco-comum.ps1')

Write-Host ''
Write-Host '  Restauracao do banco VidaReal' -ForegroundColor White

$arquivoAtual = "$ArquivoBanco.mv.db"
$guardado = $null

try {
    if (-not (Test-Path $Backup)) { throw "Backup nao encontrado: $Backup" }
    $Backup = (Resolve-Path $Backup).Path
    Exigir-ApiParada

    # Guarda o banco atual em vez de apaga-lo: restaurar o backup errado
    # nao pode custar os dados que existiam.
    if (Test-Path $arquivoAtual) {
        $pastaDados = Split-Path $ArquivoBanco
        $guardado = Join-Path $pastaDados ('antes-da-restauracao-{0}' -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
        New-Item -ItemType Directory -Path $guardado | Out-Null
        Move-Item $arquivoAtual $guardado
        Escrever-Passo "Banco atual guardado em $guardado"
    }

    Escrever-Passo 'Carregando o backup em um banco novo...'
    Invoke-FerramentaH2 'org.h2.tools.RunScript' @('-url', (Get-UrlBanco $ArquivoBanco), '-script', $Backup)

    if (-not (Test-Path $arquivoAtual)) { throw 'O banco restaurado nao foi criado.' }

    Escrever-Ok "Banco restaurado de $Backup"
    Write-Host '       Suba a API com .\start.ps1 e confira em GET /api/v1/auditoria/integridade.' -ForegroundColor DarkGray
    Write-Host ''
} catch {
    Escrever-Erro $_.Exception.Message

    # Falhou no meio: descarta o banco incompleto e devolve o original.
    if ($guardado) {
        Remove-Item $arquivoAtual -Force -ErrorAction SilentlyContinue
        $copia = Join-Path $guardado (Split-Path $arquivoAtual -Leaf)
        if (Test-Path $copia) {
            Move-Item $copia $arquivoAtual
            Remove-Item $guardado -Force -ErrorAction SilentlyContinue
            Escrever-Passo 'O banco original foi devolvido ao lugar.'
        }
    }
    Write-Host ''
    exit 1
}
