const { cashMenu } = require('../keyboards/menus');
const AuthMiddleware = require('../middleware/auth');

// Импорт подмодулей
const balanceHandler = require('./cash/balance');
const historyHandler = require('./cash/history');
const incomeHandler = require('./cash/income');
const expenseHandler = require('./cash/expense');

class CashHandler {
  // Обработчики кнопок
  setupHandlers(bot) {
    // Главная кнопка "Касса" - только для директора
    bot.hears('💰 Касса', AuthMiddleware.requireDirector, (ctx) => {
      ctx.reply('Раздел "Касса"', cashMenu);
    });

    // Подключаем все подмодули
    balanceHandler.setupHandlers(bot);
    historyHandler.setupHandlers(bot);
    incomeHandler.setupHandlers(bot);
    expenseHandler.setupHandlers(bot);
  }
}

module.exports = new CashHandler();
