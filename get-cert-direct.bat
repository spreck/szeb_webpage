@echo off
echo Getting certificates directly...

:: Go to the correct directory
cd /d P:\Projects\SZEB_Website_claude\nginx_evac_app

:: Run certbot in standalone mode
echo Starting certbot in standalone mode...
docker run -it --rm -p 80:80 -p 443:443 ^
  -v "%cd%\certbot\conf:/etc/letsencrypt" ^
  -v "%cd%\certbot\www:/var/www/certbot" ^
  certbot/certbot certonly --standalone -d conescout.duckdns.org --email jasonpwhitney@gmail.com --agree-tos --non-interactive

echo Done!
pause
