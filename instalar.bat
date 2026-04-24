@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul

echo ============================================
echo   Instalador - Padaria PDV
echo ============================================
echo.

:: Verificar se está rodando como administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Execute este script como Administrador.
    echo Clique com o botao direito no arquivo e escolha "Executar como administrador".
    pause
    exit /b 1
)

:: Configurações
set REPO_URL=https://github.com/Bruno1307/panificadora.git
set INSTALL_DIR=%USERPROFILE%\padaria-pdv
set RANCHER_URL=https://github.com/rancher-sandbox/rancher-desktop/releases/latest/download/Rancher.Desktop.Setup.latest.exe
set RANCHER_INSTALLER=%TEMP%\RancherDesktopSetup.exe

:: ============================================
:: PASSO 1 - Verificar/instalar Git
:: ============================================
echo [1/4] Verificando Git...
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo Git nao encontrado. Baixando instalador...
    set GIT_URL=https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/Git-2.44.0-64-bit.exe
    set GIT_INSTALLER=%TEMP%\GitSetup.exe
    powershell -Command "Invoke-WebRequest -Uri '!GIT_URL!' -OutFile '!GIT_INSTALLER!'" 
    echo Instalando Git (aguarde)...
    "!GIT_INSTALLER!" /VERYSILENT /NORESTART /NOCANCEL
    :: Recarregar PATH
    call refreshenv >nul 2>&1
    set "PATH=%PATH%;C:\Program Files\Git\cmd"
    where git >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERRO: Falha ao instalar Git. Instale manualmente em https://git-scm.com
        pause
        exit /b 1
    )
    echo Git instalado com sucesso.
) else (
    echo Git OK.
)

:: ============================================
:: PASSO 2 - Verificar/instalar Rancher Desktop
:: ============================================
echo.
echo [2/4] Verificando Rancher Desktop (Docker)...
where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo Rancher Desktop nao encontrado. Baixando instalador (~600 MB, aguarde)...
    powershell -Command "Invoke-WebRequest -Uri '%RANCHER_URL%' -OutFile '%RANCHER_INSTALLER%'"
    if %errorlevel% neq 0 (
        echo ERRO: Falha ao baixar Rancher Desktop.
        echo Baixe manualmente em: https://rancherdesktop.io
        pause
        exit /b 1
    )
    echo Instalando Rancher Desktop (aguarde, pode demorar alguns minutos)...
    "%RANCHER_INSTALLER%" /S
    echo.
    echo IMPORTANTE: Rancher Desktop foi instalado.
    echo Aguarde ele iniciar completamente (icone na bandeja do sistema).
    echo Quando estiver pronto, pressione qualquer tecla para continuar.
    pause
) else (
    echo Docker OK.
)

:: Verificar docker compose
docker compose version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: docker compose nao disponivel. Verifique se o Rancher Desktop iniciou corretamente.
    pause
    exit /b 1
)

:: ============================================
:: PASSO 3 - Clonar ou atualizar repositório
:: ============================================
echo.
echo [3/4] Configurando aplicacao em %INSTALL_DIR%...

if exist "%INSTALL_DIR%\.git" (
    echo Atualizando versao existente...
    cd /d "%INSTALL_DIR%"
    git pull origin main
) else (
    echo Baixando aplicacao...
    git clone %REPO_URL% "%INSTALL_DIR%"
    if %errorlevel% neq 0 (
        echo ERRO: Falha ao clonar repositorio.
        pause
        exit /b 1
    )
)

cd /d "%INSTALL_DIR%"

:: ============================================
:: PASSO 4 - Subir containers
:: ============================================
echo.
echo [4/4] Iniciando Padaria PDV (primeira vez pode demorar ~5 minutos)...
docker compose -f docker-compose.yml -f docker-compose.windows.yml build
docker compose -f docker-compose.yml -f docker-compose.windows.yml up -d

if %errorlevel% neq 0 (
    echo ERRO: Falha ao iniciar containers.
    echo Verifique se o Rancher Desktop esta rodando e tente novamente.
    echo Para ver os logs: docker compose -f docker-compose.yml -f docker-compose.windows.yml logs
    pause
    exit /b 1
)

:: Aguardar backend ficar pronto
echo.
echo Aguardando sistema iniciar...
set WAIT_COUNT=0
:WAIT_LOOP
timeout /t 3 /nobreak >nul
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% neq 0 (
    set /a WAIT_COUNT+=1
    if !WAIT_COUNT! lss 20 goto WAIT_LOOP
    echo Aviso: Backend demorou mais que o esperado. Verifique com: docker compose -f docker-compose.yml -f docker-compose.windows.yml logs
)

:: Criar atalho na área de trabalho
echo.
echo Criando atalho na area de trabalho...
set SHORTCUT=%USERPROFILE%\Desktop\Padaria PDV.lnk
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = 'explorer.exe'; $s.Arguments = 'http://localhost'; $s.Description = 'Padaria PDV'; $s.Save()"

:: Criar script de atualização
echo Criando atalho de atualizacao...
(
echo @echo off
echo cd /d "%INSTALL_DIR%"
echo git pull origin main
echo docker compose -f docker-compose.yml -f docker-compose.windows.yml build
echo docker compose -f docker-compose.yml -f docker-compose.windows.yml up -d
echo echo Sistema atualizado com sucesso!
echo pause
) > "%USERPROFILE%\Desktop\Atualizar PDV.bat"

echo.
echo ============================================
echo   Instalacao concluida com sucesso!
echo ============================================
echo.
echo   Acesso local:    http://localhost
echo   Acesso na rede:  http://SEU_IP (para outros dispositivos)
echo.
echo   Atalhos criados na area de trabalho:
echo   - "Padaria PDV"     : abre o sistema no navegador
echo   - "Atualizar PDV"   : baixa e aplica atualizacoes
echo.
echo Abrindo o sistema no navegador...
timeout /t 2 /nobreak >nul
start http://localhost

pause
