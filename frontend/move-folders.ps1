# PowerShell script to move all module folders to (protected) route group
# Run this from the frontend/app directory

$foldersToMove = @(
    "dashboard",
    "organizasyon",
    "degerlendirme",
    "egitim",
    "gelisim",
    "izinler",
    "maas",
    "kariyer",
    "yedekleme",
    "talent",
    "yetenek-matrisi",
    "ise-alim",
    "kullanici",
    "ekip-yönetimi",
    "işe-alım"
)

$protectedPath = "(protected)"

# Ensure protected directory exists
if (-not (Test-Path $protectedPath)) {
    New-Item -ItemType Directory -Name $protectedPath -Force | Out-Null
    Write-Host "Created $protectedPath directory"
}

foreach ($folder in $foldersToMove) {
    if (Test-Path $folder) {
        Write-Host "Moving $folder to $protectedPath..."
        try {
            Move-Item -Path $folder -Destination "$protectedPath\$folder" -Force -ErrorAction Stop
            Write-Host "Successfully moved $folder"
        } catch {
            Write-Host "Error moving $folder : $_" -ForegroundColor Red
        }
    } else {
        Write-Host "Folder $folder not found, skipping..." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Script completed!"
Write-Host "Note: dashboard/layout.tsx was already deleted as it's replaced by (protected)/layout.tsx"
