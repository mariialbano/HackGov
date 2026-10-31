#Requires -Version 5.1
<#
.SYNOPSIS
    Faz o backup do banco H2 do VidaReal em um arquivo .sql.

.DESCRIPTION
    Grava o esquema e todos os dados em backend\backups\vidareal-AAAAMMDD-HHMMSS.sql,
    usando a ferramenta Script do proprio H2. A API precisa estar parada
    (.\stop.ps1): o H2 em arquivo aceita um programa por vez.

    Para voltar a um backup: .\restaurar-banco.ps1 -Backup <arquivo>

.PARAMETER ArquivoBanco
    Banco a copiar, sem a extensao .mv.db. Padrao: backend\data\vidareal.

.PARAMETER PastaBackups
    Onde gravar. Padrao: backend\backups.

.EXAMPLE
    .\backup-banco.ps1
#>

param(
    [string]$ArquivoBanco = (Join-Path $PSScriptRoot 'data\vidareal'),
    [string]$PastaBackups = (Join-Path $PSScriptRoot 'backups')
)

. (Join-Path $PSScriptRoot 'banco-comum.ps1')

Write-Host ''
Write-Host '  Backup do banco VidaReal' -ForegroundColor White

try {
    if (-not (Test-Path "$ArquivoBanco.mv.db")) {
        throw "Banco nao encontrado: $ArquivoBanco.mv.db (suba a API uma vez para cria-lo)."
    }
    Exigir-ApiParada

    if (-not (Test-Path $PastaBackups)) {
        New-Item -ItemType Directory -Path $PastaBackups | Out-Null
    }
    $destino = Join-Path $PastaBackups ('vidareal-{0}.sql' -f (Get-Date -Format 'yyyyMMdd-HHmmss'))

    Escrever-Passo 'Exportando esquema e dados...'
    Invoke-FerramentaH2 'org.h2.tools.Script' @('-url', (Get-UrlBanco $ArquivoBanco), '-script', $destino)

    $arquivo = Get-Item $destino
    if ($arquivo.Length -eq 0) { throw 'O backup saiu vazio.' }

    Escrever-Ok "Backup gravado em $destino ($([math]::Round($arquivo.Length / 1KB, 1)) KB)"
    Write-Host "       SHA-256: $(Get-HashArquivo $destino)" -ForegroundColor DarkGray
    Write-Host ''
} catch {
    Escrever-Erro $_.Exception.Message
    Write-Host ''
    exit 1
}
