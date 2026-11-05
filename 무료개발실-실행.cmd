@echo off
cd /d "%~dp0"
echo Starting free local development. Keep this window open.
echo After the server starts, open http://127.0.0.1:4174 in your browser.
node local-server.mjs
pause
