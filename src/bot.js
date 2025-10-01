require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const config = require('../config');
const database = require('./config/database');

// Импорт обработчиков
const navigationHandler = require('./handlers/navigation');
const ordersHandler = require('./handlers/orders');
const cashHandler = require('./handlers/cash');
const reportsHandler = require('./handlers/reports');
const employeesHandler = require('./handlers/employees');
const masterHandler = require('./handlers/master');
const textHandler = require('./handlers/text');
const ErrorHandler = require('./utils/errorHandler');
const WebhookHandler = require('./handlers/webhook');
const AuthMiddleware = require('./middleware/auth');

class Bot {
  constructor() {
    console.log('🔍 Bot token:', config.BOT_TOKEN);
    this.bot = new Telegraf(config.BOT_TOKEN);
    
    try {
      this.webhookHandler = new WebhookHandler(this.bot);
      console.log('✅ Webhook handler создан');
    } catch (error) {
      console.error('❌ Ошибка создания webhook handler:', error);
    }
    
    this.setupSession();
    this.setupHandlers();
    this.setupErrorHandling();
  }

  // Настройка сессий
  setupSession() {
    this.bot.use(session());
    
    // Middleware для инициализации сессии
    this.bot.use((ctx, next) => {
      if (!ctx.session) {
        ctx.session = {};
      }
      return next();
    });

    // Middleware для авторизации
    this.bot.use(AuthMiddleware.checkAuth);
  }

  // Настройка всех обработчиков
  setupHandlers() {
    navigationHandler.setupHandlers(this.bot);
    ordersHandler.setupHandlers(this.bot);
    cashHandler.setupHandlers(this.bot);
    reportsHandler.setupHandlers(this.bot);
    employeesHandler.setupHandlers(this.bot);
    masterHandler.setupHandlers(this.bot);
    textHandler.setupHandlers(this.bot);
  }

  // Настройка обработки ошибок
  setupErrorHandling() {
    this.bot.catch((err, ctx) => {
      ErrorHandler.handleBotError(err, ctx);
    });
  }

  // Запуск бота
  async start() {
    try {
      console.log('🔄 Подключаемся к базе данных...');
      // Подключение к базе данных
      await database.connect();
      console.log('✅ База данных подключена');
      
      console.log('⏳ Небольшая задержка...');
      // Небольшая задержка
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('🚀 Запускаем бота...');
      // Запуск бота
      await this.bot.launch();
      console.log('🤖 Бот запущен!');
      
      // Временно отключаем webhook сервер из основного бота
      console.log('ℹ️ Webhook сервер запускается отдельно');
      
      console.log('✅ Все сервисы запущены!');
      
      // Graceful shutdown
      process.once('SIGINT', () => this.stop('SIGINT'));
      process.once('SIGTERM', () => this.stop('SIGTERM'));
      
    } catch (error) {
      console.error('❌ Ошибка запуска бота:', error);
      process.exit(1);
    }
  }

  // Остановка бота
  async stop(signal) {
    console.log(`🛑 Получен сигнал ${signal}, останавливаем бота...`);
    
    try {
      await this.bot.stop(signal);
      await database.disconnect();
      console.log('✅ Бот остановлен');
      process.exit(0);
    } catch (error) {
      console.error('❌ Ошибка при остановке бота:', error);
      process.exit(1);
    }
  }
}

// Создание и запуск бота
const bot = new Bot();
bot.start().catch(error => {
  console.error('Критическая ошибка:', error);
  process.exit(1);
});

module.exports = Bot;
