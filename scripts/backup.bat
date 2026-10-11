@echo off
set TOOLS=C:\Users\DELL\Downloads\mongodb-database-tools-windows-x86_64-100.19.1\bin
set DB=test
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm"') do set STAMP=%%i
set OUT=C:\MediCoreBackups\%STAMP%
mkdir "%OUT%"
"%TOOLS%\mongodump.exe" --db %DB% --out "%OUT%"
echo.
echo Backup saved to %OUT%
pause