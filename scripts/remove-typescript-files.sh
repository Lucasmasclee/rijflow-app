#!/bin/bash

# RijFlow TypeScript Files Removal Script
# Dit script verwijdert alle TypeScript bestanden uit het iOS project

echo "🔧 RijFlow TypeScript Files Removal Script"
echo "========================================="

echo "🔍 Zoeken naar TypeScript bestanden in iOS project..."
echo

echo "📁 TypeScript bestanden gevonden:"
find ios/App/App -name "*.ts" -type f
find ios/App/App -name "*.tsx" -type f
find ios/App/App -name "*.map" -type f

echo
echo "🗑️  Verwijderen van TypeScript bestanden..."
find ios/App/App -name "*.ts" -type f -delete
find ios/App/App -name "*.tsx" -type f -delete
find ios/App/App -name "*.map" -type f -delete

echo
echo "🔍 Controleren of alle TypeScript bestanden zijn verwijderd..."
ts_files_found=$(find ios/App/App -name "*.ts" -o -name "*.tsx" -o -name "*.map" 2>/dev/null)

if [ -n "$ts_files_found" ]; then
    echo "⚠️  Er zijn nog steeds TypeScript bestanden gevonden!"
    echo "📁 Overgebleven bestanden:"
    echo "$ts_files_found"
else
    echo "✅ Alle TypeScript bestanden zijn succesvol verwijderd!"
fi

echo
echo "🎯 Volgende stappen:"
echo "1. Open Xcode en build de app"
echo "2. Het zwarte scherm zou nu opgelost moeten zijn"
echo
echo "📖 Zie iOS_BLACK_SCREEN_FIX.md voor meer informatie" 