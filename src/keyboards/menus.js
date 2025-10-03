const { Markup } = require('telegraf');

// Главное меню
const mainMenu = Markup.keyboard([
  ['📋 Заявки', '💰 Касса'],
  ['📊 Отчеты', '👥 Сотрудники']
]).resize();

// Меню заявок
const ordersMenu = Markup.keyboard([
  ['🆕 Новые', '🔄 Модерны'],
  ['⚙️ В работе', '🔍 Поиск'],
  ['⬅️ Назад']
]).resize();

// Меню кассы
const cashMenu = Markup.keyboard([
  ['💰 Баланс', '📊 История'],
  ['➖ Расход', '➕ Приход'],
  ['⬅️ Назад']
]).resize();

// Меню отчетов
const reportsMenu = Markup.keyboard([
  ['🏙️ Отчет по городу', '🔧 Отчет по мастерам'],
  ['⬅️ Назад']
]).resize();

// Меню сотрудников
const employeesMenu = Markup.keyboard([
  ['📋 Список мастеров', '🔍 Поиск мастера'],
  ['➕ Добавить мастера', '⬅️ Назад']
]).resize();

// Меню для мастера (ограниченный функционал)
const masterMenu = Markup.keyboard([
  ['📋 Мои заявки'],
  ['📊 Моя статистика']
]).resize();

// Меню заявок для мастера
const masterOrdersMenu = Markup.keyboard([
  ['🆕 Новые заявки', '🔧 В работе'],
  ['🔄 Модернизации', '⬅️ Назад']
]).resize();

// Меню кассы для мастера
const masterCashMenu = Markup.keyboard([
  ['💰 Баланс', '📊 История'],
  ['➖ Расход', '➕ Приход'],
  ['⬅️ Назад']
]).resize();

// Меню отчетов для мастера
const masterReportsMenu = Markup.keyboard([
  ['📊 Мои заявки'],
  ['⬅️ Назад']
]).resize();

module.exports = {
  mainMenu,
  ordersMenu,
  cashMenu,
  reportsMenu,
  employeesMenu,
  masterMenu,
  masterOrdersMenu,
  masterCashMenu,
  masterReportsMenu
};
