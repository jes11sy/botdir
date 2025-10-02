// Утилита для работы с Markdown в Telegram

/**
 * Экранирует специальные символы Markdown для безопасной отправки в Telegram
 * @param {string} text - Текст для экранирования
 * @returns {string} - Экранированный текст
 */
function escapeMarkdown(text) {
  if (!text) return '';
  
  // Экранируем специальные символы Markdown V2
  // Убираем дефис из списка, так как он может вызывать проблемы
  return String(text).replace(/[_*[\]()~`>#+=|{}!]/g, '\\$&');
}

/**
 * Форматирует текст как жирный с экранированием
 * @param {string} text - Текст для форматирования
 * @returns {string} - Отформатированный текст
 */
function bold(text) {
  return `*${escapeMarkdown(text)}*`;
}

/**
 * Форматирует текст как моноширинный с экранированием
 * @param {string} text - Текст для форматирования
 * @returns {string} - Отформатированный текст
 */
function code(text) {
  return `\`${escapeMarkdown(text)}\``;
}

/**
 * Форматирует текст как курсив с экранированием
 * @param {string} text - Текст для форматирования
 * @returns {string} - Отформатированный текст
 */
function italic(text) {
  return `_${escapeMarkdown(text)}_`;
}

module.exports = {
  escapeMarkdown,
  bold,
  code,
  italic
};
