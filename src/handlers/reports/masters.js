const db = require('../../config/database');

class MastersReportHandler {
  // Отчет по мастерам за день
  async getReportForDay(ctx) {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      await this.generateReport(ctx, startOfDay, endOfDay, 'За день');
    } catch (error) {
      console.error('Ошибка при получении отчета по мастерам за день:', error);
      ctx.reply('Ошибка при получении отчета');
    }
  }

  // Отчет по мастерам за неделю
  async getReportForWeek(ctx) {
    try {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      await this.generateReport(ctx, startOfWeek, endOfWeek, 'За неделю');
    } catch (error) {
      console.error('Ошибка при получении отчета по мастерам за неделю:', error);
      ctx.reply('Ошибка при получении отчета');
    }
  }

  // Отчет по мастерам за месяц
  async getReportForMonth(ctx) {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

      await this.generateReport(ctx, startOfMonth, endOfMonth, 'За месяц');
    } catch (error) {
      console.error('Ошибка при получении отчета по мастерам за месяц:', error);
      ctx.reply('Ошибка при получении отчета');
    }
  }

  // Генерация отчета по мастерам
  async generateReport(ctx, startDate, endDate, period) {
    try {
      // Получаем города директора
      const directorInfo = await db.getDirectorInfo(ctx.from.id.toString());
      if (!directorInfo || !directorInfo.cities || directorInfo.cities.length === 0) {
        ctx.reply('❌ У вас не указаны города в профиле. Обратитесь к администратору.');
        return;
      }

      const directorCities = directorInfo.cities;
      console.log(`🔍 Города директора:`, directorCities);

      // Получаем статистику по мастерам директора
      const query = `
        SELECT 
          m.name as master_name,
          m.cities,
          -- Заказы со статусом Готово/Отказ по closing_data
          COUNT(CASE WHEN o.closing_data >= $1 AND o.closing_data < $2 AND o.status_order IN ('Готово', 'Отказ', 'Незаказ') THEN 1 END) as completed_orders,
          -- Модерны по date_meeting
          COUNT(CASE WHEN o.date_meeting >= $1 AND o.date_meeting < $2 AND o.status_order = 'Модерн' THEN 1 END) as modern_orders,
          -- Оборот и зарплата по closing_data
          COALESCE(SUM(CASE WHEN o.closing_data >= $1 AND o.closing_data < $2 AND o.status_order = 'Готово' THEN o.clean ELSE 0 END), 0) as total_clean,
          COALESCE(SUM(CASE WHEN o.closing_data >= $1 AND o.closing_data < $2 AND o.status_order = 'Готово' THEN o.master_change ELSE 0 END), 0) as total_master_change
        FROM master m
        LEFT JOIN orders o ON m.id = o.master_id 
          AND o.city = ANY($3)
        WHERE m.status_work = 'работает'
        AND m.cities && $3
        GROUP BY m.id, m.name, m.cities
        HAVING COUNT(CASE WHEN o.closing_data >= $1 AND o.closing_data < $2 AND o.status_order IN ('Готово', 'Отказ', 'Незаказ') THEN 1 END) > 0
        ORDER BY m.name ASC
      `;
      
      const result = await db.getClient().query(query, [startDate, endDate, directorCities]);
      const mastersStats = result.rows;

      if (mastersStats.length === 0) {
        ctx.reply(`🔧 *Отчет по мастерам - ${period}*\n\nЗаказов за выбранный период не найдено`, {
          parse_mode: 'Markdown'
        });
        return;
      }

      // Создаем текстовое сообщение с отчетом
      let message = `🔧 *Отчет по мастерам - ${period}*\n\n`;
      message += `${startDate.toLocaleDateString('ru-RU')}\n\n`;

      // Группируем мастеров по городам
      const mastersByCity = {};
      mastersStats.forEach(master => {
        const masterCities = Array.isArray(master.cities) ? master.cities : [master.cities];
        const commonCities = masterCities.filter(city => directorCities.includes(city));
        
        commonCities.forEach(city => {
          if (!mastersByCity[city]) {
            mastersByCity[city] = [];
          }
          mastersByCity[city].push(master);
        });
      });

      // Выводим отчет по городам в компактном формате
      Object.keys(mastersByCity).sort().forEach(city => {
        message += `🏙️ *${city}*\n\n`;
        message += `ФИО | Заказы | Модерны | Оборот | Ср.чек | Зарплата\n`;
        message += `------------------------------------------------\n`;
        
        mastersByCity[city].forEach(master => {
          const completedOrders = parseInt(master.completed_orders);
          const modernOrders = parseInt(master.modern_orders);
          const totalClean = parseFloat(master.total_clean);
          const totalMasterChange = parseFloat(master.total_master_change);
          
          // Средний чек = оборот / количество заказов со статусом Готово/Отказ
          const averageCheck = completedOrders > 0 ? (totalClean / completedOrders).toFixed(0) : '0';

          message += `${master.master_name} | ${completedOrders} | ${modernOrders} | ${totalClean} ₽ | ${averageCheck} ₽ | ${totalMasterChange} ₽\n`;
        });
        
        message += `\n`;
      });

      // Отправляем текстовое сообщение
      ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Ошибка при генерации отчета по мастерам:', error);
      ctx.reply('Ошибка при генерации отчета');
    }
  }

  // Отправка файла отчета
  async sendReportFile(ctx, content, fileName, caption) {
    try {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '..', '..', '..', 'temp', fileName);
      
      // Создаем папку temp если её нет
      const tempDir = path.dirname(filePath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Записываем файл
      fs.writeFileSync(filePath, content, 'utf8');
      
      // Отправляем файл
      await ctx.replyWithDocument({
        source: filePath,
        filename: fileName
      }, {
        caption: `📊 *${caption}*\n\n📁 Файл содержит детальную статистику за выбранный период`,
        parse_mode: 'Markdown'
      });
      
      // Удаляем временный файл
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error('Ошибка при отправке файла отчета:', error);
      ctx.reply('❌ Ошибка при создании файла отчета');
    }
  }

  // Запрос пользовательской даты
  async requestCustomDate(ctx) {
    ctx.session = ctx.session || {};
    ctx.session.mastersReportCustomDate = true;
    
    ctx.reply('📅 *Выбор даты для отчета по мастерам*\n\nВведите дату в формате ДД.ММ.ГГГГ (например: 25.12.2024):', {
      parse_mode: 'Markdown'
    });
  }

  // Обработка пользовательской даты
  async processCustomDate(ctx, dateText) {
    try {
      const dateParts = dateText.split('.');
      if (dateParts.length !== 3) {
        ctx.reply('❌ Неверный формат даты. Используйте ДД.ММ.ГГГГ (например: 25.12.2024)');
        return;
      }

      const day = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1;
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

      await this.generateReport(ctx, startOfDay, endOfDay, `За ${dateText}`);

      // Очищаем сессию
      delete ctx.session.mastersReportCustomDate;
    } catch (error) {
      console.error('Ошибка при обработке пользовательской даты для отчета по мастерам:', error);
      ctx.reply('❌ Ошибка при обработке даты');
    }
  }

  setupHandlers(bot) {
    // Обработчики кнопок для отчета по мастерам
    bot.action('masters_report_day', (ctx) => this.getReportForDay(ctx));
    bot.action('masters_report_week', (ctx) => this.getReportForWeek(ctx));
    bot.action('masters_report_month', (ctx) => this.getReportForMonth(ctx));
    bot.action('masters_report_custom', (ctx) => this.requestCustomDate(ctx));
  }
}

module.exports = new MastersReportHandler();
