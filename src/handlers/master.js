const { masterMenu, masterOrdersMenu, masterCashMenu, masterReportsMenu } = require('../keyboards/menus');
const AuthMiddleware = require('../middleware/auth');
const db = require('../config/database');
const { parseCities, hasCities } = require('../utils/cities');

class MasterHandler {
  setupHandlers(bot) {
    // Главное меню мастера
    bot.hears('📋 Мои заявки', AuthMiddleware.requireMaster, (ctx) => {
      ctx.reply('Заявки мастера:', masterOrdersMenu);
    });

    bot.hears('💰 Сдача денег', AuthMiddleware.requireMaster, (ctx) => {
      ctx.reply('Сдача денег мастера:', masterCashMenu);
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

    // Обработчики кассы мастера
    bot.hears('💰 Баланс', AuthMiddleware.requireMaster, async (ctx) => {
      await this.getMasterCashBalance(ctx);
    });

    bot.hears('📊 История', AuthMiddleware.requireMaster, async (ctx) => {
      await this.getMasterCashHistory(ctx);
    });

    bot.hears('➖ Расход', AuthMiddleware.requireMaster, async (ctx) => {
      await this.addMasterExpense(ctx);
    });

    bot.hears('➕ Приход', AuthMiddleware.requireMaster, async (ctx) => {
      await this.addMasterIncome(ctx);
    });

    // Обработчики отчетов мастера
    bot.hears('📊 Мои заявки', AuthMiddleware.requireMaster, async (ctx) => {
      await this.getMasterOrdersReport(ctx);
    });

    bot.hears('💰 Мои доходы', AuthMiddleware.requireMaster, async (ctx) => {
      await this.getMasterIncomeReport(ctx);
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
      console.log('🔍 Обработанные города мастера:', masterCities);

      const query = `
        SELECT * FROM orders 
        WHERE status_order = 'Ожидает' 
        AND city = ANY($1)
        ORDER BY date_meeting ASC 
        LIMIT 10
      `;
      
      const result = await db.getClient().query(query, [masterCities]);
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

      const query = `
        SELECT * FROM orders 
        WHERE status_order IN ('Принял', 'В пути', 'В работе') 
        AND city = ANY($1)
        ORDER BY date_meeting ASC 
        LIMIT 10
      `;
      
      const result = await db.getClient().query(query, [masterCities]);
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
    ctx.session.searchingOrders = true;
  }

  // Показать детали заявки мастера
  async showMasterOrderDetails(ctx, orderId) {
    try {
      console.log(`🔍 showMasterOrderDetails вызван для заявки #${orderId}`);
      
      // Получаем детали заявки
      const orders = await db.searchOrder(orderId);
      console.log(`🔍 Результат поиска заявки #${orderId}:`, orders);
      
      if (orders.length === 0) {
        ctx.reply('Заявка не найдена');
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
        LIMIT 10
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

  // Получение баланса кассы мастера
  async getMasterCashBalance(ctx) {
    try {
      const masterInfo = ctx.session.userInfo;
      
      if (!masterInfo || !hasCities(masterInfo.cities)) {
        ctx.reply('❌ У вас не указаны города в профиле. Обратитесь к администратору.');
        return;
      }

      const masterCities = parseCities(masterInfo.cities);

      let totalIncome = 0;
      let totalExpense = 0;

      for (const city of masterCities) {
        const balance = await db.getCashBalanceByCity(city);
        totalIncome += parseFloat(balance.income) || 0;
        totalExpense += parseFloat(balance.expense) || 0;
      }

      const balance = totalIncome - totalExpense;

      let message = '💰 Баланс кассы мастера:\n\n';
      message += `💵 Доходы: ${totalIncome.toFixed(2)} ₽\n`;
      message += `💸 Расходы: ${totalExpense.toFixed(2)} ₽\n`;
      message += `💰 Баланс: ${balance.toFixed(2)} ₽\n\n`;
      message += `🏙️ Города: ${masterCities.join(', ')}`;

      ctx.reply(message);
    } catch (error) {
      console.error('Ошибка при получении баланса кассы мастера:', error);
      ctx.reply('Ошибка при получении баланса');
    }
  }

  // Получение истории кассы мастера
  async getMasterCashHistory(ctx) {
    try {
      const masterInfo = ctx.session.userInfo;
      
      if (!masterInfo || !hasCities(masterInfo.cities)) {
        ctx.reply('❌ У вас не указаны города в профиле. Обратитесь к администратору.');
        return;
      }

      const masterCities = parseCities(masterInfo.cities);

      const query = `
        SELECT * FROM cash 
        WHERE city = ANY($1)
        ORDER BY date_create DESC 
        LIMIT 10
      `;
      
      const result = await db.getClient().query(query, [masterCities]);
      const history = result.rows;

      if (history.length === 0) {
        ctx.reply('История операций в ваших городах не найдена');
        return;
      }

      let message = '📊 История операций кассы:\n\n';
      history.forEach(record => {
        const date = new Date(record.date_create);
        const dateStr = date.toLocaleDateString('ru-RU');
        const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        const type = record.name === 'приход' ? '➕' : '➖';
        message += `${type} ${record.amount} ₽\n`;
        message += `📅 ${dateStr} ${timeStr}\n`;
        message += `🏙️ ${record.city}\n`;
        if (record.note) {
          message += `📝 ${record.note}\n`;
        }
        message += `👤 ${record.name_create}\n\n`;
      });

      ctx.reply(message);
    } catch (error) {
      console.error('Ошибка при получении истории кассы мастера:', error);
      ctx.reply('Ошибка при получении истории');
    }
  }

  // Добавление расхода мастера
  async addMasterExpense(ctx) {
    ctx.reply('💸 Введите сумму расхода:');
    ctx.session.addingExpense = true;
  }

  // Добавление прихода мастера
  async addMasterIncome(ctx) {
    ctx.reply('💰 Введите сумму прихода:');
    ctx.session.addingIncome = true;
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

      const query = `
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status_order = 'Ожидает' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN status_order = 'В работе' THEN 1 END) as in_work_orders,
          COUNT(CASE WHEN status_order = 'Завершено' THEN 1 END) as completed_orders
        FROM orders 
        WHERE city = ANY($1)
      `;
      
      const result = await db.getClient().query(query, [masterCities]);
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

  // Отчет по доходам мастера
  async getMasterIncomeReport(ctx) {
    try {
      const masterInfo = ctx.session.userInfo;
      
      if (!masterInfo || !hasCities(masterInfo.cities)) {
        ctx.reply('❌ У вас не указаны города в профиле. Обратитесь к администратору.');
        return;
      }

      const masterCities = parseCities(masterInfo.cities);

      let totalIncome = 0;
      let totalExpense = 0;

      for (const city of masterCities) {
        const balance = await db.getCashBalanceByCity(city);
        totalIncome += parseFloat(balance.income) || 0;
        totalExpense += parseFloat(balance.expense) || 0;
      }

      const netIncome = totalIncome - totalExpense;

      let message = '💰 Отчет по доходам мастера:\n\n';
      message += `💵 Общие доходы: ${totalIncome.toFixed(2)} ₽\n`;
      message += `💸 Общие расходы: ${totalExpense.toFixed(2)} ₽\n`;
      message += `💰 Чистый доход: ${netIncome.toFixed(2)} ₽\n\n`;
      message += `🏙️ Города: ${masterCities.join(', ')}`;

      ctx.reply(message);
    } catch (error) {
      console.error('Ошибка при получении отчета по доходам мастера:', error);
      ctx.reply('Ошибка при получении отчета');
    }
  }
}

module.exports = new MasterHandler();
