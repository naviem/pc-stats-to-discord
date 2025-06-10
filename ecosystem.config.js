module.exports = {
  apps: [{
    name: "pc-monitor",
    script: "monitor.js",
    exec_mode: "fork",
    interpreter: "node",
    interpreter_args: "--max-old-space-size=512",
    env: {
      NODE_ENV: "production"
    },
    // Run with elevated privileges
    exec_interpreter: "powershell.exe",
    interpreter_args: "Start-Process node -ArgumentList 'monitor.js' -Verb RunAs"
  }]
} 