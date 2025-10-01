const db = require('../../config/database');
const { Markup } = require('telegraf');

class IncomeHandler {
  // Добавление прихода - шаг 1: получение информации директора и выбор города
  async addIncome(ctx) {
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
        ctx.session.incomeData = { 
          city: directorInfo.cities[0],
          director: directorInfo.name
        };
        ctx.session.incomeStep = 'amount';
        ctx.reply('💰 Введите сумму прихода:');
        return;
      }

      // Если несколько городов, показываем список для выбора
      ctx.session.incomeData = { 
        director: directorInfo.name,
        cities: directorInfo.cities
      };
      ctx.session.incomeStep = 'city_selection';
      
      await this.showCitySelection(ctx);
    } catch (error) {
      console.error('Ошибка при получении информации директора:', error);
      ctx.reply('Ошибка при получении данных директора');
    }
  }

  // Показать выбор города
  async showCitySelection(ctx) {
    const cities = ctx.session.incomeData.cities;
    
    let message = `🏙️ *Выберите город для прихода:*\n\n`;
    
    const buttons = cities.map((city, index) => {
      return Markup.button.callback(
        `🏙️ ${city}`,
        `select_city_income_${index}`
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
      // Проверяем, что сессия и данные существуют
      if (!ctx.session || !ctx.session.incomeData || !ctx.session.incomeData.cities) {
        ctx.reply('❌ Сессия истекла. Начните заново.');
        return;
      }

      const selectedCity = ctx.session.incomeData.cities[cityIndex];
      
      // Сохраняем выбранный город
      ctx.session.incomeData.city = selectedCity;
      ctx.session.incomeStep = 'amount';
      
      ctx.reply(`💰 Введите сумму прихода (Город: ${selectedCity}):`);
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
      ctx.session.incomeData.amount = amount;
      ctx.session.incomeStep = 'note';
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
      ctx.session.incomeData.note = text.trim();
      
      // Форматируем дату в нужном формате
      const now = new Date();
      const day = now.getDate().toString().padStart(2, '0');
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      
      ctx.session.incomeData.date = `${day}.${month}.${year} ${hours}:${minutes}`;

      // Показываем подтверждение
      await this.showConfirmation(ctx);
    } catch (error) {
      console.error('Ошибка при обработке примечания:', error);
      ctx.reply('Ошибка при обработке примечания');
    }
  }

  // Показать подтверждение
  async showConfirmation(ctx) {
    const data = ctx.session.incomeData;
    
    let message = `📋 *Запись Прихода*\n\n`;
    message += `🏙️ *Город:* ${data.city}\n`;
    message += `💰 *Сумма:* ${data.amount} ₽\n`;
    message += `📝 *Примечание:* ${data.note}\n`;
    message += `👤 *Директор:* ${data.director}\n`;
    message += `📅 *Дата:* ${data.date}`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('✅ Подтвердить', `confirm_income_${ctx.from.id}`)],
      [Markup.button.callback('❌ Отменить', `cancel_income_${ctx.from.id}`)]
    ]);

    ctx.reply(message, {
      parse_mode: 'Markdown',
      ...keyboard
    });
  }

  // Подтверждение прихода
  async confirmIncome(ctx) {
    try {
      const data = ctx.session.incomeData;
      
      // Добавляем приход в БД
      await db.addCashOperation('приход', data.amount, data.city, data.note, data.director);
      
      // Редактируем сообщение с подтверждением
      let message = `📋 *Запись Прихода*\n\n`;
      message += `🏙️ *Город:* ${data.city}\n`;
      message += `💰 *Сумма:* ${data.amount} ₽\n`;
      message += `📝 *Примечание:* ${data.note}\n`;
      message += `👤 *Директор:* ${data.director}\n`;
      message += `📅 *Дата:* ${data.date}\n\n`;
      message += `✅ *Приход подтвержден*`;

      // Редактируем сообщение, убирая кнопки
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown'
      });
      
      // Очищаем сессию
      delete ctx.session.incomeData;
      delete ctx.session.incomeStep;
    } catch (error) {
      console.error('Ошибка при подтверждении прихода:', error);
      ctx.reply('Ошибка при подтверждении прихода');
    }
  }

  // Отмена прихода
  async cancelIncome(ctx) {
    try {
      // Редактируем сообщение с отменой
      await ctx.editMessageText('❌ Приход отменен');
      
      // Очищаем сессию
      delete ctx.session.incomeData;
      delete ctx.session.incomeStep;
    } catch (error) {
      console.error('Ошибка при отмене прихода:', error);
      ctx.reply('❌ Приход отменен');
    }
  }

  setupHandlers(bot) {
    bot.hears('➕ Приход', (ctx) => this.addIncome(ctx));

    // Обработка текстовых сообщений для пошагового ввода
    bot.on('text', async (ctx, next) => {
      if (ctx.session && ctx.session.incomeStep) {
        switch (ctx.session.incomeStep) {
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
    bot.action(/^select_city_income_(\d+)$/, (ctx) => {
      const cityIndex = parseInt(ctx.match[1]);
      this.selectCity(ctx, cityIndex);
    });

    // Обработка кнопок подтверждения
    bot.action(/^confirm_income_(\d+)$/, (ctx) => {
      this.confirmIncome(ctx);
    });

    bot.action(/^cancel_income_(\d+)$/, (ctx) => {
      this.cancelIncome(ctx);
    });
  }
}

module.exports = new IncomeHandler();
