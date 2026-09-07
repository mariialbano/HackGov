# Sobe a API VidaReal carregando as variaveis do arquivo .env, se existir.
# Uso:  .\rodar.ps1
if (Test-Path .env) {
  Get-Content .env | Where-Object { $_ -match '^\s*[^#].*=' } | ForEach-Object {
    $par = $_ -split '=', 2
    [Environment]::SetEnvironmentVariable($par[0].Trim(), $par[1].Trim(), 'Process')
  }
  Write-Host "Variaveis carregadas do .env"
}
# Maven Wrapper: baixa a versao certa do Maven na primeira execucao,
# entao nao e preciso ter o Maven instalado na maquina.
.\mvnw.cmd spring-boot:run
