const { masterMenu, masterOrdersMenu, masterReportsMenu } = require('../keyboards/menus');
const AuthMiddleware = require('../middleware/auth');
const db = require('../config/database');
const { parseCities, hasCities } = require('../utils/cities');

class MasterHandler {
  setupHandlers(bot) {
    // Главное меню мастера
    bot.hears('📋 Мои заявки', AuthMiddleware.requireMaster, (ctx) => {
      ctx.reply('Заявки мастера:', masterOrdersMenu);
    });


    bot.hears('📊 Моя статистика', AuthMiddleware.requireMaster, (ctx) => {
      ctx.reply('Статистика мастера:', masterReportsMenu);
    });

    // Обработчики заявок мастера
    bot.hears('🆕 Новые заявки', AuthMiddleware.requireMaster, async (ctx) => {
      console.log('🔍 Обработчик "🆕 Новые заявки" сработал для мастера');
      await this.getMasterNewOrders(ctx);
    });

    bot.hears('🔧 В работе', AuthMiddleware.requireMaster, async (ctx) => {
      console.log('🔍 Обработчик "🔧 В работе" сработал для мастера');
      await this.getMasterInWorkOrders(ctx);
    });

    bot.hears('🔄 Модернизации', AuthMiddleware.requireMaster, async (ctx) => {
      console.log('🔍 Обработчик "🔄 Модернизации" сработал для мастера');
      await this.getMasterModernOrders(ctx);
    });



    // Обработчики отчетов мастера
    bot.hears('📊 Мои заявки', AuthMiddleware.requireMaster, async (ctx) => {
      await this.getMasterOrdersReport(ctx);
    });


    // Обработчики inline кнопок заявок мастера
    bot.action(/^master_order_(\d+)$/, async (ctx) => {
      const orderId = ctx.match[1];
      console.log(`🔍 Обработчик master_order сработал: orderId = ${orderId}`);
      await this.showMasterOrderDetails(ctx, orderId);
    });

    bot.action(/^master_inwork_order_(\d+)$/, async (ctx) => {
      const orderId = ctx.match[1];
      console.log(`🔍 Обработчик master_inwork_order сработал: orderId = ${orderId}`);
      await this.showMasterOrderDetails(ctx, orderId);
    });

    bot.action(/^master_modern_order_(\d+)$/, async (ctx) => {
      const orderId = ctx.match[1];
      console.log(`🔍 Обработчик master_modern_order сработал: orderId = ${orderId}`);
      await this.showMasterOrderDetails(ctx, orderId);
    });

    // Обработчик поиска заявок мастера
    bot.action(/^master_search_order_(\d+)$/, async (ctx) => {
      const orderId = ctx.match[1];
      console.log(`🔍 Обработчик master_search_order сработал: orderId = ${orderId}`);
      await this.showMasterOrderDetails(ctx, orderId);
    });

    // Обработка текстовых сообщений для поиска заявок мастера
    bot.on('text', async (ctx, next) => {
      // ВАЖНО: Проверяем только если активен режим поиска заявок мастера
      if (ctx.session && ctx.session.searchingMasterOrders) {
        await this.processMasterOrderSearch(ctx, ctx.message.text);
      } else {
        next();
      }
    });
  }

  // Получение новых заявок мастера
  async getMasterNewOrders(ctx) {
    try {
      const masterInfo = ctx.session.userInfo;
      console.log('🔍 Информация о мастере:', masterInfo);
      console.log('🔍 Тип cities:', typeof masterInfo?.cities);
      console.log('🔍 Значение cities:', masterInfo?.cities);
      console.log('🔍 hasCities результат:', hasCities(masterInfo?.cities));
      
      if (!masterInfo || !hasCities(masterInfo.cities)) {
        ctx.reply('❌ У вас не указаны города в профиле. Обратитесь к администратору.');
        return;
      }

      const masterCities = parseCities(masterInfo.cities);
      const masterId = masterInfo.id;
      console.log('🔍 Обработанные города мастера:', masterCities);
      console.log('🔍 ID мастера:', masterId);

      const query = `
        SELECT * FROM orders 
        WHERE status_order = 'Ожидает' 
        AND city = ANY($1)
        AND master_id = $2
        ORDER BY date_meeting ASC 
        LIMIT 50
      `;
      
      const result = await db.getClient().query(query, [masterCities, masterId]);
      const orders = result.rows;

      if (orders.length === 0) {
        ctx.reply('Новых заявок в ваших городах не найдено');
        return;
      }

      // Создаем inline кнопки для каждой заявки
      const { Markup } = require('telegraf');
      const buttons = orders.map(order => {
        const date = new Date(order.date_meeting);
        const dateStr = date.toLocaleDateString('ru-RU');
        const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        return Markup.button.callback(
          `${order.id} | ${dateStr} ${timeStr}`,
          `master_order_${order.id}`
        );
      });

      const ordersKeyboard = Markup.inlineKeyboard(buttons, { columns: 1 });

      ctx.reply('🆕 Новые заявки мастера:', ordersKeyboard);
    } catch (error) {
      console.error('Ошибка при получении новых заявок мастера:', error);
      ctx.reply('Ошибка при получении заявок');
    }
  }

  // Получение заявок в работе мастера
  async getMasterInWorkOrders(ctx) {
    try {
      const masterInfo = ctx.session.userInfo;
      
      if (!masterInfo || !hasCities(masterInfo.cities)) {
        ctx.reply('❌ У вас не указаны города в профиле. Обратитесь к администратору.');
        return;
      }

      const masterCities = parseCities(masterInfo.cities);
      const masterId = masterInfo.id;

      const query = `
        SELECT * FROM orders 
        WHERE status_order IN ('Принял', 'В пути', 'В работе') 
        AND city = ANY($1)
        AND master_id = $2
        ORDER BY date_meeting ASC 
        LIMIT 50
      `;
      
      const result = await db.getClient().query(query, [masterCities, masterId]);
      const orders = result.rows;

      if (orders.length === 0) {
        ctx.reply('Заявок со статусами "Принял", "В пути", "В работе" в ваших городах не найдено');
        return;
      }

      // Создаем inline кнопки для каждой заявки
      const { Markup } = require('telegraf');
      const buttons = orders.map(order => {
        const date = new Date(order.date_meeting);
        const dateStr = date.toLocaleDateString('ru-RU');
        const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        return Markup.button.callback(
          `${order.id} | ${dateStr} ${timeStr}`,
          `master_inwork_order_${order.id}`
        );
      });

      const ordersKeyboard = Markup.inlineKeyboard(buttons, { columns: 1 });

      ctx.reply('🔧 Заявки в работе мастера:', ordersKeyboard);
    } catch (error) {
      console.error('Ошибка при получении заявок в работе мастера:', error);
      ctx.reply('Ошибка при получении заявок');
    }
  }

  // Поиск заявок мастера
  async searchMasterOrders(ctx) {
    ctx.reply('🔍 Введите номер заказа или имя клиента для поиска:');
    ctx.session.searchingMasterOrders = true;
  }

  // Обработка поиска заявок мастера
  async processMasterOrderSearch(ctx, text) {
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

      const masterInfo = ctx.session.userInfo;
      if (!masterInfo) {
        ctx.reply('❌ Ошибка авторизации');
        return;
      }

      const masterId = masterInfo.id;
      const searchText = text.trim();
      
      // Ищем заявки только мастера
      const orders = await db.searchMasterOrder(searchText, masterId);
      
      if (orders.length === 0) {
        ctx.reply(`❌ Заявки по запросу "${searchText}" не найдены или не принадлежат вам`);
        return;
      }

      // Показываем результаты поиска
      await this.showMasterSearchResults(ctx, orders, searchText);
      
      // Очищаем сессию
      delete ctx.session.searchingMasterOrders;
    } catch (error) {
      console.error('Ошибка при поиске заявок мастера:', error);
      ctx.reply('Ошибка при поиске заявок');
    }
  }

  // Показать результаты поиска мастера
  async showMasterSearchResults(ctx, orders, searchText) {
    // Если найдена только одна заявка, показываем полную информацию
    if (orders.length === 1) {
      await this.showMasterOrderDetails(ctx, orders[0].id);
      return;
    }

    let message = `🔍 *Результаты поиска: "${searchText}"*\n\n`;
    
    // Создаем inline кнопки для каждой найденной заявки
    const { Markup } = require('telegraf');
    const buttons = orders.map(order => {
      const date = new Date(order.date_meeting);
      const dateStr = date.toLocaleDateString('ru-RU');
      const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      
      return Markup.button.callback(
        `📋 ${order.id} | ${dateStr} ${timeStr}`,
        `master_search_order_${order.id}`
      );
    });

    const searchKeyboard = Markup.inlineKeyboard(buttons, { columns: 1 });

    ctx.reply(message, {
      parse_mode: 'Markdown',
      ...searchKeyboard
    });
  }

  // Показать детали заявки мастера
  async showMasterOrderDetails(ctx, orderId) {
    try {
      console.log(`🔍 showMasterOrderDetails вызван для заявки #${orderId}`);
      
      const masterInfo = ctx.session.userInfo;
      const masterId = masterInfo.id;
      
      // Получаем детали заявки (только если она принадлежит мастеру)
      const orders = await db.searchMasterOrder(orderId, masterId);
      console.log(`🔍 Результат поиска заявки #${orderId} для мастера ${masterId}:`, orders);
      
      if (orders.length === 0) {
        ctx.reply('Заявка не найдена или не принадлежит вам');
        return;
      }

      const order = orders[0];
      const meetingDate = new Date(order.date_meeting);
      const dateStr = meetingDate.toLocaleDateString('ru-RU');
      const timeStr = meetingDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      
      // Используем экранирование Markdown
      const { escapeMarkdown } = require('../utils/markdown');

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

      ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Ошибка при получении деталей заявки мастера:', error);
      ctx.reply('Ошибка при получении заявки');
    }
  }

  // Получение модернов мастера
  async getMasterModernOrders(ctx) {
    try {
      const masterInfo = ctx.session.userInfo;
      console.log('🔍 Информация о мастере для модернов:', masterInfo);
      console.log('🔍 Тип cities:', typeof masterInfo?.cities);
      console.log('🔍 Значение cities:', masterInfo?.cities);
      console.log('🔍 hasCities результат:', hasCities(masterInfo?.cities));
      
      if (!masterInfo || !hasCities(masterInfo.cities)) {
        ctx.reply('❌ У вас не указаны города в профиле. Обратитесь к администратору.');
        return;
      }

      const masterCities = parseCities(masterInfo.cities);
      console.log('🔍 Обработанные города мастера для модернов:', masterCities);

      // Получаем ID мастера из сессии
      const masterId = ctx.session.userInfo.id;
      console.log('🔍 ID мастера:', masterId);

      // Сначала проверим, есть ли вообще модерны в городах мастера
      const checkQuery = `
        SELECT * FROM orders 
        WHERE status_order = 'Модерн' 
        AND city = ANY($1)
        LIMIT 5
      `;
      
      const checkResult = await db.getClient().query(checkQuery, [masterCities]);
      console.log('🔍 Все модерны в городах мастера:', checkResult.rows);
      console.log('🔍 master_id в найденных заявках:', checkResult.rows.map(o => o.master_id));

      const query = `
        SELECT * FROM orders 
        WHERE status_order = 'Модерн' 
        AND city = ANY($1)
        AND master_id = $2
        ORDER BY date_meeting ASC 
        LIMIT 50
      `;
      
      const result = await db.getClient().query(query, [masterCities, masterId]);
      const orders = result.rows;
      
      console.log('🔍 Найдено модернов для мастера:', orders.length);
      console.log('🔍 Модерны мастера:', orders);

      if (orders.length === 0) {
        // Дополнительная проверка - показываем все модерны без фильтра по мастеру
        const allModernsQuery = `
          SELECT id, master_id, city, status_order FROM orders 
          WHERE status_order = 'Модерн' 
          AND city = ANY($1)
          ORDER BY date_meeting ASC 
          LIMIT 10
        `;
        const allModernsResult = await db.getClient().query(allModernsQuery, [masterCities]);
        console.log('🔍 Все модерны в городах мастера (без фильтра по master_id):', allModernsResult.rows);
        
        ctx.reply('Ваших модернизаций не найдено');
        return;
      }

      // Создаем inline кнопки для каждой заявки
      const { Markup } = require('telegraf');
      const buttons = orders.map(order => {
        const date = new Date(order.date_meeting);
        const dateStr = date.toLocaleDateString('ru-RU');
        const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        return Markup.button.callback(
          `${order.id} | ${dateStr} ${timeStr}`,
          `master_modern_order_${order.id}`
        );
      });

      const ordersKeyboard = Markup.inlineKeyboard(buttons, { columns: 1 });

      ctx.reply('🔄 Модерны мастера:', ordersKeyboard);
    } catch (error) {
      console.error('Ошибка при получении модернов мастера:', error);
      ctx.reply('Ошибка при получении модернов');
    }
  }


  // Отчет по заявкам мастера
  async getMasterOrdersReport(ctx) {
    try {
      const masterInfo = ctx.session.userInfo;
      
      if (!masterInfo || !hasCities(masterInfo.cities)) {
        ctx.reply('❌ У вас не указаны города в профиле. Обратитесь к администратору.');
        return;
      }

      const masterCities = parseCities(masterInfo.cities);
      const masterId = masterInfo.id;

      const query = `
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status_order = 'Ожидает' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN status_order = 'В работе' THEN 1 END) as in_work_orders,
          COUNT(CASE WHEN status_order = 'Завершено' THEN 1 END) as completed_orders
        FROM orders 
        WHERE city = ANY($1)
        AND master_id = $2
      `;
      
      const result = await db.getClient().query(query, [masterCities, masterId]);
      const report = result.rows[0];

      let message = '📊 Отчет по заявкам мастера:\n\n';
      message += `📋 Всего заявок: ${report.total_orders}\n`;
      message += `⏳ Ожидают: ${report.pending_orders}\n`;
      message += `⚙️ В работе: ${report.in_work_orders}\n`;
      message += `✅ Завершено: ${report.completed_orders}\n\n`;
      message += `🏙️ Города: ${masterCities.join(', ')}`;

      ctx.reply(message);
    } catch (error) {
      console.error('Ошибка при получении отчета по заявкам мастера:', error);
      ctx.reply('Ошибка при получении отчета');
    }
  }

}

module.exports = new MasterHandler();


