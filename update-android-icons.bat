@echo off
echo Updating Android app icons...

REM Copy launcher icons
echo Copying launcher icons...
copy "rijflow_icon_500.png" "android\app\src\main\res\mipmap-mdpi\ic_launcher.png"
copy "rijflow_icon_500.png" "android\app\src\main\res\mipmap-hdpi\ic_launcher.png"
copy "rijflow_icon_512.png" "android\app\src\main\res\mipmap-xhdpi\ic_launcher.png"
copy "rijflow_icon_512.png" "android\app\src\main\res\mipmap-xxhdpi\ic_launcher.png"
copy "rijflow_icon_1024.png" "android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png"

REM Copy round launcher icons
echo Copying round launcher icons...
copy "rijflow_icon_500.png" "android\app\src\main\res\mipmap-mdpi\ic_launcher_round.png"
copy "rijflow_icon_500.png" "android\app\src\main\res\mipmap-hdpi\ic_launcher_round.png"
copy "rijflow_icon_512.png" "android\app\src\main\res\mipmap-xhdpi\ic_launcher_round.png"
copy "rijflow_icon_512.png" "android\app\src\main\res\mipmap-xxhdpi\ic_launcher_round.png"
copy "rijflow_icon_1024.png" "android\app\src\main\res\mipmap-xxxhdpi\ic_launcher_round.png"

REM Copy splash screen icons (portrait)
echo Copying splash screen icons (portrait)...
copy "rijflow_icon_500.png" "android\app\src\main\res\drawable-port-mdpi\splash.png"
copy "rijflow_icon_500.png" "android\app\src\main\res\drawable-port-hdpi\splash.png"
copy "rijflow_icon_512.png" "android\app\src\main\res\drawable-port-xhdpi\splash.png"
copy "rijflow_icon_512.png" "android\app\src\main\res\drawable-port-xxhdpi\splash.png"
copy "rijflow_icon_1024.png" "android\app\src\main\res\drawable-port-xxxhdpi\splash.png"

REM Copy splash screen icons (landscape)
echo Copying splash screen icons (landscape)...
copy "rijflow_icon_500.png" "android\app\src\main\res\drawable-land-mdpi\splash.png"
copy "rijflow_icon_500.png" "android\app\src\main\res\drawable-land-hdpi\splash.png"
copy "rijflow_icon_512.png" "android\app\src\main\res\drawable-land-xhdpi\splash.png"
copy "rijflow_icon_512.png" "android\app\src\main\res\drawable-land-xxhdpi\splash.png"
copy "rijflow_icon_1024.png" "android\app\src\main\res\drawable-land-xxxhdpi\splash.png"

REM Copy main splash icon
echo Copying main splash icon...
copy "rijflow_icon_1024.png" "android\app\src\main\res\drawable\splash.png"

echo Android app icons updated successfully!
echo.
echo Next steps:
echo 1. Open Android Studio
echo 2. Clean and rebuild your project
echo 3. Run the app to see the new icons
pause 