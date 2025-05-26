# PC Monitor CLI Script

A simple Node.js command-line script to monitor your PC's CPU, RAM, and CPU Temperature, and send notifications to a Discord webhook when usage exceeds configured thresholds.

## Features

- Real-time background monitoring of CPU usage, RAM usage, and CPU Temperature.
- Discord notifications for high CPU, RAM, and Temperature readings.
- Configurable alert thresholds and check intervals via a `.env` file.
- Customizable Discord alert messages.
- Alert cooldown period to prevent notification spam.
- No web server, purely a command-line tool.

## Prerequisites

- Node.js (v14 or later recommended)
- npm (usually comes with Node.js)

## Setup

1.  **Clone the repository (or download the files):**
    ```bash
    # If you have git installed
    # git clone <repository_url>
    # cd pc-monitor
    ```

2.  **Install dependencies:**
    Run this command in the project's root directory:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    
    Create a `.env` file in the root of the project. You can copy `env.example` (if provided) or create it manually with the following content, adjusting values to your needs:

    ```env
    # Your Discord Webhook URL (Required for notifications)
    DISCORD_WEBHOOK_URL=YOUR_DISCORD_WEBHOOK_URL_HERE

    # CPU usage threshold (percentage, e.g., 80 for 80%)
    CPU_THRESHOLD_PERCENT=80
    # RAM usage threshold (percentage, e.g., 80 for 80%)
    RAM_THRESHOLD_PERCENT=80
    # CPU temperature threshold (in Celsius, e.g., 85 for 85°C)
    TEMP_THRESHOLD_CELSIUS=85

    # --- Time Settings (Provide EITHER minutes OR milliseconds) ---

    # Interval for checking system stats (in minutes)
    # Takes precedence over CHECK_INTERVAL_MS if set.
    # CHECK_INTERVAL_MINUTES=1 

    # Interval for checking system stats (in milliseconds)
    # Used if CHECK_INTERVAL_MINUTES is not set. Default is 1 minute (60000 ms).
    # CHECK_INTERVAL_MS=60000

    # Alert Cooldown period (in minutes)
    # Prevents spamming notifications for the same metric if it remains high.
    # Takes precedence over ALERT_COOLDOWN_MS if set.
    # ALERT_COOLDOWN_MINUTES=5

    # Alert Cooldown period (in milliseconds)
    # Used if ALERT_COOLDOWN_MINUTES is not set. Default is 5 minutes (300000 ms).
    # ALERT_COOLDOWN_MS=300000

    # Optional: Customize Discord alert messages
    # CPU_THRESHOLD_MESSAGE=🚨 High CPU Alert! Current: {currentLoad}%, Threshold: {threshold}%
    # RAM_THRESHOLD_MESSAGE=⚠️ High RAM Alert! Current: {currentUsage}%, Threshold: {threshold}%
    # TEMP_THRESHOLD_MESSAGE=🌡️ CPU Temp High: {currentTemp}°C (Limit: {threshold}°C)
    
    # Optional: Set a custom port for the application (default is 3001 if not specified) - NO LONGER USED
    # PORT=3002 
    ```
    
    **Important:** 
    - Replace `YOUR_DISCORD_WEBHOOK_URL_HERE` with your actual Discord webhook URL. If not set, notifications will be skipped.
    - Adjust thresholds and messages as needed. The placeholders like `{currentLoad}`, `{currentUsage}`, `{currentTemp}`, and `{threshold}` will be replaced with actual values in the notifications.

4.  Ensure `require('dotenv').config();` is present at the top of `monitor.js` (it should be by default).

## Running the Script

1.  **Start the monitoring script:**
    ```bash
    npm start
    ```
    The script will run in your terminal, periodically logging the current stats and sending Discord notifications if thresholds are met.

2.  **For development (with automatic script restart on file changes):**
    ```bash
    npm run dev
    ```
    This uses `nodemon` (listed in `devDependencies`).

## How it Works

-   The script (`monitor.js`) uses the `systeminformation` library to fetch CPU, RAM, and CPU temperature statistics.
-   Periodically (defined by `CHECK_INTERVAL_MS`), it checks these stats against the configured thresholds in your `.env` file.
-   If a threshold is exceeded and the cooldown period for that metric has passed, it sends a notification message (customizable via `.env`) to the specified Discord webhook URL using `axios`.
-   All operations are logged to the console.

## Future Enhancements (Ideas)

-   Add monitoring for other system components (e.g., GPU, Disk, Network).
-   Option to log data to a file.
-   More sophisticated error handling and retry mechanisms for Discord notifications.
-   Package as an executable for easier distribution. 