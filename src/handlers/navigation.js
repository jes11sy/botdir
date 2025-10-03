const { mainMenu, masterMenu } = require('../keyboards/menus');
const AuthMiddleware = require('../middleware/auth');

class NavigationHandler {
  // Обработчики кнопок навигации
  setupHandlers(bot) {
    // Команда /start
    bot.start((ctx) => {
      // Проверяем, что это личное сообщение (не группа/канал)
      if (ctx.chat.type !== 'private') {
        return; // Не отвечаем в групповых чатах
      }

      // Проверяем роль пользователя и показываем соответствующее меню
      if (ctx.session.userRole === 'director') {
        ctx.reply('Добро пожаловать, директор! Выберите раздел:', mainMenu);
      } else if (ctx.session.userRole === 'master') {
        ctx.reply('Добро пожаловать, мастер! Выберите раздел:', masterMenu);
      } else {
        ctx.reply('❌ Доступ закрыт');
      }
    });

    // Команда /id - показать Chat ID
    bot.command('id', (ctx) => {
      const chatId = ctx.chat.id;
      const chatType = ctx.chat.type;
      const userId = ctx.from.id;
      const username = ctx.from.username;
      
      let message = `🆔 Информация о чате:\n\n`;
      message += `📱 Chat ID: \`${chatId}\`\n`;
      message += `👤 User ID: \`${userId}\`\n`;
      message += `💬 Тип чата: ${chatType}\n`;
      
      if (username) {
        message += `🏷️ Username: @${username}\n`;
      }
      
      if (ctx.chat.title) {
        message += `📝 Название: ${ctx.chat.title}\n`;
      }
      
      ctx.reply(message, { parse_mode: 'Markdown' });
    });

    // Команда для тестирования отправки сообщений
    bot.command('test_send', async (ctx) => {
      try {
        const chatId = ctx.chat.id;
        const testMessage = `🧪 *Тестовое сообщение*\n\nChat ID: \`${chatId}\`\nВремя: ${new Date().toLocaleString('ru-RU')}`;
        
        await ctx.telegram.sendMessage(chatId, testMessage, {
          parse_mode: 'Markdown'
        });
        
        ctx.reply('✅ Тестовое сообщение отправлено');
      } catch (error) {
        console.error('Ошибка при тестировании отправки:', error);
        ctx.reply(`❌ Ошибка: ${error.message}`);
      }
    });

    // Кнопка "Назад" для всех разделов
    bot.hears('⬅️ Назад', (ctx) => {
      // Проверяем, что это личное сообщение (не группа/канал)
      if (ctx.chat.type !== 'private') {
        return; // Не отвечаем в групповых чатах
      }

      if (ctx.session.userRole === 'director') {
        ctx.reply('Главное меню:', mainMenu);
      } else if (ctx.session.userRole === 'master') {
        ctx.reply('Главное меню:', masterMenu);
      } else {
        ctx.reply('❌ Доступ закрыт');
      }
    });
  }
}

module.exports = new NavigationHandler();
