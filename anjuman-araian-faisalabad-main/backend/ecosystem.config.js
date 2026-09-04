module.exports = {
  apps: [
    {
      name: "anjumanearaian-backend",
      script: "dist/index.js",
      instances: "max", // Use all available CPU cores
      exec_mode: "cluster",
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      // Auto-restart settings
      max_restarts: 10,
      restart_delay: 5000,
      // Logging
      log_file: "/var/log/anjuman/combined.log",
      out_file: "/var/log/anjuman/out.log",
      error_file: "/var/log/anjuman/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      // Memory limit — restart if over 512MB
      max_memory_restart: "512M",
    },
  ],
};
