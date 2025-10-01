// Утилита для работы с городами

/**
 * Обрабатывает города из базы данных в разных форматах
 * @param {any} cities - Города из БД (массив или строка)
 * @returns {string[]} - Массив городов
 */
function parseCities(cities) {
  if (!cities) {
    return [];
  }

  if (Array.isArray(cities)) {
    return cities;
  }

  if (typeof cities === 'string') {
    // Если это строка в формате {город1,город2}, парсим её
    const citiesStr = cities.replace(/[{}]/g, '');
    return citiesStr.split(',').map(city => city.trim()).filter(city => city.length > 0);
  }

  return [];
}

/**
 * Проверяет, есть ли у пользователя города
 * @param {any} cities - Города из БД
 * @returns {boolean} - true если есть города
 */
function hasCities(cities) {
  const parsedCities = parseCities(cities);
  return parsedCities.length > 0;
}

module.exports = {
  parseCities,
  hasCities
};
