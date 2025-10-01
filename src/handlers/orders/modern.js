const db = require('../../config/database');
const { Markup } = require('telegraf');
const { escapeMarkdown } = require('../../utils/markdown');
const AuthMiddleware = require('../../middleware/auth');

class ModernOrdersHandler {
  // Модерны заявки
  async getModernOrders(ctx) {
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
        WHERE status_order = 'Модерн' 
        AND city = ANY($1)
        ORDER BY date_meeting ASC 
        LIMIT 10
      `;
      
      const result = await db.getClient().query(query, [directorCities]);
      const orders = result.rows;

      if (orders.length === 0) {
        ctx.reply('Заявок со статусом "Модерн" в ваших городах не найдено');
        return;
      }

      // Создаем inline кнопки для каждой заявки
      const buttons = orders.map(order => {
        const date = new Date(order.date_meeting);
        const dateStr = date.toLocaleDateString('ru-RU');
        const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        return Markup.button.callback(
          `${order.id} | ${dateStr} ${timeStr}`,
          `modern_order_${order.id}`
        );
      });

      const ordersKeyboard = Markup.inlineKeyboard(buttons, { columns: 1 });

      ctx.reply('📋 Заявки со статусом "Модерн":', ordersKeyboard);
    } catch (error) {
      console.error('Ошибка при получении модернов:', error);
      ctx.reply('Ошибка при получении заявок');
    }
  }

  // Показать детали модерна без кнопки назначения мастера
  async showModernOrderDetails(ctx, orderId) {
    try {
      const orders = await db.searchOrder(orderId);
      
      if (orders.length === 0) {
        ctx.reply('Заявка не найдена');
        return;
      }

      const order = orders[0];
      const meetingDate = new Date(order.date_meeting);
      const dateStr = meetingDate.toLocaleDateString('ru-RU');
      const timeStr = meetingDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      

      let message = `📋 *№${order.id}* | ${escapeMarkdown(order.status_order)}\n\n`;
      message += `🏢 *РК:* ${escapeMarkdown(order.rk)}\n`;
      message += `🏙️ *Город:* ${escapeMarkdown(order.city)}\n`;
      message += `👨‍🔧 *Имя мастера:* ${escapeMarkdown(order.avito_name || 'Не указано')}\n`;
      message += `📝 *Тип заявки:* ${escapeMarkdown(order.type_order)}\n\n`;
      message += `👤 *Имя клиента:* ${escapeMarkdown(order.client_name)}\n`;
      message += `📞 *Телефон:* \`${escapeMarkdown(order.phone)}\`\n`;
      message += `📍 *Адрес:* ${escapeMarkdown(order.address)}\n\n`;
      message += `🔧 *Тип техники:* ${escapeMarkdown(order.type_equipment)}\n`;
      message += `⚠️ *Проблема:* ${escapeMarkdown(order.problem)}\n\n`;
      message += `📅 *Дата встречи:* ${escapeMarkdown(dateStr)} ${escapeMarkdown(timeStr)}\n`;
      message += `👨‍🔧 *Мастер:* ${escapeMarkdown(order.master_name || 'Не назначен')}\n`;

      // Создаем inline кнопки для модернов
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔔 Напомнить мастеру', `remind_master_${order.id}`)],
        [Markup.button.callback('📝 Изменить статус', `change_status_${order.id}`)]
      ]);

      ctx.reply(message, { 
        parse_mode: 'Markdown',
        ...keyboard
      });
    } catch (error) {
      console.error('Ошибка при получении заявки:', error);
      ctx.reply('Ошибка при получении заявки');
    }
  }

  // Напомнить мастеру
  async remindMaster(ctx, orderId) {
    try {
      // Здесь будет логика отправки напоминания мастеру
      ctx.reply(`🔔 Напоминание отправлено мастеру по заявке #${orderId}`);
    } catch (error) {
      console.error('Ошибка при отправке напоминания:', error);
      ctx.reply('Ошибка при отправке напоминания');
    }
  }

  // Изменить статус
  async changeStatus(ctx, orderId) {
    try {
      // Создаем кнопки со статусами
      const statusButtons = [
        [Markup.button.callback('⏳ Ожидает', `set_status_${orderId}_Ожидает`)],
        [Markup.button.callback('⚙️ В работе', `set_status_${orderId}_В работе`)],
        [Markup.button.callback('❌ Незаказ', `set_status_${orderId}_Незаказ`)]
      ];

      const keyboard = Markup.inlineKeyboard(statusButtons);
      
      ctx.reply('📝 Выберите новый статус:', keyboard);
    } catch (error) {
      console.error('Ошибка при смене статуса:', error);
      ctx.reply('Ошибка при смене статуса');
    }
  }

  // Установить статус
  async setStatus(ctx, orderId, status) {
    try {
      // Здесь будет логика обновления статуса в БД
      ctx.reply(`✅ Статус заявки #${orderId} изменен на "${status}"`);
    } catch (error) {
      console.error('Ошибка при обновлении статуса:', error);
      ctx.reply('Ошибка при обновлении статуса');
    }
  }

  setupHandlers(bot) {
    bot.hears('🔄 Модерны', AuthMiddleware.requireDirector, (ctx) => this.getModernOrders(ctx));
    
    // Обработка нажатия на модерн заявку
    bot.action(/^modern_order_(\d+)$/, (ctx) => {
      const orderId = ctx.match[1];
      this.showModernOrderDetails(ctx, orderId);
    });

    // Обработка кнопки "Напомнить мастеру"
    bot.action(/^remind_master_(\d+)$/, (ctx) => {
      const orderId = ctx.match[1];
      this.remindMaster(ctx, orderId);
    });

    // Обработка кнопки "Изменить статус"
    bot.action(/^change_status_(\d+)$/, (ctx) => {
      const orderId = ctx.match[1];
      this.changeStatus(ctx, orderId);
    });

    // Обработка выбора статуса
    bot.action(/^set_status_(\d+)_(.+)$/, (ctx) => {
      const orderId = ctx.match[1];
      const status = ctx.match[2];
      this.setStatus(ctx, orderId, status);
    });
  }
}

module.exports = new ModernOrdersHandler();
