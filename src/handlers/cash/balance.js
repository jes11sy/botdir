const db = require('../../config/database');

class BalanceHandler {
  // Получение баланса кассы по городам директора
  async getBalance(ctx) {
    try {
      // Получаем информацию директора
      const directorInfo = await db.getDirectorInfo(ctx.from.id.toString());
      
      if (!directorInfo) {
        ctx.reply('❌ Ваш профиль не найден в базе данных. Обратитесь к администратору.');
        return;
      }

      if (!directorInfo.cities || directorInfo.cities.length === 0) {
        ctx.reply('❌ У вас не указаны города в профиле. Обратитесь к администратору.');
        return;
      }

      let message = `💰 *Баланс кассы*\n\n`;

      // Получаем баланс для каждого города директора
      for (const city of directorInfo.cities) {
        const cityBalance = await db.getCashBalanceByCity(city);
        const balance = cityBalance.income - cityBalance.expense;
        
        message += `🏙️ *${city}:* ${balance} ₽\n`;
      }

      ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Ошибка при получении баланса:', error);
      ctx.reply('Ошибка при получении баланса');
    }
  }

  setupHandlers(bot) {
    bot.hears('💰 Баланс', (ctx) => this.getBalance(ctx));
  }
}

module.exports = new BalanceHandler();
