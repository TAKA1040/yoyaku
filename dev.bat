@echo off
REM ===========================================
REM AIツール共通 - 超簡単ローカル開発起動
REM ===========================================
REM 使用方法: 
REM   dev                          (現在のディレクトリから)
REM   dev nenpi                    (nenpiプロジェクト起動)
REM   dev mimamori-calendar2       (見守りカレンダー起動)
REM   dev nenpi 5000               (ポート指定起動)

echo 🚀 ローカル開発環境を起動します...

REM 引数の解析
set PROJECT_DIR=%CD%
set PORT=3000

REM 引数1がプロジェクト名の場合
if "%~1"=="nenpi" set PROJECT_DIR=C:\Windsurf\nenpi
if "%~1"=="mimamori-calendar2" set PROJECT_DIR=C:\Windsurf\mimamori-calendar2
if "%~1"=="hikaku" set PROJECT_DIR=C:\Windsurf\hikaku
if "%~1"=="voiceCast" set PROJECT_DIR=C:\Windsurf\voiceCast
if "%~1"=="autocore" set PROJECT_DIR=C:\Windsurf\autocore
if "%~1"=="yoyaku" set PROJECT_DIR=C:\Windsurf\yoyaku

REM 引数2がポート番号の場合
if not "%~2"=="" set PORT=%~2

REM 引数1がポート番号の場合（プロジェクト名でない場合）
if not "%~1"=="nenpi" if not "%~1"=="mimamori-calendar2" if not "%~1"=="hikaku" if not "%~1"=="voiceCast" if not "%~1"=="autocore" if not "%~1"=="yoyaku" if not "%~1"=="" (
    echo %~1| findstr /r "^[0-9][0-9]*$" >nul && set PORT=%~1
)

echo 📁 プロジェクト: %PROJECT_DIR%
echo 🌐 ポート: %PORT%

REM PowerShellスクリプト実行
powershell -ExecutionPolicy Bypass -File "C:\Windsurf\scripts\local-dev.ps1" "%PROJECT_DIR%" %PORT%

echo ✅ 開発サーバーが終了しました
pause