const db = require('../config/database');

class AuthMiddleware {
  // Middleware для авторизации пользователя
  static async checkAuth(ctx, next) {
    try {
      // Проверяем, что это личное сообщение (не группа/канал)
      if (ctx.chat.type !== 'private') {
        console.log(`❌ Попытка использования бота в групповом чате: ${ctx.chat.type}`);
        ctx.session.userRole = 'unauthorized';
        return next();
      }

      const userId = ctx.from.id.toString();
      
      // Проверяем сначала директора
      const directorInfo = await db.getDirectorInfo(userId);
      if (directorInfo) {
        ctx.session.userRole = 'director';
        ctx.session.userInfo = directorInfo;
        console.log(`✅ Директор авторизован: ${directorInfo.name}`);
        return next();
      }

      // Если не директор, проверяем мастера
      const masterInfo = await db.getMasterInfo(userId);
      if (masterInfo) {
        ctx.session.userRole = 'master';
        ctx.session.userInfo = masterInfo;
        ctx.session.userId = masterInfo.id; // Добавляем ID мастера
        console.log(`✅ Мастер авторизован: ${masterInfo.name} (ID: ${masterInfo.id})`);
        return next();
      }

      // Если не найден ни в одной таблице
      console.log(`❌ Пользователь ${userId} не авторизован`);
      ctx.session.userRole = 'unauthorized';
      return next();
      
    } catch (error) {
      console.error('Ошибка в middleware авторизации:', error);
      ctx.session.userRole = 'unauthorized';
      return next();
    }
  }

  // Middleware для проверки роли директора
  static requireDirector(ctx, next) {
    if (ctx.chat.type !== 'private') {
      return; // Не отвечаем в групповых чатах
    }
    if (ctx.session.userRole === 'director') {
      return next();
    }
    return ctx.reply('❌ Доступ только для директора');
  }

  // Middleware для проверки роли мастера
  static requireMaster(ctx, next) {
    if (ctx.chat.type !== 'private') {
      return; // Не отвечаем в групповых чатах
    }
    if (ctx.session.userRole === 'master') {
      return next();
    }
    return ctx.reply('❌ Доступ только для мастера');
  }

  // Middleware для проверки авторизованных пользователей (директор или мастер)
  static requireAuth(ctx, next) {
    if (ctx.chat.type !== 'private') {
      return; // Не отвечаем в групповых чатах
    }
    if (ctx.session.userRole === 'director' || ctx.session.userRole === 'master') {
      return next();
    }
    return ctx.reply('❌ Доступ закрыт');
  }
}

module.exports = AuthMiddleware;
