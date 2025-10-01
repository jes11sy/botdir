class ErrorHandler {
  // Обработка ошибок бота
  static handleBotError(err, ctx) {
    console.error('Ошибка бота:', err);
    
    if (ctx) {
      ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  }

  // Обработка ошибок базы данных
  static handleDatabaseError(error, ctx, defaultMessage = 'Ошибка базы данных') {
    console.error('Ошибка БД:', error);
    
    if (ctx) {
      ctx.reply(defaultMessage);
    }
  }

  // Валидация входных данных
  static validateInput(text, type) {
    switch (type) {
      case 'phone':
        return /^\+?[0-9\s\-\(\)]+$/.test(text);
      case 'number':
        return /^\d+$/.test(text);
      case 'amount':
        return /^\d+(\.\d{2})?$/.test(text);
      default:
        return true;
    }
  }
}

module.exports = ErrorHandler;
