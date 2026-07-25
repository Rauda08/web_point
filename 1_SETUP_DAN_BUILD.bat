@echo off
cd /d %~dp0
if not exist .env copy .env.example .env
composer install
php artisan key:generate
cd resources\frontend
call npm install
call npm run build
cd ..\..
php artisan optimize:clear
echo Setup selesai. Pastikan database poinsman2 sudah dibuat dan .env sudah benar.
pause
