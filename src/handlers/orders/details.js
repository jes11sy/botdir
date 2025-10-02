const db = require('../../config/database');
const { Markup } = require('telegraf');
const { escapeMarkdown } = require('../../utils/markdown');

class OrderDetailsHandler {
  // Обработка нажатия на заявку
  async handleOrderClick(ctx, orderId) {
    try {
      console.log(`🔍 handleOrderClick вызван для заявки #${orderId}`);
      
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

      // Показываем кнопку "Назначить мастера" только для заявок со статусом "Ожидает"
      if (order.status_order === 'Ожидает') {
        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback('👨‍🔧 Назначить мастера', `assign_master_${order.id}`)]
        ]);

        ctx.reply(message, { 
          parse_mode: 'Markdown',
          ...keyboard
        });
      } else {
        // Для остальных статусов показываем без кнопки
        ctx.reply(message, { 
          parse_mode: 'Markdown'
        });
      }
    } catch (error) {
      console.error('Ошибка при получении заявки:', error);
      ctx.reply('Ошибка при получении заявки');
    }
  }

    // Обработка назначения мастера
    async handleAssignMaster(ctx, orderId) {
      try {
        console.log(`🔍 handleAssignMaster вызван для заявки #${orderId}`);
        
        // Получаем города директора
        const directorInfo = await db.getDirectorInfo(ctx.from.id.toString());
        if (!directorInfo || !directorInfo.cities || directorInfo.cities.length === 0) {
          ctx.reply('❌ У вас не указаны города в профиле. Обратитесь к администратору.');
          return;
        }

        console.log(`🔍 Города директора:`, directorInfo.cities);
        
        // Получаем список мастеров, которые работают и имеют пересекающиеся города с директором
        const masters = await db.getClient().query(`
          SELECT id, name, cities, status_work, chat_id, tg_id
          FROM master 
          WHERE status_work = 'работает' 
          AND cities && $1
          ORDER BY name ASC
          LIMIT 50
        `, [directorInfo.cities]);
        
        console.log(`🔍 Найдено мастеров:`, masters.rows.length);
        console.log(`🔍 Список мастеров:`, masters.rows);
        
        if (masters.rows.length === 0) {
          ctx.reply('Работающих мастеров в ваших городах не найдено');
          return;
        }

      // Создаем кнопки с мастерами
      const buttons = masters.rows.map(master => {
        const cities = Array.isArray(master.cities) ? master.cities.join(', ') : master.cities;
        const callbackData = `select_master_${orderId}_${master.id}`;
        console.log(`🔍 Создаем кнопку для мастера:`, {
          name: master.name,
          cities: cities,
          callbackData: callbackData
        });
        return Markup.button.callback(
          `${master.name} (${cities})`,
          callbackData
        );
      });

      console.log(`🔍 Создано кнопок:`, buttons.length);
      console.log(`🔍 Callback data кнопок:`, buttons.map(b => b.callback_data));
      const keyboard = Markup.inlineKeyboard(buttons, { columns: 1 });
      
      console.log(`🔍 Отправляем сообщение с выбором мастера`);
      ctx.reply('👨‍🔧 Выберите мастера для назначения:', keyboard);
    } catch (error) {
      console.error('Ошибка при получении мастеров:', error);
      ctx.reply('Ошибка при получении мастеров');
    }
  }

  // Назначение мастера на заявку
  async assignMasterToOrder(ctx, orderId, masterId) {
    try {
      console.log(`🔍 Начинаем назначение мастера:`, {
        orderId: orderId,
        masterId: masterId
      });

      // Получаем информацию о заявке
      const orders = await db.searchOrder(orderId);
      console.log(`🔍 Результат поиска заявки:`, orders);
      
      if (orders.length === 0) {
        ctx.reply('Заявка не найдена');
        return;
      }

      const order = orders[0];
      console.log(`✅ Заявка найдена:`, order);

      // Получаем информацию о мастере
      const masters = await db.getClient().query(`
        SELECT id, name, chat_id, tg_id, cities
        FROM master 
        WHERE id = $1
      `, [masterId]);

      console.log(`🔍 Результат поиска мастера:`, masters.rows);

      if (masters.rows.length === 0) {
        ctx.reply('Мастер не найден');
        return;
      }

      const master = masters.rows[0];
      console.log(`✅ Мастер найден:`, master);

      // Обновляем заявку в БД
      console.log(`🔍 Обновляем заявку #${orderId} в БД:`, {
        masterId: masterId,
        orderId: orderId
      });

      const updateResult = await db.getClient().query(`
        UPDATE orders 
        SET master_id = $1
        WHERE id = $2
      `, [masterId, orderId]);

      console.log(`✅ Заявка #${orderId} обновлена в БД:`, updateResult);

      // Отправляем заявку мастеру
      console.log(`🔍 Начинаем отправку заявки #${orderId} мастеру ${master.name}`);
      await this.sendOrderToMaster(ctx, order, master);

      ctx.reply(`✅ Мастер ${master.name} назначен на заявку #${orderId}`);
    } catch (error) {
      console.error('Ошибка при назначении мастера:', error);
      ctx.reply('Ошибка при назначении мастера');
    }
  }

  // Отправка заявки мастеру
  async sendOrderToMaster(ctx, order, master) {
    try {
      console.log(`🔍 Попытка отправить заявку #${order.id} мастеру:`, {
        masterName: master.name,
        masterChatId: master.chat_id,
        masterTgId: master.tg_id
      });

      // Проверяем, есть ли у мастера chat_id
      if (!master.chat_id) {
        console.log(`❌ У мастера ${master.name} не указан chat_id`);
        ctx.reply(`❌ У мастера ${master.name} не указан chat_id. Заявка не отправлена.`);
        return;
      }

      const meetingDate = new Date(order.date_meeting);
      const dateStr = meetingDate.toLocaleDateString('ru-RU');
      const timeStr = meetingDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        let message = `🔔 *Новая заявка назначена*\n\n`;
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

      // Создаем кнопки для мастера
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('✅ Принять заявку', `accept_order_${order.id}`)],
        [Markup.button.callback('❌ Отклонить заявку', `reject_order_${order.id}`)]
      ]);

      console.log(`📤 Отправляем сообщение мастеру ${master.name} в чат ${master.chat_id}`);

      // Отправляем сообщение мастеру
      const result = await ctx.telegram.sendMessage(master.chat_id, message, {
        parse_mode: 'Markdown',
        ...keyboard
      });

      console.log(`✅ Заявка #${order.id} успешно отправлена мастеру ${master.name} (chat_id: ${master.chat_id})`);
      console.log(`📨 Результат отправки:`, result);
      
    } catch (error) {
      console.error('❌ Ошибка при отправке заявки мастеру:', error);
      console.error('Детали ошибки:', {
        errorMessage: error.message,
        errorCode: error.code,
        masterName: master.name,
        masterChatId: master.chat_id
      });
      
      // Уведомляем директора об ошибке
      ctx.reply(`❌ Ошибка при отправке заявки мастеру ${master.name}: ${error.message}`);
    }
  }

  // Обработка принятия заявки мастером
  async handleMasterAcceptOrder(ctx, orderId) {
    try {
      // Обновляем статус заявки на "Принял"
      await db.getClient().query(`
        UPDATE orders 
        SET status_order = 'Принял'
        WHERE id = $1
      `, [orderId]);

      // Получаем информацию о заявке для отображения
      const orders = await db.searchOrder(orderId);
      const order = orders[0];
      
      const meetingDate = new Date(order.date_meeting);
      const dateStr = meetingDate.toLocaleDateString('ru-RU');
      const timeStr = meetingDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        // Получаем информацию о мастере
        const masters = await db.getClient().query(`
          SELECT name FROM master WHERE id = $1
        `, [order.master_id]);
        
        const masterName = masters.rows.length > 0 ? masters.rows[0].name : 'Не указано';

        let message = `📋 *№${orderId}* | Принял\n\n`;
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
        message += `👨‍🔧 *Назначен мастер:* ${masterName}`;

      // Создаем кнопку "В пути"
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🚗 В пути', `on_way_${orderId}`)]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...keyboard
      });

      console.log(`Заявка #${orderId} принята мастером`);
    } catch (error) {
      console.error('Ошибка при принятии заявки:', error);
      ctx.reply('Ошибка при принятии заявки');
    }
  }

  // Обработка отклонения заявки мастером
  async handleMasterRejectOrder(ctx, orderId) {
    try {
      // Обновляем статус заявки на "Ожидает" и убираем мастера
      await db.getClient().query(`
        UPDATE orders 
        SET status_order = 'Ожидает', master_id = NULL
        WHERE id = $1
      `, [orderId]);

      // Редактируем сообщение с отклонением
      let message = `🔔 *Новая заявка назначена*\n\n`;
      message += `📋 *№${orderId}*\n\n`;
      message += `❌ *Заявка отклонена мастером*`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown'
      });

      console.log(`Заявка #${orderId} отклонена мастером`);
    } catch (error) {
      console.error('Ошибка при отклонении заявки:', error);
      ctx.reply('Ошибка при отклонении заявки');
    }
  }

  // Обработка статуса "В пути"
  async handleOnWay(ctx, orderId) {
    try {
      await db.getClient().query(`
        UPDATE orders 
        SET status_order = 'В пути'
        WHERE id = $1
      `, [orderId]);

      const orders = await db.searchOrder(orderId);
      const order = orders[0];
      
      const meetingDate = new Date(order.date_meeting);
      const dateStr = meetingDate.toLocaleDateString('ru-RU');
      const timeStr = meetingDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        // Получаем информацию о мастере
        const masters = await db.getClient().query(`
          SELECT name FROM master WHERE id = $1
        `, [order.master_id]);
        
        const masterName = masters.rows.length > 0 ? masters.rows[0].name : 'Не указано';

        let message = `📋 *№${orderId}* | В пути\n\n`;
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
        message += `👨‍🔧 *Назначен мастер:* ${masterName}`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔧 В работе', `in_work_${orderId}`)]
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    } catch (error) {
      console.error('Ошибка при статусе "В пути":', error);
      ctx.reply('Ошибка при статусе "В пути"');
    }
  }

  // Обработка статуса "В работе"
  async handleInWork(ctx, orderId) {
    try {
      await db.getClient().query(`
        UPDATE orders 
        SET status_order = 'В работе'
        WHERE id = $1
      `, [orderId]);

      const orders = await db.searchOrder(orderId);
      const order = orders[0];
      
      const meetingDate = new Date(order.date_meeting);
      const dateStr = meetingDate.toLocaleDateString('ru-RU');
      const timeStr = meetingDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        // Получаем информацию о мастере
        const masters = await db.getClient().query(`
          SELECT name FROM master WHERE id = $1
        `, [order.master_id]);
        
        const masterName = masters.rows.length > 0 ? masters.rows[0].name : 'Не указано';

        let message = `📋 *№${orderId}* | В работе\n\n`;
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
        message += `👨‍🔧 *Назначен мастер:* ${masterName}`;

        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback('✅ Готово', `final_status_${orderId}_Готово`)],
          [Markup.button.callback('❌ Отказ', `final_status_${orderId}_Отказ`)],
          [Markup.button.callback('🔄 Модерн', `final_status_${orderId}_Модерн`)],
          [Markup.button.callback('🚫 Незаказ', `final_status_${orderId}_Незаказ`)]
        ]);

        // Сохраняем ID текущего сообщения для последующего удаления
        ctx.session = ctx.session || {};
        ctx.session.orderMessageId = ctx.callbackQuery.message.message_id;

        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          ...keyboard
        });

        // Сохраняем ID сообщения в глобальной переменной для последующего удаления
        global.orderMessages = global.orderMessages || {};
        global.orderMessages[orderId] = {
          messageId: ctx.callbackQuery.message.message_id,
          chatId: ctx.chat.id
        };
    } catch (error) {
      console.error('Ошибка при статусе "В работе":', error);
      ctx.reply('Ошибка при статусе "В работе"');
    }
  }

  // Обработка статуса "Модерн" - показывает только 2 кнопки
  async handleModernStatus(ctx, orderId) {
    try {
      await db.getClient().query(`
        UPDATE orders 
        SET status_order = 'Модерн'
        WHERE id = $1
      `, [orderId]);

      const orders = await db.searchOrder(orderId);
      const order = orders[0];
      
      const meetingDate = new Date(order.date_meeting);
      const dateStr = meetingDate.toLocaleDateString('ru-RU');
      const timeStr = meetingDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

      // Получаем информацию о мастере
      const masters = await db.getClient().query(`
        SELECT name FROM master WHERE id = $1
      `, [order.master_id]);
      
      const masterName = masters.rows.length > 0 ? masters.rows[0].name : 'Не указано';

      let message = `📋 *№${orderId}* | Модерн\n\n`;
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
      message += `👨‍🔧 *Назначен мастер:* ${masterName}`;

      // Создаем кнопки только для "Готово" и "Отказ"
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('✅ Готово', `final_status_${orderId}_Готово`)],
        [Markup.button.callback('❌ Отказ', `final_status_${orderId}_Отказ`)]
      ]);

      // Удаляем старое сообщение с заявкой и кнопками
      try {
        if (ctx.session && ctx.session.orderMessageId) {
          await ctx.telegram.deleteMessage(ctx.chat.id, ctx.session.orderMessageId);
        }
      } catch (error) {
        console.log('Не удалось удалить сообщение с заявкой:', error.message);
      }

      // Отправляем новое сообщение с кнопками
      const sentMessage = await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...keyboard
      });

      // Сохраняем ID нового сообщения в глобальной переменной для последующего удаления
      global.orderMessages = global.orderMessages || {};
      global.orderMessages[orderId] = {
        messageId: sentMessage.message_id,
        chatId: ctx.chat.id
      };
    } catch (error) {
      console.error('Ошибка при статусе "Модерн":', error);
      ctx.reply('Ошибка при статусе "Модерн"');
    }
  }

  // Обработка финальных статусов
  async handleFinalStatus(ctx, orderId, status) {
    try {
      console.log(`🔍 handleFinalStatus: orderId=${orderId}, status=${status}`);
      console.log(`🔍 global.orderMessages:`, global.orderMessages);

      await db.getClient().query(`
        UPDATE orders 
        SET status_order = $1, closing_data = NOW()
        WHERE id = $2
      `, [status, orderId]);

      const orders = await db.searchOrder(orderId);
      const order = orders[0];
      
      const meetingDate = new Date(order.date_meeting);
      const dateStr = meetingDate.toLocaleDateString('ru-RU');
      const timeStr = meetingDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

      // Получаем информацию о мастере
      const masters = await db.getClient().query(`
        SELECT name FROM master WHERE id = $1
      `, [order.master_id]);
      
      const masterName = masters.rows.length > 0 ? masters.rows[0].name : 'Не указано';

      let message = `📋 *№${orderId}* | ${status}\n\n`;
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
      message += `👨‍🔧 *Назначен мастер:* ${masterName}`;

      // Удаляем старое сообщение с заявкой и кнопками
      try {
        if (global.orderMessages && global.orderMessages[orderId]) {
          const messageInfo = global.orderMessages[orderId];
          await ctx.telegram.deleteMessage(messageInfo.chatId, messageInfo.messageId);
          delete global.orderMessages[orderId];
          console.log(`✅ Сообщение с заявкой #${orderId} успешно удалено`);
        }
      } catch (error) {
        console.log(`⚠️ Не удалось удалить сообщение с заявкой #${orderId}:`, error.message);
        // Очищаем запись даже если не удалось удалить
        if (global.orderMessages && global.orderMessages[orderId]) {
          delete global.orderMessages[orderId];
        }
      }

      // Отправляем новое сообщение
      await ctx.reply(message, {
        parse_mode: 'Markdown'
      });
    } catch (error) {
      console.error('Ошибка при финальном статусе:', error);
      ctx.reply('Ошибка при финальном статусе');
    }
  }

  // Обработка статуса "Готово" - запрос итога и расхода
  async handleReadyStatus(ctx, orderId) {
    try {
      console.log(`🔍 handleReadyStatus: orderId=${orderId}`);
      console.log(`🔍 global.orderMessages:`, global.orderMessages);

      // Инициализируем сессию для ввода сумм
      ctx.session = ctx.session || {};
      ctx.session.waitingForAmounts = true;
      ctx.session.orderId = orderId;
      
      ctx.reply('💰 Укажите итог и расход через пробел (например: 10000 1000):\n\n📝 *В ответ на данное сообщение*');
    } catch (error) {
      console.error('Ошибка при запросе сумм:', error);
      ctx.reply('Ошибка при запросе сумм');
    }
  }

  // Обработка ввода итога и расхода
  async processAmountsInput(ctx, text) {
    try {
      const parts = text.trim().split(' ');
      
      if (parts.length !== 2) {
        ctx.reply('❌ Неверный формат. Укажите итог и расход через пробел (например: 10000 1000):');
        return;
      }

      const result = parseFloat(parts[0]);
      const expenditure = parseFloat(parts[1]);

      if (isNaN(result) || isNaN(expenditure) || result < 0 || expenditure < 0) {
        ctx.reply('❌ Неверные числа. Укажите итог и расход через пробел (например: 10000 1000):');
        return;
      }

      const orderId = ctx.session.orderId;
      
      // Расчет чистыми и сдачи мастера
      const clean = result - expenditure;
      const masterChange = clean / 2;

      // Обновляем заявку в БД
      await db.getClient().query(`
        UPDATE orders 
        SET status_order = 'Готово', result = $1, expenditure = $2, clean = $3, master_change = $4, closing_data = NOW()
        WHERE id = $5
      `, [result, expenditure, clean, masterChange, orderId]);

      // Добавляем запись в кассу (приход)
      try {
        // Получаем информацию о заявке для города
        const orders = await db.searchOrder(orderId);
        const order = orders[0];
        
        // Получаем информацию о мастере для note
        const masters = await db.getClient().query(`
          SELECT name FROM master WHERE id = $1
        `, [order.master_id]);
        
        const masterName = masters.rows.length > 0 ? masters.rows[0].name : 'Не указано';
        
        // Добавляем запись в cash с правильными полями
        await db.getClient().query(`
          INSERT INTO cash (name, amount, city, note, name_create, payment_purpose, date_create, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())
        `, [
          'приход',
          masterChange,  // сдача мастера
          order.city,
          `${masterName} - Итог по заказу: ${result}₽`,
          'Система Бот',
          `Заказ №${orderId}`
        ]);
        
        console.log(`✅ Добавлена запись в кассу: приход ${masterChange} руб. по заказу №${orderId}`);
      } catch (error) {
        console.error('Ошибка при добавлении записи в кассу:', error);
        // Не прерываем выполнение, просто логируем ошибку
      }

      // Получаем информацию о заявке и мастере
      const orders = await db.searchOrder(orderId);
      const order = orders[0];
      
      // Получаем информацию о мастере
      const masters = await db.getClient().query(`
        SELECT name FROM master WHERE id = $1
      `, [order.master_id]);
      
      const masterName = masters.rows.length > 0 ? masters.rows[0].name : 'Не указано';
      
      const meetingDate = new Date(order.date_meeting);
      const dateStr = meetingDate.toLocaleDateString('ru-RU');
      const timeStr = meetingDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

      let message = `📋 *№${orderId}* | Готово\n\n`;
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
      message += `👨‍🔧 *Назначен мастер:* ${masterName}\n`;
      message += `💰 *Итог:* ${result}\n`;
      message += `💸 *Расход:* ${expenditure}\n`;
      message += `💵 *Чистыми:* ${clean}\n\n`;
      message += `💼 *Сдача мастера:* ${masterChange}`;

      // Удаляем первое сообщение с заявкой и кнопками
      try {
        // Получаем ID сообщения с заявкой из сессии
        if (ctx.session.orderMessageId) {
          await ctx.telegram.deleteMessage(ctx.chat.id, ctx.session.orderMessageId);
        }
      } catch (error) {
        console.log('Не удалось удалить сообщение с заявкой:', error.message);
      }

      // Удаляем старое сообщение с заявкой и кнопками
      try {
        if (global.orderMessages && global.orderMessages[orderId]) {
          const messageInfo = global.orderMessages[orderId];
          await ctx.telegram.deleteMessage(messageInfo.chatId, messageInfo.messageId);
          delete global.orderMessages[orderId];
          console.log(`✅ Сообщение с заявкой #${orderId} успешно удалено`);
        }
      } catch (error) {
        console.log(`⚠️ Не удалось удалить сообщение с заявкой #${orderId}:`, error.message);
        // Очищаем запись даже если не удалось удалить
        if (global.orderMessages && global.orderMessages[orderId]) {
          delete global.orderMessages[orderId];
        }
      }

      // Отправляем новое сообщение с результатами
      await ctx.reply(message, {
        parse_mode: 'Markdown'
      });

      // Очищаем сессию
      delete ctx.session.waitingForAmounts;
      delete ctx.session.orderId;
      
    } catch (error) {
      console.error('Ошибка при обработке сумм:', error);
      ctx.reply('Ошибка при обработке сумм');
    }
  }


  setupHandlers(bot) {
    console.log('🔧 Регистрируем обработчики OrderDetailsHandler');
    
    // Обработка выбора мастера
    bot.action(/^select_master_(\d+)_(\d+)$/, async (ctx) => {
      const orderId = ctx.match[1];
      const masterId = ctx.match[2];
      
      console.log(`🔍 Обработчик выбора мастера сработал:`, {
        orderId: orderId,
        masterId: masterId
      });
      
      try {
        await this.assignMasterToOrder(ctx, orderId, masterId);
      } catch (error) {
        console.error('Ошибка при назначении мастера:', error);
        ctx.reply('Ошибка при назначении мастера');
      }
    });
    
    // Обработка нажатия на inline кнопку заявки
    bot.action(/^order_(\d+)$/, (ctx) => {
      const orderId = ctx.match[1];
      console.log(`🔍 Обработчик нажатия на заявку сработал: orderId = ${orderId}`);
      this.handleOrderClick(ctx, orderId);
    });

    // Обработка кнопки "Назначить мастера"
    bot.action(/^assign_master_(\d+)$/, (ctx) => {
      const orderId = ctx.match[1];
      console.log(`🔍 Обработчик "Назначить мастера" сработал: orderId = ${orderId}`);
      this.handleAssignMaster(ctx, orderId);
    });


    // Обработка принятия заявки мастером
    bot.action(/^accept_order_(\d+)$/, async (ctx) => {
      const orderId = ctx.match[1];
      try {
        await this.handleMasterAcceptOrder(ctx, orderId);
      } catch (error) {
        console.error('Ошибка при принятии заявки:', error);
        ctx.reply('Ошибка при принятии заявки');
      }
    });

    // Обработка отклонения заявки мастером
    bot.action(/^reject_order_(\d+)$/, async (ctx) => {
      const orderId = ctx.match[1];
      try {
        await this.handleMasterRejectOrder(ctx, orderId);
      } catch (error) {
        console.error('Ошибка при отклонении заявки:', error);
        ctx.reply('Ошибка при отклонении заявки');
      }
    });

    // Обработка "В пути"
    bot.action(/^on_way_(\d+)$/, async (ctx) => {
      const orderId = ctx.match[1];
      try {
        await this.handleOnWay(ctx, orderId);
      } catch (error) {
        console.error('Ошибка при статусе "В пути":', error);
        ctx.reply('Ошибка при статусе "В пути"');
      }
    });

    // Обработка "В работе"
    bot.action(/^in_work_(\d+)$/, async (ctx) => {
      const orderId = ctx.match[1];
      try {
        await this.handleInWork(ctx, orderId);
      } catch (error) {
        console.error('Ошибка при статусе "В работе":', error);
        ctx.reply('Ошибка при статусе "В работе"');
      }
    });

      // Обработка финальных статусов
      bot.action(/^final_status_(\d+)_(.+)$/, async (ctx) => {
        const orderId = ctx.match[1];
        const status = ctx.match[2];
        try {
          // Проверяем текущий статус заказа
          const orders = await db.searchOrder(orderId);
          if (!orders || orders.length === 0) {
            ctx.reply('❌ Заявка не найдена');
            return;
          }

          const order = orders[0];
          const currentStatus = order.status_order;
          
          // Если заказ уже закрыт, не позволяем повторно закрывать
          if (['Готово', 'Отказ', 'Незаказ'].includes(currentStatus)) {
            ctx.reply(`❌ Заявка #${orderId} уже закрыта со статусом "${currentStatus}". Повторное закрытие невозможно.`);
            return;
          }

          if (status === 'Готово') {
            await this.handleReadyStatus(ctx, orderId);
          } else if (status === 'Модерн') {
            await this.handleModernStatus(ctx, orderId);
          } else {
            await this.handleFinalStatus(ctx, orderId, status);
          }
        } catch (error) {
          console.error('Ошибка при финальном статусе:', error);
          ctx.reply('Ошибка при финальном статусе');
        }
      });

    // Обработка ввода итога и расхода
    bot.on('text', async (ctx, next) => {
      if (ctx.session && ctx.session.waitingForAmounts) {
        await this.processAmountsInput(ctx, ctx.message.text);
      } else {
        next();
      }
    });
  }
}

module.exports = new OrderDetailsHandler();
