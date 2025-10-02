const db = require('../../config/database');
const { Markup } = require('telegraf');
const { escapeMarkdown } = require('../../utils/markdown');

class InWorkOrdersHandler {
  // Заявки в работе
  async getInWorkOrders(ctx) {
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
        WHERE status_order IN ('Принял', 'В пути', 'В работе')
        AND city = ANY($1)
        ORDER BY date_meeting ASC 
        LIMIT 10
      `;
      
      const result = await db.getClient().query(query, [directorCities]);
      const orders = result.rows;

      if (orders.length === 0) {
        ctx.reply('Заявок со статусами "Принял", "В пути", "В работе" в ваших городах не найдено');
        return;
      }

      // Создаем inline кнопки для каждой заявки
      const buttons = orders.map(order => {
        const date = new Date(order.date_meeting);
        const dateStr = date.toLocaleDateString('ru-RU');
        const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        return Markup.button.callback(
          `${order.id} | ${dateStr} ${timeStr}`,
          `inwork_order_${order.id}`
        );
      });

      const ordersKeyboard = Markup.inlineKeyboard(buttons, { columns: 1 });

      ctx.reply('📋 Заявки со статусами "Принял", "В пути", "В работе":', ordersKeyboard);
    } catch (error) {
      console.error('Ошибка при получении заявок в работе:', error);
      ctx.reply('Ошибка при получении заявок');
    }
  }

  // Показать детали заявки в работе
  async showInWorkOrderDetails(ctx, orderId) {
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

      // Создаем inline кнопки для заявок в работе
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('👨‍🔧 Изменить мастера', `inwork_change_master_${order.id}`)],
        [Markup.button.callback('📝 Изменить статус', `inwork_change_status_${order.id}`)]
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

  // Изменить мастера
  async changeMaster(ctx, orderId) {
    try {
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
        return Markup.button.callback(
          `${master.name} (${cities})`,
          `inwork_select_master_${orderId}_${master.id}`
        );
      });

      const keyboard = Markup.inlineKeyboard(buttons, { columns: 1 });
      
      ctx.reply('👨‍🔧 Выберите нового мастера:', keyboard);
    } catch (error) {
      console.error('Ошибка при получении мастеров:', error);
      ctx.reply('Ошибка при получении мастеров');
    }
  }

  // Изменить статус
  async changeStatus(ctx, orderId) {
    try {
      console.log(`🔍 changeStatus вызван для заявки #${orderId}`);
      
      // Создаем кнопки со статусами
      const statusButtons = [
        [Markup.button.callback('⏳ Ожидает', `inwork_set_status_${orderId}_Ожидает`)],
        [Markup.button.callback('🔄 Модерн', `inwork_set_status_${orderId}_Модерн`)],
        [Markup.button.callback('❌ Незаказ', `inwork_set_status_${orderId}_Незаказ`)]
      ];

      console.log(`🔍 Созданы кнопки статусов:`, statusButtons.map(btn => btn[0].callback_data));

      const keyboard = Markup.inlineKeyboard(statusButtons);
      
      console.log(`🔍 Отправляем сообщение с выбором статуса для заявки #${orderId}`);
      ctx.reply('📝 Выберите новый статус:', keyboard);
    } catch (error) {
      console.error('Ошибка при смене статуса:', error);
      ctx.reply('Ошибка при смене статуса');
    }
  }

  // Установить статус
  async setStatus(ctx, orderId, status) {
    try {
      console.log(`🔍 setStatus вызван: orderId=${orderId}, status=${status}`);
      
      // Проверяем, что заявка существует
      const checkOrder = await db.searchOrder(orderId);
      if (checkOrder.length === 0) {
        console.log(`❌ Заявка #${orderId} не найдена`);
        ctx.reply(`❌ Заявка #${orderId} не найдена`);
        return;
      }
      
      console.log(`✅ Заявка #${orderId} найдена, текущий статус: ${checkOrder[0].status_order}`);
      
      // Обновляем статус в БД
      console.log(`🔍 Выполняем SQL запрос: UPDATE orders SET status_order = '${status}' WHERE id = ${orderId}`);
      
      const updateResult = await db.getClient().query(`
        UPDATE orders 
        SET status_order = $1
        WHERE id = $2
      `, [status, orderId]);
      
      console.log(`✅ Статус заявки #${orderId} обновлен в БД на "${status}":`, updateResult);
      console.log(`📊 Количество обновленных строк:`, updateResult.rowCount);
      
      // Проверяем, что обновление прошло успешно
      if (updateResult.rowCount === 0) {
        console.log(`❌ Не удалось обновить заявку #${orderId}`);
        ctx.reply(`❌ Не удалось обновить заявку #${orderId}`);
        return;
      }
      
      // Проверяем, что статус действительно изменился
      const verifyOrder = await db.searchOrder(orderId);
      console.log(`🔍 Проверка после обновления: статус заявки #${orderId} = ${verifyOrder[0].status_order}`);
      
      ctx.reply(`✅ Статус заявки #${orderId} изменен на "${status}"`);
    } catch (error) {
      console.error('Ошибка при обновлении статуса:', error);
      console.error('Детали ошибки:', error.message);
      ctx.reply('Ошибка при обновлении статуса');
    }
  }

  // Назначение нового мастера на заявку
  async assignNewMasterToOrder(ctx, orderId, newMasterId) {
    try {
      console.log(`🔍 Начинаем изменение мастера:`, {
        orderId: orderId,
        newMasterId: newMasterId
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

      // Получаем информацию о старом мастере
      let oldMasterName = 'Не назначен';
      if (order.master_id) {
        const oldMasters = await db.getClient().query(`
          SELECT name, chat_id FROM master WHERE id = $1
        `, [order.master_id]);
        
        if (oldMasters.rows.length > 0) {
          oldMasterName = oldMasters.rows[0].name;
          const oldMasterChatId = oldMasters.rows[0].chat_id;
          
          // Уведомляем старого мастера об отмене заявки
          if (oldMasterChatId) {
            try {
              await ctx.telegram.sendMessage(oldMasterChatId, 
                `❌ Заявка #${orderId} была передана другому мастеру.\n\n⚠️ Пожалуйста, игнорируйте предыдущее сообщение с этой заявкой.`
              );
              console.log(`✅ Уведомление об отмене отправлено старому мастеру ${oldMasterName}`);
            } catch (error) {
              console.log(`⚠️ Не удалось уведомить старого мастера:`, error.message);
            }
          }
        }
      }

      // Получаем информацию о новом мастере
      const newMasters = await db.getClient().query(`
        SELECT id, name, chat_id, tg_id, cities
        FROM master 
        WHERE id = $1
      `, [newMasterId]);

      console.log(`🔍 Результат поиска нового мастера:`, newMasters.rows);

      if (newMasters.rows.length === 0) {
        ctx.reply('Новый мастер не найден');
        return;
      }

      const newMaster = newMasters.rows[0];
      console.log(`✅ Новый мастер найден:`, newMaster);

      // Обновляем заявку в БД
      console.log(`🔍 Обновляем заявку #${orderId} в БД:`, {
        newMasterId: newMasterId,
        orderId: orderId
      });

      const updateResult = await db.getClient().query(`
        UPDATE orders 
        SET master_id = $1, status_order = 'Ожидает'
        WHERE id = $2
      `, [newMasterId, orderId]);

      console.log(`✅ Заявка #${orderId} обновлена в БД:`, updateResult);

      // Отправляем заявку новому мастеру
      console.log(`🔍 Начинаем отправку заявки #${orderId} новому мастеру ${newMaster.name}`);
      const sentMessage = await this.sendOrderToNewMaster(ctx, order, newMaster);

      // Обновляем global.orderMessages для нового мастера
      if (sentMessage && sentMessage.message_id) {
        global.orderMessages = global.orderMessages || {};
        global.orderMessages[orderId] = {
          messageId: sentMessage.message_id,
          chatId: newMaster.chat_id
        };
        console.log(`✅ Обновлен global.orderMessages для заявки #${orderId}`);
      }

      ctx.reply(`✅ Мастер изменен с "${oldMasterName}" на "${newMaster.name}" для заявки #${orderId}`);
    } catch (error) {
      console.error('Ошибка при изменении мастера:', error);
      ctx.reply('Ошибка при изменении мастера');
    }
  }

  // Отправка заявки новому мастеру
  async sendOrderToNewMaster(ctx, order, master) {
    try {
      console.log(`🔍 Попытка отправить заявку #${order.id} новому мастеру:`, {
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

      let message = `🔔 *Заявка передана вам*\n\n`;
      message += `📋 *№${order.id}* | Ожидает\n\n`;
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

      // Создаем кнопки для мастера (заявка всегда со статусом "Ожидает" при изменении мастера)
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('✅ Принять заявку', `accept_order_${order.id}`)],
        [Markup.button.callback('❌ Отклонить заявку', `reject_order_${order.id}`)]
      ]);

      console.log(`📤 Отправляем сообщение новому мастеру ${master.name} в чат ${master.chat_id}`);

      // Отправляем сообщение новому мастеру
      const result = await ctx.telegram.sendMessage(master.chat_id, message, {
        parse_mode: 'Markdown',
        ...keyboard
      });

      console.log(`✅ Заявка #${order.id} успешно отправлена новому мастеру ${master.name} (chat_id: ${master.chat_id})`);
      console.log(`📨 Результат отправки:`, result);
      
      return result;
    } catch (error) {
      console.error('❌ Ошибка при отправке заявки новому мастеру:', error);
      console.error('Детали ошибки:', {
        errorMessage: error.message,
        errorCode: error.code,
        masterName: master.name,
        masterChatId: master.chat_id
      });
      
      // Уведомляем директора об ошибке
      ctx.reply(`❌ Ошибка при отправке заявки новому мастеру ${master.name}: ${error.message}`);
    }
  }

  setupHandlers(bot) {
    console.log('🔧 Регистрируем обработчики InWorkOrdersHandler');
    
    bot.hears('⚙️ В работе', (ctx) => this.getInWorkOrders(ctx));
    
    // Обработка нажатия на заявку в работе
    bot.action(/^inwork_order_(\d+)$/, (ctx) => {
      const orderId = ctx.match[1];
      this.showInWorkOrderDetails(ctx, orderId);
    });

    // Обработка кнопки "Изменить мастера"
    bot.action(/^inwork_change_master_(\d+)$/, (ctx) => {
      const orderId = ctx.match[1];
      console.log(`🔍 Обработчик inwork_change_master сработал для заявки #${orderId}`);
      this.changeMaster(ctx, orderId);
    });

    // Обработка кнопки "Изменить статус"
    bot.action(/^inwork_change_status_(\d+)$/, (ctx) => {
      const orderId = ctx.match[1];
      console.log(`🔍 Обработчик inwork_change_status сработал для заявки #${orderId}`);
      this.changeStatus(ctx, orderId);
    });

    // Обработка выбора мастера для заявок "В работе"
    bot.action(/^inwork_select_master_(\d+)_(\d+)$/, async (ctx) => {
      const orderId = ctx.match[1];
      const masterId = ctx.match[2];
      
      try {
        await this.assignNewMasterToOrder(ctx, orderId, masterId);
      } catch (error) {
        console.error('Ошибка при назначении мастера:', error);
        ctx.reply('Ошибка при назначении мастера');
      }
    });

    // Обработка выбора статуса
    bot.action(/^inwork_set_status_(\d+)_(.+)$/, async (ctx) => {
      const orderId = ctx.match[1];
      const status = ctx.match[2];
      console.log(`🔍 Обработчик inwork_set_status сработал: orderId=${orderId}, status=${status}`);
      await this.setStatus(ctx, orderId, status);
    });
  }
}

module.exports = new InWorkOrdersHandler();
