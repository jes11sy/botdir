const { reportsMenu } = require('../keyboards/menus');
const { Markup } = require('telegraf');
const AuthMiddleware = require('../middleware/auth');

// Импорт подмодулей
const cityReportHandler = require('./reports/city');
const mastersReportHandler = require('./reports/masters');

class ReportsHandler {
  // Показать меню выбора периода для отчета по городу
  async showCityReportMenu(ctx) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📅 За день', 'city_report_day')],
      [Markup.button.callback('📆 За неделю', 'city_report_week')],
      [Markup.button.callback('📊 За месяц', 'city_report_month')],
      [Markup.button.callback('🗓️ Выбрать дату', 'city_report_custom')]
    ]);

    ctx.reply('🏙️ *Отчет по городу*\n\nВыберите период для отчета:', {
      parse_mode: 'Markdown',
      ...keyboard
    });
  }

  // Показать меню выбора периода для отчета по мастерам
  async showMastersReportMenu(ctx) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📅 За день', 'masters_report_day')],
      [Markup.button.callback('📆 За неделю', 'masters_report_week')],
      [Markup.button.callback('📊 За месяц', 'masters_report_month')],
      [Markup.button.callback('🗓️ Выбрать дату', 'masters_report_custom')]
    ]);

    ctx.reply('🔧 *Отчет по мастерам*\n\nВыберите период для отчета:', {
      parse_mode: 'Markdown',
      ...keyboard
    });
  }

  // Обработчики кнопок
  setupHandlers(bot) {
    // Отчеты - только для директора
    bot.hears('📊 Отчеты', AuthMiddleware.requireDirector, (ctx) => {
      ctx.reply('Раздел "Отчеты"', reportsMenu);
    });

    bot.hears('🏙️ Отчет по городу', AuthMiddleware.requireDirector, (ctx) => this.showCityReportMenu(ctx));
    bot.hears('🔧 Отчет по мастерам', AuthMiddleware.requireDirector, (ctx) => this.showMastersReportMenu(ctx));

    // Подключаем подмодули
    cityReportHandler.setupHandlers(bot);
    mastersReportHandler.setupHandlers(bot);
  }
}

module.exports = new ReportsHandler();
