const db = require('../../config/database');
const { Markup } = require('telegraf');
const { escapeMarkdown } = require('../../utils/markdown');

class SearchOrdersHandler {
  // Поиск заявки - шаг 1: запрос поискового запроса
  async searchOrder(ctx) {
    // Инициализируем сессию для поиска заявок
    ctx.session = ctx.session || {};
    ctx.session.searchingOrder = {};
    ctx.session.searchOrderStep = 'query';
    
    ctx.reply('🔍 *Поиск заявок*\n\n📝 Введите номер заявки, телефон клиента или имя для поиска:', {
      parse_mode: 'Markdown'
    });
  }

  // Обработка поиска заявок
  async processOrderSearch(ctx, text) {
    try {
      if (!text || text.trim().length === 0) {
        ctx.reply('❌ Поисковый запрос не может быть пустым. Введите данные для поиска:');
        return;
      }

      // Проверяем, что это не кнопки меню
      const menuButtons = ['💰 Касса', '📊 Отчеты', '👥 Сотрудники', '📋 Заявки', '➕ Приход', '➖ Расход', '📊 История', '💰 Баланс'];
      if (menuButtons.includes(text.trim())) {
        console.log(`🔍 Пропускаем кнопку меню: "${text.trim()}"`);
        return;
      }

      // Получаем города директора
      const directorInfo = await db.getDirectorInfo(ctx.from.id.toString());
      if (!directorInfo || !directorInfo.cities || directorInfo.cities.length === 0) {
        ctx.reply('❌ У вас не указаны города в профиле. Обратитесь к администратору.');
        return;
      }

      const directorCities = directorInfo.cities;
      const searchText = text.trim();
      
      // Ищем заявки только по городам директора, сортируем по дате встречи
      const query = `
        SELECT * FROM orders
        WHERE (id = $1 OR phone LIKE $2 OR LOWER(client_name) LIKE LOWER($3))
        AND city = ANY($4)
        ORDER BY date_meeting ASC
        LIMIT 50
      `;
      
      const result = await db.getClient().query(query, [searchText, `%${searchText}%`, `%${searchText}%`, directorCities]);
      const orders = result.rows;
      
      if (orders.length === 0) {
        ctx.reply(`❌ Заявки по запросу "${searchText}" в ваших городах не найдены`);
        return;
      }

      // Показываем результаты поиска
      await this.showSearchResults(ctx, orders, searchText);
      
      // Очищаем сессию
      delete ctx.session.searchingOrder;
      delete ctx.session.searchOrderStep;
    } catch (error) {
      console.error('Ошибка при поиске заявок:', error);
      ctx.reply('Ошибка при поиске заявок');
    }
  }

  // Показать результаты поиска
  async showSearchResults(ctx, orders, searchText) {
    // Если найдена только одна заявка, показываем полную информацию
    if (orders.length === 1) {
      await this.showOrderDetails(ctx, orders[0]);
      return;
    }

    let message = `🔍 *Результаты поиска: "${searchText}"*\n\n`;
    
    // Создаем inline кнопки для каждой найденной заявки
    const buttons = orders.map(order => {
      const date = new Date(order.date_meeting);
      const dateStr = date.toLocaleDateString('ru-RU');
      const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      
      return Markup.button.callback(
        `📋 ${order.id} | ${dateStr} ${timeStr}`,
        `search_order_${order.id}`
      );
    });

    const searchKeyboard = Markup.inlineKeyboard(buttons, { columns: 1 });

    ctx.reply(message, {
      parse_mode: 'Markdown',
      ...searchKeyboard
    });
  }

  // Показать детали заявки из поиска
  async showOrderDetails(ctx, order) {
    try {
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
      message += `👨‍🔧 *Назначен мастер:* ${escapeMarkdown(order.master_name || 'Не назначен')}\n`;

      // Добавляем финансовую информацию, если она есть
      if (order.result && order.result > 0) {
        message += `\n💰 *Финансовая информация:*\n`;
        message += `💵 *Итог:* ${escapeMarkdown(order.result)} ₽\n`;
        message += `💸 *Расход:* ${escapeMarkdown(order.expenditure)} ₽\n`;
        message += `💎 *Чистыми:* ${escapeMarkdown(order.clean)} ₽\n`;
        message += `👨‍🔧 *Сдача мастера:* ${escapeMarkdown(order.master_change)} ₽\n`;
      }

      ctx.reply(message, { 
        parse_mode: 'Markdown'
      });
    } catch (error) {
      console.error('Ошибка при получении заявки:', error);
      ctx.reply('Ошибка при получении заявки');
    }
  }

  setupHandlers(bot) {
    bot.hears('🔍 Поиск', (ctx) => this.searchOrder(ctx));

    // Обработка нажатия на заявку из поиска
    bot.action(/^search_order_(\d+)$/, async (ctx) => {
      const orderId = ctx.match[1];
      try {
        const orders = await db.searchOrder(orderId);
        if (orders.length > 0) {
          await this.showOrderDetails(ctx, orders[0]);
        } else {
          ctx.reply('Заявка не найдена');
        }
      } catch (error) {
        console.error('Ошибка при получении заявки:', error);
        ctx.reply('Ошибка при получении заявки');
      }
    });

    // Обработка текстовых сообщений для поиска заявок
    bot.on('text', async (ctx, next) => {
      // ВАЖНО: Проверяем только если активен режим поиска заявок
      if (ctx.session && ctx.session.searchOrderStep === 'query') {
        await this.processOrderSearch(ctx, ctx.message.text);
      } else {
        next();
      }
    });
  }
}

module.exports = new SearchOrdersHandler();
