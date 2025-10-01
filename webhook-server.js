require('dotenv').config();
const express = require('express');
const axios = require('axios');
const db = require('./src/config/database');

const app = express();
app.use(express.json());

// Функция отправки уведомления о новой заявке в Telegram
async function sendNewOrderNotification(tgId, orderId, dateMeeting) {
  try {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      console.error('❌ BOT_TOKEN не установлен');
      return;
    }

    // Форматируем дату (показываем время как есть, без конвертации часового пояса)
    const date = new Date(dateMeeting);
    const dateStr = date.toLocaleDateString('ru-RU');
    const timeStr = date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'UTC'  // Показываем UTC время
    });

    const message = `🆕 Новый заказ №${orderId} ${dateStr} ${timeStr}`;

    console.log(`📤 Отправляем уведомление о новой заявке в Telegram: ${message}`);
    console.log(`🔍 chat_id: ${tgId} (тип: ${typeof tgId})`);
    console.log(`🔍 botToken: ${botToken}`);
    
    // Преобразуем в число
    const chatId = parseInt(tgId);
    console.log(`🔍 chatId после parseInt: ${chatId} (тип: ${typeof chatId})`);

    const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    });

    console.log(`✅ Уведомление о новой заявке отправлено в Telegram:`, response.data);
  } catch (error) {
    console.error('❌ Ошибка при отправке уведомления о новой заявке в Telegram:', error.response?.data || error.message);
  }
}

// Функция отправки уведомления в Telegram
async function sendTelegramNotification(tgId, orderId, newDate) {
  try {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      console.error('❌ BOT_TOKEN не установлен');
      return;
    }

    // Форматируем дату (показываем время как есть, без конвертации часового пояса)
    const date = new Date(newDate);
    const dateStr = date.toLocaleDateString('ru-RU');
    const timeStr = date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'UTC'  // Показываем UTC время
    });

    const message = `📅 Заказ №${orderId} перенесен на ${dateStr} ${timeStr}`;

    console.log(`📤 Отправляем сообщение в Telegram: ${message}`);
    console.log(`🔍 chat_id: ${tgId} (тип: ${typeof tgId})`);
    console.log(`🔍 botToken: ${botToken}`);
    
    // Преобразуем в число
    const chatId = parseInt(tgId);
    console.log(`🔍 chatId после parseInt: ${chatId} (тип: ${typeof chatId})`);

       const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
         chat_id: chatId,
         text: message,
         parse_mode: 'HTML'
       });

    console.log(`✅ Сообщение отправлено в Telegram:`, response.data);
  } catch (error) {
    console.error('❌ Ошибка при отправке в Telegram:', error.response?.data || error.message);
  }
}

// Webhook endpoint
app.post('/webhook/order-update', async (req, res) => {
  try {
    console.log('📨 Получен webhook запрос:', req.body);
    
    const { orderId, newDate, city, token } = req.body;

    // Проверка токена
    if (token !== process.env.WEBHOOK_TOKEN) {
      console.log('❌ Неверный токен webhook');
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    console.log(`📨 Получено уведомление: заказ #${orderId}, новая дата: ${newDate}, город: ${city}`);

    // Подключаемся к БД
    await db.connect();
    console.log('✅ Подключение к БД установлено');

    // Получаем клиент БД
    const client = db.getClient();
    if (!client) {
      console.error('❌ Клиент БД не создан');
      return res.status(500).json({ success: false, message: 'Database client not available' });
    }

    // Получаем директора по городу
    const query = `
      SELECT tg_id, name, cities 
      FROM director 
      WHERE $1 = ANY(cities)
      LIMIT 1
    `;
    console.log(`🔍 Ищем директора для города: ${city}`);
    
    const result = await client.query(query, [city]);
    const director = result.rows[0];

    if (!director) {
      console.log(`❌ Директор для города ${city} не найден`);
      return res.status(404).json({ success: false, message: 'Director not found' });
    }

    console.log(`✅ Найден директор: ${director.name} (tg_id: ${director.tg_id})`);
    
    // Отправляем уведомление в Telegram
    await sendTelegramNotification(director.tg_id, orderId, newDate);
    
    console.log(`📤 Уведомление отправлено директору ${director.tg_id}`);

    res.json({ success: true, message: 'Notification processed' });
  } catch (error) {
    console.error('❌ Ошибка в webhook:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Webhook для новой заявки
app.post('/webhook/new-order', async (req, res) => {
  try {
    console.log('📨 Получен webhook запрос о новой заявке:', req.body);

    const { orderId, city, dateMeeting, token } = req.body;

    // Проверка токена безопасности
    if (token !== process.env.WEBHOOK_TOKEN) {
      console.log('❌ Неверный токен webhook');
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Валидация данных
    if (!orderId || !city || !dateMeeting) {
      console.log('❌ Отсутствуют обязательные поля');
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    console.log(`📨 Получено уведомление о новой заявке: заказ #${orderId}, город: ${city}`);

    // Подключаемся к БД
    await db.connect();
    console.log('✅ Подключение к БД установлено');

    // Получаем клиент БД
    const client = db.getClient();
    if (!client) {
      console.error('❌ Клиент БД не создан');
      return res.status(500).json({ success: false, message: 'Database client not available' });
    }

    // Получаем директора по городу
    const query = `
      SELECT tg_id, name, cities
      FROM director
      WHERE $1 = ANY(cities)
      LIMIT 1
    `;
    console.log(`🔍 Ищем директора для города: ${city}`);

    const result = await client.query(query, [city]);
    const director = result.rows[0];

    if (!director) {
      console.log(`❌ Директор для города ${city} не найден`);
      return res.status(404).json({ success: false, message: 'Director not found' });
    }

    console.log(`✅ Найден директор: ${director.name} (tg_id: ${director.tg_id})`);

    // Отправляем уведомление в Telegram
    await sendNewOrderNotification(director.tg_id, orderId, dateMeeting);

    console.log(`📤 Уведомление о новой заявке отправлено директору ${director.tg_id}`);

    res.json({ success: true, message: 'New order notification processed' });
  } catch (error) {
    console.error('❌ Ошибка в webhook новой заявки:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Запуск сервера
const port = process.env.WEBHOOK_PORT || 8080;
app.listen(port, () => {
  console.log(`🌐 Webhook сервер запущен на порту ${port}`);
});
