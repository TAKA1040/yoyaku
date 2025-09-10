@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ===========================================
REM 共通 dev.bat（置いたフォルダ＝プロジェクトとして起動）
REM 使い方:
REM   dev.bat            → 既定 PORT=3000
REM   dev.bat 5555       → 指定ポートで起動
REM   dev.bat 5555 --vite --inspect  → 追加引数はそのままPSへ渡す
REM ===========================================

REM --- プロジェクトルート（この dev.bat がある場所） ---
set "PROJECT_DIR=%~dp0"

REM --- 既定ポート ---
set "PORT=3000"

REM --- 引数1が数値ならポートに採用し、シフト ---
if not "%~1"=="" (
  echo %~1| findstr /r "^[0-9][0-9]*$" >nul && set "PORT=%~1" && shift
)

REM --- 情報表示 ---
echo.
echo 🚀 ローカル開発を起動します...
echo 📁 PROJECT_DIR: %PROJECT_DIR%
echo 🌐 PORT       : %PORT%
echo.

REM --- 共通 PowerShell スクリプトの探索優先度 ---
REM 1) プロジェクト内 scripts/local-dev.ps1
REM 2) Windsurf 共通 C:\Windsurf\scripts\local-dev.ps1
set "PS_ENTRY=%PROJECT_DIR%scripts\local-dev.ps1"
if not exist "%PS_ENTRY%" set "PS_ENTRY=C:\Windsurf\scripts\local-dev.ps1"

if not exist "%PS_ENTRY%" (
  echo ❌ PowerShell エントリが見つかりません:
  echo    %PROJECT_DIR%scripts\local-dev.ps1
  echo    C:\Windsurf\scripts\local-dev.ps1
  echo    のどちらかを配置してください。
  exit /b 1
)

REM --- ENV ロード（公開系）: .env.local（任意）---
if exist "%PROJECT_DIR%\.env.local" (
  for /f "usebackq tokens=1,* delims== eol=#" %%A in ("%PROJECT_DIR%\.env.local") do (
    if not "%%~A"=="" set "%%~A=%%~B"
  )
)

REM --- ENV ロード（秘密／CLI専用）: .env.cli.secret（任意/推奨）---
if exist "%PROJECT_DIR%\.env.cli.secret" (
  for /f "usebackq tokens=1,* delims== eol=#" %%A in ("%PROJECT_DIR%\.env.cli.secret") do (
    if not "%%~A"=="" set "%%~A=%%~B"
  )
) else (
  echo ⚠ 注意: .env.cli.secret が見つかりません
  echo    （SUPABASE_DB_PASSWORD / SUPABASE_ACCESS_TOKEN が必要な処理は失敗する可能性）
)

REM --- PowerShell 実行（残りの引数はそのまま渡す）---
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_ENTRY%" "%PROJECT_DIR%" %PORT% %*

set EXITCODE=%ERRORLEVEL%
echo.
if "%EXITCODE%"=="0" (
  echo ✅ 開発サーバーが正常終了しました
) else (
  echo ⚠ 終了コード: %EXITCODE%
)
echo.
pause
endlocal
