Get-Command wt -ErrorAction Stop | Out-Null
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -ErrorAction SilentlyContinue
$Path = (Get-Item $PSScriptRoot).Parent.Parent.FullName
Write-Host "Dev Emulators starting in $Path" -ForegroundColor Green

pwsh -file (Join-Path $PSScriptRoot 'Start-DevInstallation.ps1')

Write-Host 'Starting Dev Emulators'

wt --title linktome`; new-tab --title 'Azurite' -d $Path pwsh -c azurite`; new-tab --title 'FunctionApp' -d $Path\linktome-api pwsh -c func start`; new-tab --title 'linktome Frontend' -d $Path\linktome pwsh -c npm run dev`; new-tab --title 'SWA' -d $Path\linktome pwsh -c npm run start-swa
