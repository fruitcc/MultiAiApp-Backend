module.exports = {
  apps: [{
    name: 'multiaiapp-backend',
    script: 'npx',
    args: 'tsx src/server.ts',
    cwd: '/var/www/MultiAiApp-Backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 48395
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 48395
    },
    error_file: '/var/log/pm2/multiaiapp-error.log',
    out_file: '/var/log/pm2/multiaiapp-out.log',
    log_file: '/var/log/pm2/multiaiapp-combined.log',
    time: true,
    kill_timeout: 5000,
    wait_ready: true,
    max_restarts: 10,
    min_uptime: '10s',
    // Cron restart (optional - restart every day at 3 AM)
    // cron_restart: '0 3 * * *'
  }]
};