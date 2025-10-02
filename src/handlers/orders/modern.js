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
        LIMIT 50
      `;
      
      const result = await db.getClient().query(query, [directorCities]);
      const orders = result.rows;
      
      console.log('🔍 Найдено модернов для директора:', orders.length);
      console.log('🔍 Модерны директора:', orders.map(o => ({ id: o.id, master_id: o.master_id, city: o.city, date: o.date_meeting })));

      if (orders.length === 0) {
        // Дополнительная проверка - показываем все модерны без фильтра по городам
        const allModernsQuery = `SELECT id, master_id, city, status_order FROM orders WHERE status_order = 'Модерн' LIMIT 10`;
        const allModernsResult = await db.getClient().query(allModernsQuery);
        console.log('🔍 Все модерны в системе:', allModernsResult.rows);
        
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
      // Получаем заявку
      const orders = await db.searchOrder(orderId);
      if (!orders || orders.length === 0) {
        ctx.reply('❌ Заявка не найдена');
        return;
      }

      const order = orders[0];

      // Получаем мастера
      if (!order.master_id) {
        ctx.reply('❌ У заявки не назначен мастер');
        return;
      }

      const masters = await db.getClient().query(`
        SELECT id, name, chat_id, tg_id
        FROM master
        WHERE id = $1
      `, [order.master_id]);

      if (!masters.rows.length) {
        ctx.reply('❌ Мастер не найден');
        return;
      }

      const master = masters.rows[0];
      if (!master.chat_id) {
        ctx.reply(`❌ У мастера ${master.name} не указан chat_id. Напоминание не отправлено.`);
        return;
      }

      // Формируем полное сообщение заявки с кнопками
      const meetingDate = new Date(order.date_meeting);
      const dateStr = meetingDate.toLocaleDateString('ru-RU');
      const timeStr = meetingDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

      let message = `🔔 *Напоминание по заявке*\n\n`;
      message += `📋 *№${order.id}* | ${order.status_order}\n\n`;
      message += `🏢 *РК:* ${order.rk}\n`;
      message += `🏙️ *Город:* ${order.city}\n`;
      message += `👨‍🔧 *Имя мастера:* ${order.avito_name || 'Не указано'}\n`;
      message += `📝 *Тип заявки:* ${order.type_order}\n\n`;
      message += `👤 *Имя клиента:* ${order.client_name}\n`;
      message += `📞 *Телефон:* \`${order.phone}\`\n`;
      message += `📍 *Адрес:* ${order.address}\n\n`;
      message += `🔧 *Тип техники:* ${order.type_equipment}\n`;
      message += `⚠️ *Проблема:* ${order.problem}\n\n`;
      message += `📅 *Дата встречи:* ${dateStr} ${timeStr}\n\n`;
      message += `👨‍🔧 *Назначен мастер:* ${master.name}`;

      // Создаем кнопки для мастера (только Готово и Отказ)
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('✅ Готово', `final_status_${orderId}_Готово`)],
        [Markup.button.callback('❌ Отказ', `final_status_${orderId}_Отказ`)]
      ]);

      // Отправляем полную заявку с кнопками мастеру
      const sentMessage = await ctx.telegram.sendMessage(master.chat_id, message, {
        parse_mode: 'Markdown',
        ...keyboard
      });

      // Сохраняем ID сообщения в глобальной переменной для последующего удаления
      global.orderMessages = global.orderMessages || {};
      global.orderMessages[orderId] = {
        messageId: sentMessage.message_id,
        chatId: master.chat_id
      };

      // Подтверждаем директору
      ctx.reply(`✅ Напоминание с заявкой отправлено мастеру ${master.name} по заявке #${orderId}`);
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
