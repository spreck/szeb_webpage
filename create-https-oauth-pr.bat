@echo off
echo ======================================================
echo CREATING GITHUB PR FOR HTTPS AND OAUTH IMPLEMENTATION
echo ======================================================
echo.

REM Change to the correct directory
cd /d P:\Projects\SZEB_Website_claude\nginx_evac_app

REM Create a new branch
echo Creating new branch for HTTPS and OAuth implementation...
git checkout -b feature/https-oauth-implementation

REM Check for sensitive files
echo Checking for sensitive files...
echo.
echo IMPORTANT: Make sure these sensitive files are NOT committed:
echo   - client_secret*.json 
 echo  - .env
echo   - certbot/conf/
echo.
echo Files in the current directory:
git status
echo.
pause
echo.

REM Add all new and modified files
echo Adding files to git...
git add .

REM Commit the changes
echo Committing changes...
git commit -m "Implement HTTPS and OAuth authentication"

REM Push the branch to GitHub
echo Pushing branch to GitHub...
git push -u origin feature/https-oauth-implementation

echo.
echo ======================================================
echo Branch has been pushed to GitHub!
echo.
echo To create a PR, go to:
echo https://github.com/YOUR_USERNAME/REPOSITORY_NAME/pull/new/feature/https-oauth-implementation
echo.
echo Or use the GitHub web interface and create a PR from branch:
echo feature/https-oauth-implementation
echo ======================================================
echo.

pause
