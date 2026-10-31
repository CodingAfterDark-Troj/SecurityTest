@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

if "%PORT%"=="" set PORT=3000
set TITLE=Helpdesk Asset Manager

rem Usage: start.bat [start|stop|restart|status]  (no argument shows a menu)
set ACTION=%~1
if /i "%ACTION%"=="start" goto start
if /i "%ACTION%"=="stop" goto stop
if /i "%ACTION%"=="restart" goto restart
if /i "%ACTION%"=="status" goto status
if not "%ACTION%"=="" goto usage

:menu
echo.
echo  %TITLE% (port %PORT%)
echo  ---------------------------------
echo   1. Start
echo   2. Stop
echo   3. Restart
echo   4. Status
echo   5. Exit
echo.
set /p CHOICE=Select an option:
if "%CHOICE%"=="1" call :start & goto menu
if "%CHOICE%"=="2" call :stop & goto menu
if "%CHOICE%"=="3" call :restart & goto menu
if "%CHOICE%"=="4" call :status & goto menu
if "%CHOICE%"=="5" goto :eof
goto menu

:start
call :findpid
if defined PID (
  echo Already running on port %PORT% ^(PID !PID!^).
  exit /b 0
)
where node >nul 2>nul || (echo Node.js was not found on PATH. & exit /b 1)
if not exist node_modules (
  echo Installing dependencies...
  call npm install || exit /b 1
)
echo Starting %TITLE%...
start "%TITLE%" cmd /k node server.js
ping -n 3 127.0.0.1 >nul
call :findpid
if defined PID (
  echo Running at http://127.0.0.1:%PORT% ^(PID !PID!^)
) else (
  echo Server did not start. Check the "%TITLE%" window for errors.
)
exit /b 0

:stop
call :findpid
if not defined PID (
  echo Not running.
  exit /b 0
)
taskkill /PID %PID% /F >nul
rem Close the server's console window too
taskkill /FI "WINDOWTITLE eq %TITLE%*" /F >nul 2>nul
echo Stopped ^(PID %PID%^).
exit /b 0

:restart
call :stop
ping -n 2 127.0.0.1 >nul
call :start
exit /b 0

:status
call :findpid
if defined PID (
  echo Running at http://127.0.0.1:%PORT% ^(PID %PID%^)
) else (
  echo Not running.
)
exit /b 0

:findpid
set PID=
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":%PORT% .*LISTENING"') do set PID=%%p
exit /b 0

:usage
echo Usage: %~nx0 [start^|stop^|restart^|status]
exit /b 1
