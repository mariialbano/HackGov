#Requires -Version 5.1
<#
.SYNOPSIS
    Carrega (ou remove) os dados de EXEMPLO do VidaReal no banco H2.

.DESCRIPTION
    Executa backend\sql\dados-exemplo.sql: 13 cidadaos, 84 protocolos, 41
    avaliacoes e 15 metas, TODOS FICTICIOS (protocolos com id "EX-..."). Servem
    para demonstrar as analises estatisticas e as consultas de analises.sql.
    Rodar de novo recarrega o mesmo conteudo (o script apaga os exemplos antes).

    O banco precisa existir (suba a API uma vez) e a API precisa estar parada
    (.\stop.ps1): o H2 em arquivo aceita um programa por vez.

    Com -Remover, executa remover-dados-exemplo.sql e apaga so os exemplos.

.PARAMETER ArquivoBanco
    Banco a alterar, sem a extensao .mv.db. Padrao: backend\data\vidareal.

.PARAMETER Remover
    Remove os dados de exemplo em vez de carrega-los.

.EXAMPLE
    .\carregar-dados-exemplo.ps1

.EXAMPLE
    .\carregar-dados-exemplo.ps1 -Remover
#>

param(
    [string]$ArquivoBanco = (Join-Path $PSScriptRoot 'data\vidareal'),
    [switch]$Remover
)

. (Join-Path $PSScriptRoot 'banco-comum.ps1')

Write-Host ''
Write-Host '  Dados de exemplo do VidaReal' -ForegroundColor White

try {
    if (-not (Test-Path "$ArquivoBanco.mv.db")) {
        throw "Banco nao encontrado: $ArquivoBanco.mv.db (suba a API uma vez com .\start.ps1 para cria-lo)."
    }
    Exigir-ApiParada

    $nomeSql = if ($Remover) { 'remover-dados-exemplo.sql' } else { 'dados-exemplo.sql' }
    $arquivoSql = Join-Path $PSScriptRoot "sql\$nomeSql"
    if (-not (Test-Path $arquivoSql)) { throw "Script nao encontrado: $arquivoSql" }

    Escrever-Passo $(if ($Remover) { 'Removendo os dados de exemplo...' } else { 'Carregando os dados de exemplo (FICTICIOS)...' })
    Invoke-FerramentaH2 'org.h2.tools.RunScript' @('-url', (Get-UrlBanco $ArquivoBanco), '-script', $arquivoSql)

    if ($Remover) {
        Escrever-Ok 'Dados de exemplo removidos. Os dados reais nao foram tocados.'
    } else {
        Escrever-Ok 'Dados de exemplo carregados: 84 protocolos, 13 cidadaos, 41 avaliacoes e 15 metas, todos ficticios.'
        Write-Host '       Suba a API com .\start.ps1 e entre como atendente para ver as analises no painel.' -ForegroundColor DarkGray
    }
    Write-Host ''
} catch {
    Escrever-Erro $_.Exception.Message
    Write-Host ''
    exit 1
}
