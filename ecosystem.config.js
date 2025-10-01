module.exports = {
  apps: [
    {
      name: 'bot',
      script: 'bot.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        BOT_TOKEN: process.env.BOT_TOKEN,
        DATABASE_URL: process.env.DATABASE_URL,
        ADMIN_CHAT_ID: process.env.ADMIN_CHAT_ID,
        WEBHOOK_TOKEN: process.env.WEBHOOK_TOKEN,
        WEBHOOK_PORT: process.env.WEBHOOK_PORT || 8080
      },
      env_production: {
        NODE_ENV: 'production',
        BOT_TOKEN: process.env.BOT_TOKEN,
        DATABASE_URL: process.env.DATABASE_URL,
        ADMIN_CHAT_ID: process.env.ADMIN_CHAT_ID,
        WEBHOOK_TOKEN: process.env.WEBHOOK_TOKEN,
        WEBHOOK_PORT: process.env.WEBHOOK_PORT || 8080
      },
      error_file: './logs/bot-error.log',
      out_file: './logs/bot-out.log',
      log_file: './logs/bot-combined.log',
      time: true
    },
    {
      name: 'webhook',
      script: 'webhook-server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        BOT_TOKEN: process.env.BOT_TOKEN,
        DATABASE_URL: process.env.DATABASE_URL,
        WEBHOOK_TOKEN: process.env.WEBHOOK_TOKEN,
        WEBHOOK_PORT: process.env.WEBHOOK_PORT || 8080
      },
      env_production: {
        NODE_ENV: 'production',
        BOT_TOKEN: process.env.BOT_TOKEN,
        DATABASE_URL: process.env.DATABASE_URL,
        WEBHOOK_TOKEN: process.env.WEBHOOK_TOKEN,
        WEBHOOK_PORT: process.env.WEBHOOK_PORT || 8080
      },
      error_file: './logs/webhook-error.log',
      out_file: './logs/webhook-out.log',
      log_file: './logs/webhook-combined.log',
      time: true
    }
  ]
};
