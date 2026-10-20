@echo off
rem Encerra o VidaReal (o que o start.cmd ou o start.ps1 deixaram rodando).
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop.ps1" %*
pause
