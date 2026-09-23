@echo off
title Projetos e Produtos - servidor local
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto semnode

node "servidor.js"
goto fim

:semnode
echo.
echo   O Node.js nao foi encontrado neste computador.
echo   Instale em https://nodejs.org e rode este arquivo de novo.
echo.
pause

:fim
