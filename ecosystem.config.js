module.exports = {
  apps: [{
    name: "pc-monitor",
    script: "monitor.js",
    exec_mode: "fork",
    interpreter: "node",
    env: {
      NODE_ENV: "production"
    },
    // Run with elevated privileges using a batch file
    interpreter: "cmd.exe",
    interpreter_args: "/c start /high node monitor.js"
  }]
} 