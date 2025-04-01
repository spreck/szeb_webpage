@echo off
setlocal enabledelayedexpansion

:: Directory setup
set "src_root=%CD%"
set "backup_root=%src_root%\backups"

:: Help function
if "%1"=="help" (
    echo Usage:
    echo backup.bat             - Create new backup
    echo backup.bat list        - List available backups
    echo backup.bat restore [timestamp] - Restore from backup
    echo backup.bat help        - Show this help message
    exit /b 0
)

:: List backups function
if "%1"=="list" (
    echo.
    echo Available backups:
    echo.
    dir /b /ad "%backup_root%\individual"
    echo.
    echo Combined files:
    dir /b "%backup_root%\combined"
    exit /b 0
)

:: Restore function
if "%1"=="restore" (
    if "%2"=="" (
        echo Usage: backup.bat restore [timestamp]
        exit /b 1
    )
    
    set "restore_dir=%backup_root%\individual\backup_%2"
    
    if not exist "!restore_dir!" (
        echo Backup %2 not found
        exit /b 1
    )
    
    echo.
    echo Restoring from backup %2...
    xcopy /s /i /y "!restore_dir!" "%src_root%" > nul
    
    echo Restored from backup %2
    exit /b 0
)

:: Set timestamp for backup folders
set timestamp=%date:~10,4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set timestamp=%timestamp: =0%
set "backup_dir=%backup_root%\individual\backup_%timestamp%"

:: Create backup directories
if not exist "%backup_root%" mkdir "%backup_root%"
if not exist "%backup_root%\combined" mkdir "%backup_root%\combined"
if not exist "%backup_root%\individual" mkdir "%backup_root%\individual"
if not exist "%backup_dir%" mkdir "%backup_dir%"

echo Starting backup process...
echo Backup directory: %backup_dir%

:: Backup root directory files
echo.
echo Backing up root directory files...

:: Backup specific file types from root
for %%E in (Dockerfile* *.yml *.js *.conf *.py) do (
    if exist "%%E" (
        echo Backing up %%~nxE...
        copy "%%E" "%backup_dir%\%%~nxE" > nul
    )
)

:: Directory list to backup
set "dirs_to_backup=static templates nginx mdb_service"

:: Backup directories
for %%D in (%dirs_to_backup%) do (
    if exist "%%D" (
        echo.
        echo Backing up %%D directory...
        mkdir "%backup_dir%\%%D" 2>nul
        xcopy /s /i /y "%%D" "%backup_dir%\%%D" > nul
        echo Directory %%D backed up successfully
    ) else (
        echo Warning: Directory %%D not found
    )
)

:: Create combined file
echo.
echo Creating combined backup file...
set "combined_file=%backup_dir%\combined_backup.txt"
echo === Backup created on %date% at %time% === > "%combined_file%"
echo. >> "%combined_file%"

:: Function to append file to combined backup
:append_file
if exist "%~1" (
    echo Adding %~nx1 to combined file...
    echo === File: %~1 === >> "%combined_file%"
    echo. >> "%combined_file%"
    type "%~1" >> "%combined_file%"
    echo. >> "%combined_file%"
    echo. >> "%combined_file%"
)
goto :eof

:: Add root files to combined backup
for %%E in (Dockerfile* *.yml *.js *.conf *.py) do (
    if exist "%%E" (
        call :append_file "%%E"
    )
)

:: Add directory contents to combined file
for %%D in (%dirs_to_backup%) do (
    if exist "%%D" (
        echo Adding files from %%D directory...
        for /r "%%D" %%F in (*) do (
            call :append_file "%%F"
        )
    )
)

:: Copy combined file to combined directory
copy "%combined_file%" "%backup_root%\combined\combined_%timestamp%.txt" > nul

echo.
echo Backup completed successfully!
echo Backup location: %backup_dir%
echo Combined files:
echo - %combined_file%
echo - %backup_root%\combined\combined_%timestamp%.txt