const ordersHandler = require('./orders');
const historyHandler = require('./cash/history');
const cityReportHandler = require('./reports/city');
const mastersReportHandler = require('./reports/masters');

class TextHandler {
  // Обработка текстовых сообщений
  async handleText(ctx) {
    // Проверяем авторизацию только для личных сообщений
    if (ctx.chat.type === 'private' && ctx.session.userRole === 'unauthorized') {
      return;
    }

    const text = ctx.message.text;
    
    // Обработка пользовательской даты для истории кассы
    if (ctx.session && ctx.session.historyCustomDate) {
      await historyHandler.processCustomDate(ctx, text);
      return;
    }
    
    // Обработка пользовательской даты для отчета по городу
    if (ctx.session && ctx.session.cityReportCustomDate) {
      await cityReportHandler.processCustomDate(ctx, text);
      return;
    }
    
    // Обработка пользовательской даты для отчета по мастерам
    if (ctx.session && ctx.session.mastersReportCustomDate) {
      await mastersReportHandler.processCustomDate(ctx, text);
      return;
    }
    
    // Поиск заявки по номеру или телефону
    if (text.match(/^\d+$/) || text.match(/^\+?[0-9\s\-\(\)]+$/)) {
      // Просто игнорируем, так как поиск обрабатывается в orders/search.js
      return;
    }
  }

  // Обработчики кнопок
  setupHandlers(bot) {
    bot.on('text', (ctx) => this.handleText(ctx));
  }
}

module.exports = new TextHandler();
