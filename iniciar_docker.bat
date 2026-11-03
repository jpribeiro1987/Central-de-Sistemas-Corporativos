@echo off
title Portal de Acessos HSA - Docker (Porta 8090)
cd /d "%~dp0"
echo ========================================================
echo   Iniciando Portal de Acessos HSA via Docker
echo   Porta de Operacao: 8090
echo ========================================================
echo.
echo Verificando se o Docker esta em execucao...
docker info >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo [AVISO] O servico do Docker Desktop nao parece estar ativo.
  echo Inicie o Docker Desktop no Windows e tente novamente.
  echo.
  pause
  exit /b 1
)

echo Construindo e iniciando container Docker...
docker compose up -d --build

echo.
echo Abrindo o portal no navegador padrao...
start http://localhost:8090

echo.
echo ========================================================
echo Container iniciado com sucesso em segundo plano!
echo Para visualizar os logs: docker logs -f portal-acessos-hsa
echo Para parar o container:  docker compose down
echo ========================================================
echo.
pause
