const db = require('../../config/database');
const { Markup } = require('telegraf');

class HistoryHandler {
  // Показать меню выбора периода
  async showHistoryMenu(ctx) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📅 За день', 'history_day')],
      [Markup.button.callback('📆 За неделю', 'history_week')],
      [Markup.button.callback('📊 За месяц', 'history_month')],
      [Markup.button.callback('🗓️ Выбрать дату', 'history_custom')]
    ]);

    ctx.reply('📊 *История кассы*\n\nВыберите период для просмотра:', {
      parse_mode: 'Markdown',
      ...keyboard
    });
  }

  // История кассы за день
  async getHistoryForDay(ctx) {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const history = await this.getHistoryByDateRange(startOfDay, endOfDay);
      await this.showHistoryResults(ctx, history, 'За день');
    } catch (error) {
      console.error('Ошибка при получении истории за день:', error);
      ctx.reply('Ошибка при получении истории');
    }
  }

  // История кассы за неделю
  async getHistoryForWeek(ctx) {
    try {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Понедельник
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      const history = await this.getHistoryByDateRange(startOfWeek, endOfWeek);
      await this.showHistoryResults(ctx, history, 'За неделю');
    } catch (error) {
      console.error('Ошибка при получении истории за неделю:', error);
      ctx.reply('Ошибка при получении истории');
    }
  }

  // История кассы за месяц
  async getHistoryForMonth(ctx) {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

      const history = await this.getHistoryByDateRange(startOfMonth, endOfMonth);
      await this.showHistoryResults(ctx, history, 'За месяц');
    } catch (error) {
      console.error('Ошибка при получении истории за месяц:', error);
      ctx.reply('Ошибка при получении истории');
    }
  }

  // Получение истории по диапазону дат
  async getHistoryByDateRange(startDate, endDate) {
    const query = `
      SELECT * FROM cash
      WHERE date_create >= $1 AND date_create < $2
      ORDER BY date_create DESC
      LIMIT 50
    `;
    const result = await db.getClient().query(query, [startDate, endDate]);
    return result.rows;
  }

  // Показать результаты истории
  async showHistoryResults(ctx, history, period) {
    if (history.length === 0) {
      ctx.reply(`📊 *История кассы - ${period}*\n\nОпераций за выбранный период не найдено`, {
        parse_mode: 'Markdown'
      });
      return;
    }

    // Создаем текстовый файл с данными
    let fileContent = `История кассы - ${period}\n`;
    fileContent += `Период: ${new Date().toLocaleDateString('ru-RU')}\n\n`;
    
    // Подсчитываем общие суммы
    let totalIncome = 0;
    let totalExpense = 0;
    
    history.forEach((record) => {
      if (record.name === 'приход') {
        totalIncome += parseFloat(record.amount);
      } else {
        totalExpense += parseFloat(record.amount);
      }
    });

    fileContent += `Итого приход: +${totalIncome} ₽\n`;
    fileContent += `Итого расход: -${totalExpense} ₽\n`;
    fileContent += `Баланс: ${totalIncome - totalExpense} ₽\n\n`;

    // Добавляем операции в файл (Город, Дата, Тип, Назначение, Сумма, Заметка, Кто создал)
    fileContent += `Город\t\tДата\t\t\tТип\t\tНазначение\t\tСумма\t\tЗаметка\t\t\tКто создал\n`;
    fileContent += `================================================================================\n`;
    
    history.forEach((record) => {
      const date = new Date(record.date_create);
      const dateStr = date.toLocaleDateString('ru-RU');
      const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      const fullDateTime = `${dateStr} ${timeStr}`;
      const type = record.name === 'приход' ? 'приход' : 'расход';
      const amount = record.name === 'приход' ? `+${record.amount}` : `-${record.amount}`;
      
      // Обрабатываем заметку - убираем лишний текст для заказов
      let note = record.note || 'Нет заметки';
      if (note.includes('БТ - Итог по заказу:')) {
        note = 'Закрытие заказа';
      }
      
      const city = record.city || '-';
      const paymentPurpose = record.payment_purpose || '-';
      
      const createdBy = record.name_create || '-';

      fileContent += `${city}\t\t${fullDateTime}\t${type}\t\t${paymentPurpose}\t\t${amount} ₽\t\t${note}\t\t${createdBy}\n`;
    });

    // Создаем временный файл
    const fs = require('fs');
    const path = require('path');
    const fileName = `history_${period.replace(/\s+/g, '_')}_${Date.now()}.txt`;
    const filePath = path.join(__dirname, '..', '..', 'temp', fileName);
    
    // Создаем папку temp если её нет
    const tempDir = path.dirname(filePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Записываем файл
    fs.writeFileSync(filePath, fileContent, 'utf8');
    
    // Отправляем файл
    try {
      await ctx.replyWithDocument({
        source: filePath,
        filename: fileName
      }, {
        caption: `📊 *История кассы - ${period}*\n\n📁 Файл содержит все операции за выбранный период`,
        parse_mode: 'Markdown'
      });
      
      // Удаляем временный файл
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error('Ошибка при отправке файла:', error);
      ctx.reply('❌ Ошибка при создании файла истории');
    }
  }

  setupHandlers(bot) {
    bot.hears('📊 История', (ctx) => this.showHistoryMenu(ctx));
    
    // Обработчики кнопок
    bot.action('history_day', (ctx) => this.getHistoryForDay(ctx));
    bot.action('history_week', (ctx) => this.getHistoryForWeek(ctx));
    bot.action('history_month', (ctx) => this.getHistoryForMonth(ctx));
    bot.action('history_custom', (ctx) => this.requestCustomDate(ctx));
  }

  // Запрос пользовательской даты
  async requestCustomDate(ctx) {
    ctx.session = ctx.session || {};
    ctx.session.historyCustomDate = true;
    
    ctx.reply('📅 *Выбор даты*\n\nВведите дату в формате ДД.ММ.ГГГГ (например: 25.12.2024):', {
      parse_mode: 'Markdown'
    });
  }

  // Обработка пользовательской даты
  async processCustomDate(ctx, dateText) {
    try {
      // Парсим дату в формате ДД.ММ.ГГГГ
      const dateParts = dateText.split('.');
      if (dateParts.length !== 3) {
        ctx.reply('❌ Неверный формат даты. Используйте ДД.ММ.ГГГГ (например: 25.12.2024)');
        return;
      }

      const day = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // Месяцы в JS начинаются с 0
      const year = parseInt(dateParts[2]);

      if (isNaN(day) || isNaN(month) || isNaN(year)) {
        ctx.reply('❌ Неверный формат даты. Используйте ДД.ММ.ГГГГ (например: 25.12.2024)');
        return;
      }

      const selectedDate = new Date(year, month, day);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const history = await this.getHistoryByDateRange(startOfDay, endOfDay);
      await this.showHistoryResults(ctx, history, `За ${dateText}`);

      // Очищаем сессию
      delete ctx.session.historyCustomDate;
    } catch (error) {
      console.error('Ошибка при обработке пользовательской даты:', error);
      ctx.reply('❌ Ошибка при обработке даты');
    }
  }
}

module.exports = new HistoryHandler();
