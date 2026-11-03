@echo off
title Portal de Acessos HSA - Servidor
cd /d "%~dp0"
echo ========================================================
echo   Iniciando Portal de Acessos - Hospital Santo Antonio
echo ========================================================
echo.
echo Abrindo o portal no navegador padrao (Porta 8090)...
start http://localhost:8090
echo.
echo Executando o servidor Node.js...
echo Para encerrar o servidor, feche esta janela ou pressione Ctrl + C.
echo.
node server.js
pause
