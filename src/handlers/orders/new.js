const db = require('../../config/database');
const { Markup } = require('telegraf');
const AuthMiddleware = require('../../middleware/auth');

class NewOrdersHandler {
  // Новые заявки
  async getNewOrders(ctx) {
    try {
      // Получаем города директора
      const directorInfo = await db.getDirectorInfo(ctx.from.id.toString());
      if (!directorInfo || !directorInfo.cities || directorInfo.cities.length === 0) {
        ctx.reply('❌ У вас не указаны города в профиле. Обратитесь к администратору.');
        return;
      }

      const directorCities = directorInfo.cities;
      console.log(`🔍 Города директора:`, directorCities);

      // Получаем заявки только по городам директора, сортируем по дате встречи
      const query = `
        SELECT * FROM orders 
        WHERE status_order = 'Ожидает' 
        AND city = ANY($1)
        ORDER BY date_meeting ASC 
        LIMIT 50
      `;
      
      const result = await db.getClient().query(query, [directorCities]);
      const orders = result.rows;

      if (orders.length === 0) {
        ctx.reply('Заявок со статусом "Ожидает" в ваших городах не найдено');
        return;
      }

      // Создаем inline кнопки для каждой заявки
      const buttons = orders.map(order => {
        const date = new Date(order.date_meeting);
        const dateStr = date.toLocaleDateString('ru-RU');
        const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        return Markup.button.callback(
          `${order.id} | ${dateStr} ${timeStr}`,
          `order_${order.id}`
        );
      });

      const ordersKeyboard = Markup.inlineKeyboard(buttons, { columns: 1 });

      ctx.reply('📋 Заявки со статусом "Ожидает":', ordersKeyboard);
    } catch (error) {
      console.error('Ошибка при получении новых заявок:', error);
      ctx.reply('Ошибка при получении заявок');
    }
  }

  setupHandlers(bot) {
    bot.hears('🆕 Новые', AuthMiddleware.requireDirector, (ctx) => this.getNewOrders(ctx));
  }
}

module.exports = new NewOrdersHandler();
