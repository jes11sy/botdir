const { ordersMenu } = require('../keyboards/menus');
const AuthMiddleware = require('../middleware/auth');

// Импорт подмодулей
const newOrdersHandler = require('./orders/new');
const modernOrdersHandler = require('./orders/modern');
const inWorkOrdersHandler = require('./orders/inwork');
const searchOrdersHandler = require('./orders/search');
const orderDetailsHandler = require('./orders/details');

class OrdersHandler {
  // Обработчики кнопок
  setupHandlers(bot) {
    console.log('🔧 Регистрируем обработчики OrdersHandler');
    
    // Главная кнопка "Заявки" - только для директора
    bot.hears('📋 Заявки', AuthMiddleware.requireDirector, (ctx) => {
      ctx.reply('Раздел "Заявки"', ordersMenu);
    });

    // Подключаем все подмодули
    console.log('🔧 Подключаем подмодули заявок...');
    newOrdersHandler.setupHandlers(bot);
    modernOrdersHandler.setupHandlers(bot);
    inWorkOrdersHandler.setupHandlers(bot);
    searchOrdersHandler.setupHandlers(bot);
    orderDetailsHandler.setupHandlers(bot);
    console.log('✅ Все подмодули заявок подключены');
  }
}

module.exports = new OrdersHandler();
