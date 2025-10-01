require('dotenv').config();

const config = {
  bot: {
    token: process.env.BOT_TOKEN,
    adminChatId: process.env.ADMIN_CHAT_ID
  },
  database: {
    url: process.env.DATABASE_URL
  }
};

// Проверка обязательных переменных
const requiredVars = ['BOT_TOKEN', 'DATABASE_URL'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Отсутствуют обязательные переменные окружения:', missingVars.join(', '));
  console.error('Создайте файл .env на основе config.example.js');
  process.exit(1);
}

module.exports = config;
