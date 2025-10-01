const db = require('../../config/database');

class CityReportHandler {
  // Отчет по городу за день
  async getReportForDay(ctx) {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      await this.generateReport(ctx, startOfDay, endOfDay, 'За день');
    } catch (error) {
      console.error('Ошибка при получении отчета по городу за день:', error);
      ctx.reply('Ошибка при получении отчета');
    }
  }

  // Отчет по городу за неделю
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
      console.error('Ошибка при получении отчета по городу за неделю:', error);
      ctx.reply('Ошибка при получении отчета');
    }
  }

  // Отчет по городу за месяц
  async getReportForMonth(ctx) {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

      await this.generateReport(ctx, startOfMonth, endOfMonth, 'За месяц');
    } catch (error) {
      console.error('Ошибка при получении отчета по городу за месяц:', error);
      ctx.reply('Ошибка при получении отчета');
    }
  }

  // Генерация отчета по городу
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

      // Получаем статистику по городам директора
      const query = `
        SELECT 
          city,
          -- Всего заказов и модернизация по date_meeting
          COUNT(CASE WHEN date_meeting >= $1 AND date_meeting < $2 THEN 1 END) as total_orders,
          COUNT(CASE WHEN date_meeting >= $1 AND date_meeting < $2 AND status_order = 'Модерн' THEN 1 END) as modern_orders,
          -- Выполненные, отказные, незаказы по closing_data
          COUNT(CASE WHEN closing_data >= $1 AND closing_data < $2 AND status_order = 'Готово' THEN 1 END) as completed_orders,
          COUNT(CASE WHEN closing_data >= $1 AND closing_data < $2 AND status_order IN ('Отказ', 'Незаказ') THEN 1 END) as rejected_orders,
          -- Оборот по closing_data
          COALESCE(SUM(CASE WHEN closing_data >= $1 AND closing_data < $2 AND status_order = 'Готово' THEN clean ELSE 0 END), 0) as total_clean
        FROM orders 
        WHERE city = ANY($3)
        GROUP BY city
        ORDER BY city ASC
      `;
      
      console.log(`🔍 Параметры запроса:`, {
        startDate: startDate,
        endDate: endDate,
        directorCities: directorCities
      });

      const result = await db.getClient().query(query, [startDate, endDate, directorCities]);
      const cityStats = result.rows;

      console.log(`🔍 Результат запроса:`, cityStats);

      if (cityStats.length === 0) {
        // Проверим, есть ли вообще заказы в базе за этот период
        const checkQuery = `
          SELECT 
            COUNT(CASE WHEN date_meeting >= $1 AND date_meeting < $2 THEN 1 END) as total_by_meeting,
            COUNT(CASE WHEN closing_data >= $1 AND closing_data < $2 THEN 1 END) as total_by_closing,
            array_agg(DISTINCT city) as cities_in_db
          FROM orders 
        `;
        const checkResult = await db.getClient().query(checkQuery, [startDate, endDate]);
        const checkData = checkResult.rows[0];
        
        console.log(`🔍 Проверка заказов в БД:`, checkData);
        
        ctx.reply(`🏙️ *Отчет по городу - ${period}*\n\nЗаказов за выбранный период не найдено\n\nПроверка:\n- Заказов по дате встречи: ${checkData.total_by_meeting}\n- Заказов по дате закрытия: ${checkData.total_by_closing}\n- Города в БД: ${checkData.cities_in_db.join(', ')}\n- Ваши города: ${directorCities.join(', ')}`, {
          parse_mode: 'Markdown'
        });
        return;
      }

      // Создаем текстовое сообщение с отчетом
      let message = `🏙️ *Отчет по городу - ${period}*\n\n`;
      message += `${startDate.toLocaleDateString('ru-RU')}\n\n`;

      cityStats.forEach(city => {
        const totalOrders = parseInt(city.total_orders);
        const completedOrders = parseInt(city.completed_orders);
        const rejectedOrders = parseInt(city.rejected_orders);
        const modernOrders = parseInt(city.modern_orders);
        const totalClean = parseFloat(city.total_clean);
        
        // Средний чек = сумма чистыми / количество заказов со статусом Готово/Отказ
        const ordersForAverage = completedOrders + rejectedOrders;
        const averageCheck = ordersForAverage > 0 ? (totalClean / ordersForAverage).toFixed(2) : '0.00';

        message += `*${city.city}:*\n\n`;
        message += `Всего заказов: ${totalOrders}\n`;
        message += `Выполненых заказов: ${completedOrders}\n`;
        message += `Отказных заказов: ${rejectedOrders}\n`;
        message += `Заказы в модернизации: ${modernOrders}\n\n`;
        message += `Оборот: ${totalClean} ₽\n`;
        message += `Средний чек: ${averageCheck} ₽\n\n`;
        message += `----------------------------------------\n\n`;
      });

      // Отправляем текстовое сообщение
      ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Ошибка при генерации отчета по городу:', error);
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
    ctx.session.cityReportCustomDate = true;
    
    ctx.reply('📅 *Выбор даты для отчета по городу*\n\nВведите дату в формате ДД.ММ.ГГГГ (например: 25.12.2024):', {
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
      delete ctx.session.cityReportCustomDate;
    } catch (error) {
      console.error('Ошибка при обработке пользовательской даты для отчета по городу:', error);
      ctx.reply('❌ Ошибка при обработке даты');
    }
  }

  setupHandlers(bot) {
    // Обработчики кнопок для отчета по городу
    bot.action('city_report_day', (ctx) => this.getReportForDay(ctx));
    bot.action('city_report_week', (ctx) => this.getReportForWeek(ctx));
    bot.action('city_report_month', (ctx) => this.getReportForMonth(ctx));
    bot.action('city_report_custom', (ctx) => this.requestCustomDate(ctx));
  }
}

module.exports = new CityReportHandler();
