@echo off
REM RijFlow TypeScript Files Removal Script
REM Dit script verwijdert alle TypeScript bestanden uit het iOS project

echo 🔧 RijFlow TypeScript Files Removal Script
echo =========================================

echo 🔍 Zoeken naar TypeScript bestanden in iOS project...
echo.

echo 📁 TypeScript bestanden gevonden:
for /r "ios\App\App" %%f in (*.ts) do (
    echo - %%f
)
for /r "ios\App\App" %%f in (*.tsx) do (
    echo - %%f
)
for /r "ios\App\App" %%f in (*.map) do (
    echo - %%f
)

echo.
echo 🗑️  Verwijderen van TypeScript bestanden...
for /r "ios\App\App" %%f in (*.ts) do (
    del "%%f" 2>nul
    if exist "%%f" (
        echo ❌ Kon %%f niet verwijderen
    ) else (
        echo ✅ Verwijderd: %%f
    )
)
for /r "ios\App\App" %%f in (*.tsx) do (
    del "%%f" 2>nul
    if exist "%%f" (
        echo ❌ Kon %%f niet verwijderen
    ) else (
        echo ✅ Verwijderd: %%f
    )
)
for /r "ios\App\App" %%f in (*.map) do (
    del "%%f" 2>nul
    if exist "%%f" (
        echo ❌ Kon %%f niet verwijderen
    ) else (
        echo ✅ Verwijderd: %%f
    )
)

echo.
echo 🔍 Controleren of alle TypeScript bestanden zijn verwijderd...
set "ts_files_found="
for /r "ios\App\App" %%f in (*.ts) do set "ts_files_found=1"
for /r "ios\App\App" %%f in (*.tsx) do set "ts_files_found=1"
for /r "ios\App\App" %%f in (*.map) do set "ts_files_found=1"

if defined ts_files_found (
    echo ⚠️  Er zijn nog steeds TypeScript bestanden gevonden!
    echo 📁 Overgebleven bestanden:
    for /r "ios\App\App" %%f in (*.ts) do echo - %%f
    for /r "ios\App\App" %%f in (*.tsx) do echo - %%f
    for /r "ios\App\App" %%f in (*.map) do echo - %%f
) else (
    echo ✅ Alle TypeScript bestanden zijn succesvol verwijderd!
)

echo.
echo 🎯 Volgende stappen:
echo 1. Kopieer dit project naar je Mac
echo 2. Open Xcode en build de app
echo 3. Het zwarte scherm zou nu opgelost moeten zijn
echo.
echo 📖 Zie iOS_BLACK_SCREEN_FIX.md voor meer informatie 