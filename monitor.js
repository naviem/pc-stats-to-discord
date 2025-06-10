const si = require('systeminformation');
const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';
const CPU_THRESHOLD_PERCENT = parseInt(process.env.CPU_THRESHOLD_PERCENT || '80', 10);
const RAM_THRESHOLD_PERCENT = parseInt(process.env.RAM_THRESHOLD_PERCENT || '80', 10);
const TEMP_THRESHOLD_CELSIUS = parseInt(process.env.TEMP_THRESHOLD_CELSIUS || '85', 10);

// Time configurations - Try minutes first, then fallback to MS or defaults
let CHECK_INTERVAL_MS, ALERT_COOLDOWN_MS;
let checkIntervalSource = 'default MS';
let cooldownSource = 'default MS';

if (process.env.CHECK_INTERVAL_MINUTES) {
    CHECK_INTERVAL_MS = parseInt(process.env.CHECK_INTERVAL_MINUTES) * 60 * 1000;
    checkIntervalSource = 'minutes from .env';
} else {
    CHECK_INTERVAL_MS = parseInt(process.env.CHECK_INTERVAL_MS || '60000', 10);
    if (process.env.CHECK_INTERVAL_MS) checkIntervalSource = 'MS from .env';
}

if (process.env.ALERT_COOLDOWN_MINUTES) {
    ALERT_COOLDOWN_MS = parseInt(process.env.ALERT_COOLDOWN_MINUTES) * 60 * 1000;
    cooldownSource = 'minutes from .env';
} else {
    ALERT_COOLDOWN_MS = parseInt(process.env.ALERT_COOLDOWN_MS || '300000', 10); // Default 5 minutes (300000 ms)
    if (process.env.ALERT_COOLDOWN_MS) cooldownSource = 'MS from .env';
}

// Customizable alert messages
const CPU_THRESHOLD_MESSAGE = process.env.CPU_THRESHOLD_MESSAGE || '🚨 High CPU Alert! Current: {currentLoad}%, Threshold: {threshold}%';
const RAM_THRESHOLD_MESSAGE = process.env.RAM_THRESHOLD_MESSAGE || '⚠️ High RAM Alert! Current: {currentUsage}%, Threshold: {threshold}%';
const TEMP_THRESHOLD_MESSAGE = process.env.TEMP_THRESHOLD_MESSAGE || '🌡️ High CPU Temp! Current: {currentTemp}°C (Threshold: {threshold}°C)';

let lastCPUAlertTime = 0;
let lastRAMAlertTime = 0;
let lastTempAlertTime = 0;

async function sendDiscordNotification(message) {
    if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL === 'YOUR_DISCORD_WEBHOOK_URL_HERE' || DISCORD_WEBHOOK_URL === '') {
        console.warn('Discord Webhook URL not configured or is invalid. Skipping notification.');
        return;
    }
    try {
        await axios.post(DISCORD_WEBHOOK_URL, { content: message });
        console.log('Discord notification sent:', message);
    } catch (error) {
        console.error('Error sending Discord notification:', error.message);
    }
}

async function getCPUTemperature() {
    try {
        // Get CPU info first
        const cpuInfo = await si.cpu();
        const isIntel = cpuInfo.manufacturer.toLowerCase().includes('intel');
        const isAMD = cpuInfo.manufacturer.toLowerCase().includes('amd');

        if (isIntel) {
            // For Intel processors (like i7-10700)
            try {
                const { stdout } = await execPromise('powershell -Command "Get-WmiObject -Namespace root\\wmi -Class MSAcpi_ThermalZoneTemperature | Select-Object -ExpandProperty CurrentTemperature"');
                const temp = parseInt(stdout.trim());
                if (!isNaN(temp)) {
                    // Convert from Kelvin to Celsius
                    return (temp / 10 - 273.15);
                }
            } catch (error) {
                console.log('Intel temperature check failed:', error.message);
            }
        } else if (isAMD) {
            // For AMD processors (like Ryzen 5800H)
            try {
                const { stdout } = await execPromise('powershell -Command "Get-WmiObject -Namespace root\\cimv2 -Class Win32_PerfFormattedData_Counters_ThermalZoneInformation | Select-Object -ExpandProperty Temperature"');
                const temp = parseFloat(stdout.trim());
                if (!isNaN(temp)) {
                    return temp;
                }
            } catch (error) {
                console.log('AMD temperature check failed:', error.message);
            }
        }

        // If the above methods fail, try the systeminformation method
        const temp = await si.cpuTemperature();
        if (temp && temp.main !== null) {
            return temp.main;
        }

        // If all methods fail, return null
        console.log('Temperature monitoring not available. CPU Info:', {
            manufacturer: cpuInfo.manufacturer,
            brand: cpuInfo.brand,
            physicalCores: cpuInfo.physicalCores,
            cores: cpuInfo.cores
        });
        return null;
    } catch (error) {
        console.log('Error getting CPU temperature:', error.message);
        return null;
    }
}

async function checkSystemUsage() {
    try {
        const cpuUsage = await si.currentLoad();
        const memUsage = await si.mem();
        const currentCpuTemp = await getCPUTemperature();

        const currentCpuLoad = cpuUsage.currentLoad;
        const currentRamUsagePercent = (memUsage.used / memUsage.total) * 100;
        const currentTime = Date.now();

        // Simple temperature display - just show N/A if not available
        const tempDisplay = currentCpuTemp !== null ? `${currentCpuTemp.toFixed(1)}°C` : 'N/A';
        console.log(`Monitoring - CPU: ${currentCpuLoad.toFixed(2)}%, RAM: ${currentRamUsagePercent.toFixed(2)}%, Temp: ${tempDisplay}`);

        if (currentCpuLoad > CPU_THRESHOLD_PERCENT) {
            if (currentTime - lastCPUAlertTime > ALERT_COOLDOWN_MS) {
                const message = CPU_THRESHOLD_MESSAGE
                    .replace('{currentLoad}', currentCpuLoad.toFixed(2))
                    .replace('{threshold}', CPU_THRESHOLD_PERCENT.toString());
                sendDiscordNotification(message);
                lastCPUAlertTime = currentTime;
            }
        }

        if (currentRamUsagePercent > RAM_THRESHOLD_PERCENT) {
            if (currentTime - lastRAMAlertTime > ALERT_COOLDOWN_MS) {
                const message = RAM_THRESHOLD_MESSAGE
                    .replace('{currentUsage}', currentRamUsagePercent.toFixed(2))
                    .replace('{threshold}', RAM_THRESHOLD_PERCENT.toString());
                sendDiscordNotification(message);
                lastRAMAlertTime = currentTime;
            }
        }

        if (currentCpuTemp !== null && currentCpuTemp > TEMP_THRESHOLD_CELSIUS) {
            if (currentTime - lastTempAlertTime > ALERT_COOLDOWN_MS) {
                const message = TEMP_THRESHOLD_MESSAGE
                    .replace('{currentTemp}', currentCpuTemp.toFixed(1))
                    .replace('{threshold}', TEMP_THRESHOLD_CELSIUS.toString());
                sendDiscordNotification(message);
                lastTempAlertTime = currentTime;
            }
        }

    } catch (error) {
        console.error('Error during system usage check:', error);
    }
}

// Main execution
function startMonitoring() {
    console.log('PC Monitor Script Started');
    console.log('Monitoring CPU, RAM, and Temperature usage...');
    console.log(`CPU Threshold: ${CPU_THRESHOLD_PERCENT}%, RAM Threshold: ${RAM_THRESHOLD_PERCENT}%, Temp Threshold: ${TEMP_THRESHOLD_CELSIUS}°C`);
    console.log(`Check Interval: ${CHECK_INTERVAL_MS / 1000 / 60} minutes (${CHECK_INTERVAL_MS} ms) - (Source: ${checkIntervalSource})`);
    console.log(`Alert Cooldown: ${ALERT_COOLDOWN_MS / 1000 / 60} minutes (${ALERT_COOLDOWN_MS} ms) - (Source: ${cooldownSource})`);
    if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL === 'YOUR_DISCORD_WEBHOOK_URL_HERE' || DISCORD_WEBHOOK_URL === ''){
        console.warn('Reminder: Discord Webhook URL is not set in .env file. Notifications will be skipped.');
    }

    setInterval(checkSystemUsage, CHECK_INTERVAL_MS);
    checkSystemUsage(); // Initial check
}

// Basic error handling
process.on('uncaughtException', (err) => {
  console.error('There was an uncaught error', err);
  // process.exit(1); // Consider whether to exit on uncaught exceptions
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // process.exit(1); // Consider whether to exit on unhandled rejections
});

startMonitoring(); 