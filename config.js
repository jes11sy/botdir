module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN || '8279544545:AAG1iP_qRZbrA02CKbi2BuUeOhk72focEAM',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:1740@localhost:5432/callcentre_crm',
  ADMIN_CHAT_ID: process.env.ADMIN_CHAT_ID || '1802367546',
  WEBHOOK_TOKEN: process.env.WEBHOOK_TOKEN || 'your_webhook_secret_token',
  WEBHOOK_PORT: process.env.WEBHOOK_PORT || 8080
};
