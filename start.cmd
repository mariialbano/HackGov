@echo off
rem Sobe o VidaReal. Basta dar dois cliques neste arquivo.
rem Chama o start.ps1 liberando a execucao de scripts so para ele: num Windows
rem novo o PowerShell bloqueia scripts e o ".\start.ps1" nem chegaria a rodar.
rem Repassa as opcoes, por exemplo: start.cmd -ConsoleBanco
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
if errorlevel 1 (
    pause
    exit /b 1
)
