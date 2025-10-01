const express = require('express');
const db = require('../config/database');
const config = require('../config');

class WebhookHandler {
  constructor(bot) {
    this.bot = bot;
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  setupRoutes() {
    // Webhook для получения уведомлений от CRM
    this.app.post('/webhook/order-update', async (req, res) => {
      try {
        const { orderId, newDate, city, token } = req.body;

        // Проверка токена безопасности
        if (token !== config.WEBHOOK_TOKEN) {
          console.log('❌ Неверный токен webhook');
          return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // Валидация данных
        if (!orderId || !newDate || !city) {
          console.log('❌ Отсутствуют обязательные поля');
          return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        console.log(`📨 Получено уведомление: заказ #${orderId}, новая дата: ${newDate}, город: ${city}`);

        // Получаем директора по городу
        const director = await this.getDirectorByCity(city);
        if (!director) {
          console.log(`❌ Директор для города ${city} не найден`);
          return res.status(404).json({ success: false, message: 'Director not found' });
        }

        // Отправляем уведомление директору
        await this.sendNotificationToDirector(director.tg_id, orderId, newDate);

        res.json({ success: true, message: 'Notification sent' });
      } catch (error) {
        console.error('❌ Ошибка в webhook:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
      }
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  }

  // Получение директора по городу
  async getDirectorByCity(city) {
    try {
      const query = `
        SELECT tg_id, name, cities 
        FROM director 
        WHERE $1 = ANY(cities)
        LIMIT 1
      `;
      const result = await db.getClient().query(query, [city]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('❌ Ошибка при получении директора:', error);
      return null;
    }
  }

  // Отправка уведомления директору
  async sendNotificationToDirector(tgId, orderId, newDate) {
    try {
      if (!tgId) {
        console.log('❌ tg_id директора не указан');
        return;
      }

      // Форматируем дату
      const date = new Date(newDate);
      const dateStr = date.toLocaleDateString('ru-RU');
      const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

      const message = `📅 *Заказ №${orderId} перенесен на ${dateStr} ${timeStr}*`;

      console.log(`📤 Отправляем уведомление директору ${tgId}: ${message}`);

      await this.bot.telegram.sendMessage(tgId, message, {
        parse_mode: 'Markdown'
      });

      console.log(`✅ Уведомление отправлено директору ${tgId}`);
    } catch (error) {
      console.error('❌ Ошибка при отправке уведомления директору:', error);
    }
  }

  // Запуск webhook сервера
  start(port = 3001) {
    try {
      this.app.listen(port, () => {
        console.log(`🌐 Webhook сервер запущен на порту ${port}`);
      });
    } catch (error) {
      console.error('❌ Ошибка запуска webhook сервера:', error);
    }
  }
}

module.exports = WebhookHandler;
