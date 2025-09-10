param(
  [Parameter(Mandatory=$true)] [string]$ProjectDir,
  [Parameter(Mandatory=$true)] [int]$Port,
  [Parameter(ValueFromRemainingArguments=$true)] [string[]]$RestArgs
)

Write-Host ""
Write-Host "🛠  local-dev.ps1 起動" -ForegroundColor Cyan
Write-Host "📁 ProjectDir :" $ProjectDir
Write-Host "🌐 Port       :" $Port
if ($RestArgs.Count -gt 0) { Write-Host "➕ Extra Args :" ($RestArgs -join " ") }

# 1) 前提チェック
if (-not (Test-Path $ProjectDir)) {
  Write-Error "ProjectDir が見つかりません: $ProjectDir"
  exit 1
}
Set-Location $ProjectDir

# 2) パッケージマネージャ検出
$pkgCmd = $null
if (Test-Path "$ProjectDir\pnpm-lock.yaml") { $pkgCmd = "pnpm" }
elseif (Test-Path "$ProjectDir\yarn.lock")   { $pkgCmd = "yarn" }
elseif (Test-Path "$ProjectDir\bun.lockb")   { $pkgCmd = "bun" }
elseif (Test-Path "$ProjectDir\package-lock.json") { $pkgCmd = "npm" }
else { $pkgCmd = "npm" }

Write-Host "📦 PackageMgr :" $pkgCmd

# 3) ポート空き確認＆必要なら自動インクリメント（最大 +10）
function Test-PortFree([int]$p){
  $inUse = (Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue)
  return -not $inUse
}
$tryPort = $Port
$maxShift = 10
$shift = 0
while (-not (Test-PortFree $tryPort)) {
  $shift++
  if ($shift -gt $maxShift) {
    Write-Error "指定ポートが空かず中断しました: $Port ~ $tryPort"
    exit 2
  }
  $tryPort++
}
if ($tryPort -ne $Port) {
  Write-Host ("⚠ ポート {0} は使用中のため {1} に切替えます" -f $Port, $tryPort) -ForegroundColor Yellow
  $Port = $tryPort
}

# 4) 依存インストール（node_modules が無ければ）
if (-not (Test-Path "$ProjectDir\node_modules")) {
  Write-Host "⬇  初回セットアップ: 依存をインストール中..."
  switch ($pkgCmd) {
    "pnpm" { pnpm install }
    "yarn" { yarn install }
    "bun"  { bun install }
    default { npm install }
  }
}

# 5) 環境変数をプロセスに適用（BAT 側で読み込んだ値も保持）
$env:PORT = "$Port"

# 6) 開発サーバ起動
Write-Host ""
Write-Host ("▶  Dev Start on http://localhost:{0}" -f $Port) -ForegroundColor Green

$devCmd = $null
switch ($pkgCmd) {
  "pnpm" { $devCmd = "pnpm dev --port $Port " + ($RestArgs -join " ") }
  "yarn" { $devCmd = "yarn dev --port $Port " + ($RestArgs -join " ") }
  "bun"  { $devCmd = "bun run dev -- --port $Port " + ($RestArgs -join " ") }
  default { $devCmd = "npm run dev -- --port $Port " + ($RestArgs -join " ") }
}

# npm scripts が無い場合は next 直叩きのフォールバック
if (-not (Test-Path "$ProjectDir\package.json")) {
  Write-Warning "package.json が見つかりません。next 直叩きにフォールバックします。"
  $devCmd = "npx next dev -p $Port " + ($RestArgs -join " ")
}

Write-Host "💬 Exec: $devCmd"
# 実行
cmd /c $devCmd
$exitCode = $LASTEXITCODE
Write-Host ""
Write-Host ("⏹  終了コード: {0}" -f $exitCode)
exit $exitCode
