@echo off
set TOOLS=C:\Users\DELL\Downloads\mongodb-database-tools-windows-x86_64-100.19.1\bin
set DB=test
echo WARNING: this replaces the current data in "%DB%" with the backup.
echo Stop the backend first (Ctrl + C in its terminal).
set /p SRC=Paste the backup folder path, for example C:\MediCoreBackups\2026-10-09_10-32 : 
set SRC=%SRC:"=%
for /f "tokens=* delims= " %%a in ("%SRC%") do set SRC=%%a
"%TOOLS%\mongorestore.exe" --drop --nsInclude=%DB%.* "%SRC%"
pause