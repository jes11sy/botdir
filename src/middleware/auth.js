const db = require('../config/database');

class AuthMiddleware {
  // Middleware для авторизации пользователя
  static async checkAuth(ctx, next) {
    try {
      // Разрешаем команду /id в группах без авторизации
      if (ctx.chat.type !== 'private' && ctx.message?.text === '/id') {
        console.log(`ℹ️ Команда /id в групповом чате: ${ctx.chat.type}`);
        return next(); // Пропускаем авторизацию для команды /id
      }
      
      // Разрешаем callback кнопки заявок в группах без авторизации
      if (ctx.chat.type !== 'private' && ctx.callbackQuery) {
        const callbackData = ctx.callbackQuery.data;
        // Проверяем, что это callback кнопка заявки
        if (callbackData && (
          // Основные кнопки заявок
          callbackData.startsWith('accept_order_') ||      // Принять заявку
          callbackData.startsWith('reject_order_') ||      // Отклонить заявку
          callbackData.startsWith('final_status_') ||      // Готово, Отказ, Незаказ, Модерн
          callbackData.startsWith('on_way_') ||            // В пути
          callbackData.startsWith('in_work_') ||           // В работе
          callbackData.startsWith('assign_master_') ||     // Назначить мастера
          callbackData.startsWith('select_master_') ||     // Выбрать мастера
          callbackData.startsWith('order_') ||             // Просмотр заявки
          
          // Статусы заявок
          callbackData.startsWith('status_') ||            // Общие статусы
          callbackData.startsWith('set_status_') ||        // Установить статус
          callbackData.startsWith('change_status_') ||     // Изменить статус
          callbackData.startsWith('remind_master_') ||     // Напомнить мастеру
          
          // Заявки в работе
          callbackData.startsWith('inwork_') ||            // Все кнопки заявок в работе
          
          // Модерн заявки
          callbackData.startsWith('modern_') ||            // Все кнопки модерн заявок
          
          // Поиск заявок
          callbackData.startsWith('search_') ||            // Поиск заявок
          
          // Кнопки заявок мастера
          callbackData.startsWith('master_order_') ||      // Кнопки заявок мастера
          callbackData.startsWith('master_inwork_order_') ||
          callbackData.startsWith('master_modern_order_') ||
          callbackData.startsWith('master_search_order_')
        )) {
          console.log(`ℹ️ Callback кнопка заявки в групповом чате: ${callbackData}`);
          return next(); // Пропускаем авторизацию для callback кнопок заявок
        }
      }
      
      // Разрешаем текстовые сообщения в группах для закрытия заказов (ввод итога и расхода)
      if (ctx.chat.type !== 'private' && ctx.message && ctx.message.text) {
        // Проверяем, что это числовой ввод (итог и расход)
        const text = ctx.message.text.trim();
        const isNumericInput = /^\d+\s+\d+$/.test(text) || /^\d+\.?\d*\s+\d+\.?\d*$/.test(text);
        
        if (isNumericInput) {
          console.log(`💰 Текстовый ввод в групповом чате для закрытия заказа: ${text}`);
          // Инициализируем базовую сессию для групп
          ctx.session = ctx.session || {};
          return next(); // Пропускаем авторизацию для ввода итога и расхода
        }
      }
      
      // Проверяем, что это личное сообщение (не группа/канал)
      if (ctx.chat.type !== 'private') {
        console.log(`❌ Попытка использования бота в групповом чате: ${ctx.chat.type}`);
        return; // Не устанавливаем userRole и не вызываем next()
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
    return;
  }
}

module.exports = AuthMiddleware;
