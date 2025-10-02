const db = require('../config/database');
const { employeesMenu } = require('../keyboards/menus');
const { Markup } = require('telegraf');
const AuthMiddleware = require('../middleware/auth');

class EmployeesHandler {
  // Получение списка операторов
  async getOperators(ctx) {
    try {
      const operators = await db.getOperators(10);

      if (operators.length === 0) {
        ctx.reply('Операторов не найдено');
        return;
      }

      let message = '👨‍💼 Операторы:\n\n';
      operators.forEach((operator, index) => {
        message += `${index + 1}. ${operator.name}\n`;
        message += `   Логин: ${operator.login}\n`;
        message += `   Город: ${operator.city}\n`;
        message += `   Статус: ${operator.status}\n\n`;
      });

      ctx.reply(message);
    } catch (error) {
      console.error('Ошибка при получении операторов:', error);
      ctx.reply('Ошибка при получении операторов');
    }
  }

  // Получение списка мастеров в виде кнопок
  async getMasters(ctx) {
    try {
      // Получаем города директора
      const directorInfo = await db.getDirectorInfo(ctx.from.id.toString());
      
      if (!directorInfo) {
        ctx.reply('❌ Ваш профиль не найден в базе данных. Обратитесь к администратору.');
        return;
      }

      if (!directorInfo.cities || directorInfo.cities.length === 0) {
        ctx.reply('❌ У вас не указаны города в профиле. Обратитесь к администратору.');
        return;
      }

      // Получаем только работающих мастеров из городов директора
      const masters = await db.getClient().query(`
        SELECT * FROM master 
        WHERE status_work = 'работает'
        AND cities && $1
        ORDER BY name ASC
        LIMIT 50
      `, [directorInfo.cities]);
      
      if (masters.rows.length === 0) {
        ctx.reply('Работающих мастеров в ваших городах не найдено');
        return;
      }

      // Создаем inline кнопки для каждого мастера
      const buttons = masters.rows.map(master => {
        const cities = Array.isArray(master.cities) ? master.cities.join(', ') : master.cities;
        return Markup.button.callback(
          `👨‍🔧 ${master.name} (${cities})`,
          `master_${master.id}`
        );
      });

      const mastersKeyboard = Markup.inlineKeyboard(buttons, { columns: 1 });

      ctx.reply('👨‍🔧 *Список работающих мастеров в ваших городах:*', {
        parse_mode: 'Markdown',
        ...mastersKeyboard
      });
    } catch (error) {
      console.error('Ошибка при получении мастеров:', error);
      ctx.reply('Ошибка при получении мастеров');
    }
  }

  // Показать детали мастера
  async showMasterDetails(ctx, masterId) {
    try {
      const masters = await db.getClient().query(`
        SELECT * FROM master WHERE id = $1
      `, [masterId]);

      if (masters.rows.length === 0) {
        ctx.reply('Мастер не найден');
        return;
      }

      const master = masters.rows[0];
      const cities = Array.isArray(master.cities) ? master.cities.join(', ') : master.cities;
      const dateCreate = new Date(master.date_create);
      const dateStr = dateCreate.toLocaleDateString('ru-RU');

      let message = `👨‍🔧 *${master.name}*\n\n`;
      message += `🏙️ *Города:* ${cities}\n`;
      message += `📊 *Статус работы:* ${master.status_work}\n`;
      message += `📅 *Дата создания:* ${dateStr}\n`;
      message += `📝 *Примечание:* ${master.note || 'Нет'}\n`;

      if (master.tg_id) {
        message += `🆔 *Telegram ID:* \`${master.tg_id}\`\n`;
      }

      if (master.chat_id) {
        message += `💬 *Chat ID:* \`${master.chat_id}\`\n`;
      }

      // Создаем кнопки для редактирования
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📊 Изменить статус', `change_master_status_${masterId}`)],
        [Markup.button.callback('🆔 Изменить TG ID', `change_master_tgid_${masterId}`)],
        [Markup.button.callback('💬 Изменить Chat ID', `change_master_chatid_${masterId}`)]
      ]);

      ctx.reply(message, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    } catch (error) {
      console.error('Ошибка при получении мастера:', error);
      ctx.reply('Ошибка при получении мастера');
    }
  }

  // Получение списка админов
  async getAdmins(ctx) {
    try {
      const admins = await db.getAdmins(10);

      if (admins.length === 0) {
        ctx.reply('Админов не найдено');
        return;
      }

      let message = '👨‍💻 Админы:\n\n';
      admins.forEach((admin, index) => {
        message += `${index + 1}. ${admin.login}\n`;
        message += `   Примечание: ${admin.note || 'Нет'}\n\n`;
      });

      ctx.reply(message);
    } catch (error) {
      console.error('Ошибка при получении админов:', error);
      ctx.reply('Ошибка при получении админов');
    }
  }

  // Поиск мастера - шаг 1: запрос имени
  async searchMaster(ctx) {
    // Инициализируем сессию для поиска мастера
    ctx.session = ctx.session || {};
    ctx.session.searchingMaster = {};
    ctx.session.searchStep = 'name';
    
    ctx.reply('🔍 *Поиск мастера*\n\n📝 Введите имя мастера для поиска:', {
      parse_mode: 'Markdown'
    });
  }

  // Обработка поиска мастера
  async processMasterSearch(ctx, text) {
    try {
      if (!text || text.trim().length === 0) {
        ctx.reply('❌ Имя не может быть пустым. Введите имя мастера:');
        return;
      }

      const searchName = text.trim();
      
      // Получаем города директора для фильтрации
      const directorInfo = await db.getDirectorInfo(ctx.from.id.toString());
      
      if (!directorInfo) {
        ctx.reply('❌ Ваш профиль не найден в базе данных. Обратитесь к администратору.');
        return;
      }

      if (!directorInfo.cities || directorInfo.cities.length === 0) {
        ctx.reply('❌ У вас не указаны города в профиле. Обратитесь к администратору.');
        return;
      }

      // Ищем мастеров по имени в городах директора
      const masters = await db.getClient().query(`
        SELECT * FROM master 
        WHERE LOWER(name) LIKE LOWER($1)
        AND cities && $2
        ORDER BY name ASC
        LIMIT 10
      `, [`%${searchName}%`, directorInfo.cities]);
      
      if (masters.rows.length === 0) {
        ctx.reply(`❌ Мастеров с именем "${searchName}" в ваших городах не найдено`);
        return;
      }

      // Показываем результаты поиска
      await this.showSearchResults(ctx, masters.rows, searchName);
      
      // Очищаем сессию
      delete ctx.session.searchingMaster;
      delete ctx.session.searchStep;
    } catch (error) {
      console.error('Ошибка при поиске мастера:', error);
      ctx.reply('Ошибка при поиске мастера');
    }
  }

  // Показать результаты поиска
  async showSearchResults(ctx, masters, searchName) {
    let message = `🔍 *Результаты поиска: "${searchName}"*\n\n`;
    
    // Создаем inline кнопки для каждого найденного мастера
    const buttons = masters.map(master => {
      const cities = Array.isArray(master.cities) ? master.cities.join(', ') : master.cities;
      const statusEmoji = master.status_work === 'работает' ? '✅' : '❌';
      return Markup.button.callback(
        `${statusEmoji} ${master.name} (${cities})`,
        `master_${master.id}`
      );
    });

    const searchKeyboard = Markup.inlineKeyboard(buttons, { columns: 1 });

    ctx.reply(message, {
      parse_mode: 'Markdown',
      ...searchKeyboard
    });
  }

  // Добавление мастера - шаг 1: запрос имени
  async addMaster(ctx) {
    // Инициализируем сессию для добавления мастера
    ctx.session = ctx.session || {};
    ctx.session.addingMaster = {};
    ctx.session.addingStep = 'name';
    
    ctx.reply('👨‍🔧 *Добавление нового мастера*\n\n📝 Введите имя мастера:', {
      parse_mode: 'Markdown'
    });
  }

  // Обработка ввода имени
  async processMasterName(ctx, text) {
    try {
      if (!text || text.trim().length === 0) {
        ctx.reply('❌ Имя не может быть пустым. Введите имя мастера:');
        return;
      }

      // Сохраняем имя и переходим к следующему шагу
      ctx.session.addingMaster.name = text.trim();
      ctx.session.addingStep = 'cities';
      
      ctx.reply('🏙️ Введите города мастера через запятую (например: Саратов, Энгельс):');
    } catch (error) {
      console.error('Ошибка при обработке имени мастера:', error);
      ctx.reply('Ошибка при обработке имени мастера');
    }
  }

  // Обработка ввода городов
  async processMasterCities(ctx, text) {
    try {
      if (!text || text.trim().length === 0) {
        ctx.reply('❌ Города не могут быть пустыми. Введите города мастера:');
        return;
      }

      // Парсим города
      const cities = text.split(',').map(city => city.trim()).filter(city => city.length > 0);
      
      if (cities.length === 0) {
        ctx.reply('❌ Неверный формат городов. Введите города через запятую:');
        return;
      }

      // Сохраняем города и переходим к следующему шагу
      ctx.session.addingMaster.cities = cities;
      ctx.session.addingStep = 'chat_id';
      
      ctx.reply('💬 Введите Chat ID мастера:');
    } catch (error) {
      console.error('Ошибка при обработке городов мастера:', error);
      ctx.reply('Ошибка при обработке городов мастера');
    }
  }

  // Обработка ввода Chat ID
  async processMasterChatId(ctx, text) {
    try {
      // Валидация Chat ID (должен быть числом)
      const chatId = parseInt(text);
      if (isNaN(chatId)) {
        ctx.reply('❌ Chat ID должен быть числом. Введите Chat ID мастера:');
        return;
      }

      // Сохраняем Chat ID и переходим к следующему шагу
      ctx.session.addingMaster.chat_id = chatId.toString();
      ctx.session.addingStep = 'tg_id';
      
      ctx.reply('🆔 Введите Telegram ID мастера:');
    } catch (error) {
      console.error('Ошибка при обработке Chat ID мастера:', error);
      ctx.reply('Ошибка при обработке Chat ID мастера');
    }
  }

  // Обработка ввода TG ID и показ подтверждения
  async processMasterTgId(ctx, text) {
    try {
      // Валидация TG ID (должен быть числом)
      const tgId = parseInt(text);
      if (isNaN(tgId)) {
        ctx.reply('❌ Telegram ID должен быть числом. Введите Telegram ID мастера:');
        return;
      }

      // Сохраняем TG ID
      ctx.session.addingMaster.tg_id = tgId.toString();
      ctx.session.addingMaster.status_work = 'работает'; // По умолчанию работает
      ctx.session.addingMaster.date_create = new Date();

      // Показываем подтверждение
      await this.showMasterConfirmation(ctx);
    } catch (error) {
      console.error('Ошибка при обработке TG ID мастера:', error);
      ctx.reply('Ошибка при обработке TG ID мастера');
    }
  }

  // Показать подтверждение добавления мастера
  async showMasterConfirmation(ctx) {
    const data = ctx.session.addingMaster;
    
    let message = `👨‍🔧 *Новый мастер*\n\n`;
    message += `📝 *Имя:* ${data.name}\n`;
    message += `🏙️ *Города:* ${data.cities.join(', ')}\n`;
    message += `💬 *Chat ID:* \`${data.chat_id}\`\n`;
    message += `🆔 *Telegram ID:* \`${data.tg_id}\`\n`;
    message += `📊 *Статус:* ${data.status_work}\n`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('✅ Добавить мастера', `confirm_add_master_${ctx.from.id}`)],
      [Markup.button.callback('❌ Отменить', `cancel_add_master_${ctx.from.id}`)]
    ]);

    ctx.reply(message, {
      parse_mode: 'Markdown',
      ...keyboard
    });
  }

  // Подтверждение добавления мастера
  async confirmAddMaster(ctx) {
    try {
      const data = ctx.session.addingMaster;
      
      // Добавляем мастера в БД
      await db.getClient().query(`
        INSERT INTO master (name, cities, chat_id, tg_id, status_work, date_create, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `, [
        data.name,
        data.cities,
        data.chat_id,
        data.tg_id,
        data.status_work,
        data.date_create
      ]);

      // Редактируем сообщение с подтверждением
      let message = `👨‍🔧 *Новый мастер*\n\n`;
      message += `📝 *Имя:* ${data.name}\n`;
      message += `🏙️ *Города:* ${data.cities.join(', ')}\n`;
      message += `💬 *Chat ID:* \`${data.chat_id}\`\n`;
      message += `🆔 *Telegram ID:* \`${data.tg_id}\`\n`;
      message += `📊 *Статус:* ${data.status_work}\n\n`;
      message += `✅ *Мастер добавлен*`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown'
      });
      
      // Очищаем сессию
      delete ctx.session.addingMaster;
      delete ctx.session.addingStep;
    } catch (error) {
      console.error('Ошибка при добавлении мастера:', error);
      ctx.reply('Ошибка при добавлении мастера');
    }
  }

  // Отмена добавления мастера
  async cancelAddMaster(ctx) {
    try {
      // Редактируем сообщение с отменой
      await ctx.editMessageText('❌ Добавление мастера отменено');
      
      // Очищаем сессию
      delete ctx.session.addingMaster;
      delete ctx.session.addingStep;
    } catch (error) {
      console.error('Ошибка при отмене добавления мастера:', error);
      ctx.reply('❌ Добавление мастера отменено');
    }
  }

  // Изменить статус мастера
  async changeMasterStatus(ctx, masterId) {
    try {
      // Создаем кнопки со статусами
      const statusButtons = [
        [Markup.button.callback('✅ Работает', `set_master_status_${masterId}_работает`)],
        [Markup.button.callback('❌ Уволен', `set_master_status_${masterId}_уволен`)]
      ];

      const keyboard = Markup.inlineKeyboard(statusButtons);

      ctx.reply('📊 Выберите новый статус мастера:', keyboard);
    } catch (error) {
      console.error('Ошибка при смене статуса мастера:', error);
      ctx.reply('Ошибка при смене статуса мастера');
    }
  }

  // Изменить TG ID мастера
  async changeMasterTgId(ctx, masterId) {
    // Сохраняем состояние для ввода TG ID
    ctx.session = ctx.session || {};
    ctx.session.editingMaster = {
      id: masterId,
      field: 'tg_id'
    };
    ctx.session.editingStep = 'tg_id';
    
    ctx.reply('🆔 Введите новый Telegram ID мастера:');
  }

  // Изменить Chat ID мастера
  async changeMasterChatId(ctx, masterId) {
    // Сохраняем состояние для ввода Chat ID
    ctx.session = ctx.session || {};
    ctx.session.editingMaster = {
      id: masterId,
      field: 'chat_id'
    };
    ctx.session.editingStep = 'chat_id';
    
    ctx.reply('💬 Введите новый Chat ID мастера:');
  }

  // Установить статус мастера
  async setMasterStatus(ctx, masterId, status) {
    try {
      await db.getClient().query(`
        UPDATE master SET status_work = $1 WHERE id = $2
      `, [status, masterId]);

      ctx.reply(`✅ Статус мастера изменен на "${status}"`);
    } catch (error) {
      console.error('Ошибка при обновлении статуса мастера:', error);
      ctx.reply('Ошибка при обновлении статуса мастера');
    }
  }

  // Обработка ввода TG ID
  async processTgIdInput(ctx, text) {
    try {
      const masterId = ctx.session.editingMaster.id;
      
      // Валидация TG ID (должен быть числом)
      const tgId = parseInt(text);
      if (isNaN(tgId)) {
        ctx.reply('❌ Telegram ID должен быть числом. Попробуйте еще раз:');
        return;
      }

      // Обновляем в БД
      await db.getClient().query(`
        UPDATE master SET tg_id = $1 WHERE id = $2
      `, [tgId.toString(), masterId]);

      // Очищаем сессию
      delete ctx.session.editingMaster;
      delete ctx.session.editingStep;

      ctx.reply(`✅ Telegram ID мастера изменен на ${tgId}`);
    } catch (error) {
      console.error('Ошибка при обновлении TG ID:', error);
      ctx.reply('Ошибка при обновлении TG ID');
    }
  }

  // Обработка ввода Chat ID
  async processChatIdInput(ctx, text) {
    try {
      const masterId = ctx.session.editingMaster.id;
      
      // Валидация Chat ID (должен быть числом)
      const chatId = parseInt(text);
      if (isNaN(chatId)) {
        ctx.reply('❌ Chat ID должен быть числом. Попробуйте еще раз:');
        return;
      }

      // Обновляем в БД
      await db.getClient().query(`
        UPDATE master SET chat_id = $1 WHERE id = $2
      `, [chatId.toString(), masterId]);

      // Очищаем сессию
      delete ctx.session.editingMaster;
      delete ctx.session.editingStep;

      ctx.reply(`✅ Chat ID мастера изменен на ${chatId}`);
    } catch (error) {
      console.error('Ошибка при обновлении Chat ID:', error);
      ctx.reply('Ошибка при обновлении Chat ID');
    }
  }

  // Обработчики кнопок
  setupHandlers(bot) {
    // Сотрудники - только для директора
    bot.hears('👥 Сотрудники', AuthMiddleware.requireDirector, (ctx) => {
      ctx.reply('Раздел "Сотрудники"', employeesMenu);
    });

    bot.hears('📋 Список мастеров', (ctx) => this.getMasters(ctx));
    bot.hears('🔍 Поиск мастера', (ctx) => this.searchMaster(ctx));
    bot.hears('➕ Добавить мастера', (ctx) => this.addMaster(ctx));

    // Обработка нажатия на мастера
    bot.action(/^master_(\d+)$/, (ctx) => {
      const masterId = ctx.match[1];
      this.showMasterDetails(ctx, masterId);
    });

    // Обработка изменения статуса мастера
    bot.action(/^change_master_status_(\d+)$/, (ctx) => {
      const masterId = ctx.match[1];
      this.changeMasterStatus(ctx, masterId);
    });

    // Обработка изменения TG ID мастера
    bot.action(/^change_master_tgid_(\d+)$/, (ctx) => {
      const masterId = ctx.match[1];
      this.changeMasterTgId(ctx, masterId);
    });

    // Обработка изменения Chat ID мастера
    bot.action(/^change_master_chatid_(\d+)$/, (ctx) => {
      const masterId = ctx.match[1];
      this.changeMasterChatId(ctx, masterId);
    });

    // Обработка установки статуса мастера
    bot.action(/^set_master_status_(\d+)_(.+)$/, (ctx) => {
      const masterId = ctx.match[1];
      const status = ctx.match[2];
      this.setMasterStatus(ctx, masterId, status);
    });

    // Обработка текстовых сообщений для ввода TG ID, Chat ID и добавления мастера
    bot.on('text', async (ctx, next) => {
      if (ctx.session && ctx.session.editingStep) {
        switch (ctx.session.editingStep) {
          case 'tg_id':
            await this.processTgIdInput(ctx, ctx.message.text);
            break;
          case 'chat_id':
            await this.processChatIdInput(ctx, ctx.message.text);
            break;
          default:
            next();
        }
      } else if (ctx.session && ctx.session.addingStep) {
        switch (ctx.session.addingStep) {
          case 'name':
            await this.processMasterName(ctx, ctx.message.text);
            break;
          case 'cities':
            await this.processMasterCities(ctx, ctx.message.text);
            break;
          case 'chat_id':
            await this.processMasterChatId(ctx, ctx.message.text);
            break;
          case 'tg_id':
            await this.processMasterTgId(ctx, ctx.message.text);
            break;
          default:
            next();
        }
      } else if (ctx.session && ctx.session.searchStep) {
        switch (ctx.session.searchStep) {
          case 'name':
            await this.processMasterSearch(ctx, ctx.message.text);
            break;
          default:
            next();
        }
      } else {
        next();
      }
    });

    // Обработка кнопок добавления мастера
    bot.action(/^confirm_add_master_(\d+)$/, (ctx) => {
      this.confirmAddMaster(ctx);
    });

    bot.action(/^cancel_add_master_(\d+)$/, (ctx) => {
      this.cancelAddMaster(ctx);
    });
  }
}

module.exports = new EmployeesHandler();
