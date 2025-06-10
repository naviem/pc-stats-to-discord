@echo off
powershell -Command "Start-Process node -ArgumentList 'monitor.js' -Verb RunAs" 