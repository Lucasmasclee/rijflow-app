@echo off
echo Fixing iOS Capacitor configuration...
echo.

echo Syncing Capacitor project...
npx cap sync ios

echo.
echo Opening iOS project in Xcode...
npx cap open ios

echo.
echo Please build and run the project in Xcode
echo If you still see a black screen, try:
echo 1. Clean build folder (Product -> Clean Build Folder)
echo 2. Delete derived data (Window -> Projects -> Click arrow next to project -> Delete)
echo 3. Rebuild the project
pause 