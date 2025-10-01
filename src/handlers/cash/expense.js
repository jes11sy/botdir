const db = require('../../config/database');
const { Markup } = require('telegraf');

class ExpenseHandler {
  // Добавление расхода - шаг 1: получение информации директора и выбор города
  async addExpense(ctx) {
    try {
      // Получаем полную информацию директора из БД
      const directorInfo = await db.getDirectorInfo(ctx.from.id.toString());
      
      if (!directorInfo) {
        ctx.reply('❌ Ваш профиль не найден в базе данных. Обратитесь к администратору.');
        return;
      }

      // Проверяем, есть ли города у директора
      if (!directorInfo.cities || directorInfo.cities.length === 0) {
        ctx.reply('❌ У вас не указаны города в профиле. Обратитесь к администратору.');
        return;
      }

      // Если только один город, сразу переходим к вводу суммы
      if (directorInfo.cities.length === 1) {
        ctx.session = ctx.session || {};
        ctx.session.expenseData = { 
          city: directorInfo.cities[0],
          director: directorInfo.name
        };
        ctx.session.expenseStep = 'amount';
        ctx.reply('💸 Введите сумму расхода:');
        return;
      }

      // Если несколько городов, показываем список для выбора
      ctx.session.expenseData = { 
        director: directorInfo.name,
        cities: directorInfo.cities
      };
      ctx.session.expenseStep = 'city_selection';
      
      console.log('🔍 Debug addExpense - session created:', {
        hasSession: !!ctx.session,
        hasExpenseData: !!(ctx.session && ctx.session.expenseData),
        cities: ctx.session.expenseData.cities
      });
      
      await this.showCitySelection(ctx);
    } catch (error) {
      console.error('Ошибка при получении информации директора:', error);
      ctx.reply('Ошибка при получении данных директора');
    }
  }

  // Показать выбор города
  async showCitySelection(ctx) {
    const cities = ctx.session.expenseData.cities;
    
    let message = `🏙️ *Выберите город для расхода:*\n\n`;
    
    const buttons = cities.map((city, index) => {
      return Markup.button.callback(
        `🏙️ ${city}`,
        `select_city_expense_${index}`
      );
    });

    const keyboard = Markup.inlineKeyboard(buttons, { columns: 1 });

    ctx.reply(message, {
      parse_mode: 'Markdown',
      ...keyboard
    });
  }

  // Обработка выбора города
  async selectCity(ctx, cityIndex) {
    try {
      console.log('🔍 Debug selectCity:', {
        hasSession: !!ctx.session,
        hasExpenseData: !!(ctx.session && ctx.session.expenseData),
        hasCities: !!(ctx.session && ctx.session.expenseData && ctx.session.expenseData.cities),
        cityIndex: cityIndex
      });

      // Проверяем, что сессия и данные существуют
      if (!ctx.session || !ctx.session.expenseData || !ctx.session.expenseData.cities) {
        ctx.reply('❌ Сессия истекла. Начните заново.');
        return;
      }

      const selectedCity = ctx.session.expenseData.cities[cityIndex];
      
      // Сохраняем выбранный город
      ctx.session.expenseData.city = selectedCity;
      ctx.session.expenseStep = 'amount';
      
      ctx.reply(`💸 Введите сумму расхода (Город: ${selectedCity}):`);
    } catch (error) {
      console.error('Ошибка при выборе города:', error);
      ctx.reply('Ошибка при выборе города');
    }
  }

  // Обработка ввода суммы
  async processAmount(ctx, text) {
    try {
      const amount = parseFloat(text);

      if (isNaN(amount) || amount <= 0) {
        ctx.reply('❌ Неверная сумма. Введите корректное число:');
        return;
      }

      // Сохраняем сумму и переходим к следующему шагу
      ctx.session.expenseData.amount = amount;
      ctx.session.expenseStep = 'note';
      ctx.reply('📝 Введите примечание:');
    } catch (error) {
      console.error('Ошибка при обработке суммы:', error);
      ctx.reply('Ошибка при обработке суммы');
    }
  }


  // Обработка ввода примечания и показ подтверждения
  async processNote(ctx, text) {
    try {
      if (!text || text.trim().length === 0) {
        ctx.reply('❌ Укажите примечание:');
        return;
      }

      // Сохраняем примечание
      ctx.session.expenseData.note = text.trim();
      
      // Форматируем дату в нужном формате
      const now = new Date();
      const day = now.getDate().toString().padStart(2, '0');
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      
      ctx.session.expenseData.date = `${day}.${month}.${year} ${hours}:${minutes}`;

      // Показываем подтверждение
      await this.showConfirmation(ctx);
    } catch (error) {
      console.error('Ошибка при обработке примечания:', error);
      ctx.reply('Ошибка при обработке примечания');
    }
  }

  // Показать подтверждение
  async showConfirmation(ctx) {
    const data = ctx.session.expenseData;
    
    let message = `📋 *Запись Расхода*\n\n`;
    message += `🏙️ *Город:* ${data.city}\n`;
    message += `💰 *Сумма:* ${data.amount} ₽\n`;
    message += `📝 *Примечание:* ${data.note}\n`;
    message += `👤 *Директор:* ${data.director}\n`;
    message += `📅 *Дата:* ${data.date}`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('✅ Подтвердить', `confirm_expense_${ctx.from.id}`)],
      [Markup.button.callback('❌ Отменить', `cancel_expense_${ctx.from.id}`)]
    ]);

    ctx.reply(message, {
      parse_mode: 'Markdown',
      ...keyboard
    });
  }

  // Подтверждение расхода
  async confirmExpense(ctx) {
    try {
      const data = ctx.session.expenseData;
      
      // Добавляем расход в БД
      await db.addCashOperation('расход', data.amount, data.city, data.note, data.director);
      
      // Редактируем сообщение с подтверждением
      let message = `📋 *Запись Расхода*\n\n`;
      message += `🏙️ *Город:* ${data.city}\n`;
      message += `💰 *Сумма:* ${data.amount} ₽\n`;
      message += `📝 *Примечание:* ${data.note}\n`;
      message += `👤 *Директор:* ${data.director}\n`;
      message += `📅 *Дата:* ${data.date}\n\n`;
      message += `✅ *Расход подтвержден*`;

      // Редактируем сообщение, убирая кнопки
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown'
      });
      
      // Очищаем сессию
      delete ctx.session.expenseData;
      delete ctx.session.expenseStep;
    } catch (error) {
      console.error('Ошибка при подтверждении расхода:', error);
      ctx.reply('Ошибка при подтверждении расхода');
    }
  }

  // Отмена расхода
  async cancelExpense(ctx) {
    try {
      // Редактируем сообщение с отменой
      await ctx.editMessageText('❌ Расход отменен');
      
      // Очищаем сессию
      delete ctx.session.expenseData;
      delete ctx.session.expenseStep;
    } catch (error) {
      console.error('Ошибка при отмене расхода:', error);
      ctx.reply('❌ Расход отменен');
    }
  }

  setupHandlers(bot) {
    bot.hears('➖ Расход', (ctx) => this.addExpense(ctx));

    // Обработка текстовых сообщений для пошагового ввода
    bot.on('text', async (ctx, next) => {
      if (ctx.session && ctx.session.expenseStep) {
        switch (ctx.session.expenseStep) {
          case 'amount':
            await this.processAmount(ctx, ctx.message.text);
            break;
          case 'note':
            await this.processNote(ctx, ctx.message.text);
            break;
          default:
            next();
        }
      } else {
        next();
      }
    });

    // Обработка выбора города
    bot.action(/^select_city_expense_(\d+)$/, (ctx) => {
      const cityIndex = parseInt(ctx.match[1]);
      this.selectCity(ctx, cityIndex);
    });

    // Обработка кнопок подтверждения
    bot.action(/^confirm_expense_(\d+)$/, (ctx) => {
      this.confirmExpense(ctx);
    });

    bot.action(/^cancel_expense_(\d+)$/, (ctx) => {
      this.cancelExpense(ctx);
    });
  }
}

module.exports = new ExpenseHandler();
