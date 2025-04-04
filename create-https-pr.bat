@echo off
echo ======================================================
echo CREATING GITHUB PR FOR HTTPS AND OAUTH
echo ======================================================
echo.

:: Go to the correct directory
cd /d P:\Projects\SZEB_Website_claude\nginx_evac_app

:: Show the current status first
echo Current git status:
git status
echo.
echo Please verify no sensitive files are being included
echo before continuing!
echo.
pause

:: Create a new branch
echo Creating new branch for HTTPS and OAuth...
git checkout main
git pull
git checkout -b feature/https-oauth

:: Add all files
echo Adding files to git...
git add .

:: Commit the changes
echo Committing changes...
git commit -m "Add HTTPS and OAuth support with simplified Nginx configuration"

:: Push the branch
echo Pushing branch to GitHub...
git push -u origin feature/https-oauth

echo.
echo ======================================================
echo PR branch has been pushed to GitHub!
echo.
echo Go to your GitHub repository to create a pull request,
echo or use this URL (replace with your actual repository):
echo https://github.com/USERNAME/REPOSITORY/compare/main...feature/https-oauth
echo.
echo Use the PR description template from git-pr-commands.md
echo ======================================================
echo.
pause
