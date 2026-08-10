@echo off
setlocal

REM Deployment script for Nhost Cloud (Windows)
REM Usage: deploy.bat <subdomain>

set SUBDOMAIN=%1

if "%SUBDOMAIN%"=="" (
  echo Usage: deploy.bat ^<nhost-project-subdomain^>
  echo Example: deploy.bat abcdefghijklmnop
  exit /b 1
)

echo Deploying to Nhost Cloud: %SUBDOMAIN%

REM Check if nhost CLI is installed
where nhost >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo Nhost CLI not found. Installing...
  call npm install -D @nhost/cli
)

REM Login to Nhost
echo Logging in to Nhost...
call nhost login

REM Push functions and metadata to cloud
echo Pushing to cloud...
call nhost push --subdomain %SUBDOMAIN%

echo Deployment complete!
echo.
echo Your Nhost project URLs:
echo   Dashboard: https://%SUBDOMAIN%.dashboard.nhost.run
echo   GraphQL:   https://%SUBDOMAIN%.hasura.nhost.run/v1/graphql
echo   Auth:      https://%SUBDOMAIN%.auth.nhost.run
echo   Storage:   https://%SUBDOMAIN%.storage.nhost.run
echo   Functions: https://%SUBDOMAIN%.functions.nhost.run
