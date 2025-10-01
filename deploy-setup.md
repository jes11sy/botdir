# Настройка CI/CD для Telegram Bot

## Секреты GitHub (Settings → Secrets and variables → Actions)

Добавьте следующие секреты в ваш GitHub репозиторий:

### 🔐 Обязательные секреты:

1. **BOT_HOST** - IP адрес или домен вашего сервера
   ```
   Пример: 192.168.1.100 или bot.yourdomain.com
   ```

2. **BOT_USERNAME** - имя пользователя для SSH подключения
   ```
   Пример: ubuntu, root, или ваш_пользователь
   ```

3. **BOT_SSH_KEY** - приватный SSH ключ для подключения к серверу
   ```
   -----BEGIN OPENSSH PRIVATE KEY-----
   ваш_приватный_ключ_здесь
   -----END OPENSSH PRIVATE KEY-----
   ```

4. **BOT_DEPLOY_PATH** - путь к папке с ботом на сервере
   ```
   Пример: /var/www/bot или /home/ubuntu/bot
   ```

5. **DATABASE_URL** - строка подключения к базе данных
   ```
   Пример: postgresql://username:password@localhost:5432/database_name
   ```

6. **BOT_TOKEN** - токен вашего Telegram бота
   ```
   Пример: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
   ```

7. **ADMIN_CHAT_ID** - ID чата администратора
   ```
   Пример: 123456789
   ```

8. **WEBHOOK_TOKEN** - секретный токен для webhook
   ```
   Пример: your_super_secret_webhook_token_123
   ```

### 🔧 Опциональные секреты:

9. **BOT_SSH_PORT** - порт SSH (по умолчанию 22)
   ```
   Пример: 22 или 2222
   ```

10. **WEBHOOK_PORT** - порт для webhook сервера (по умолчанию 8080)
    ```
    Пример: 8080
    ```

## 🚀 Подготовка сервера

### 1. Установка зависимостей:
```bash
# Обновляем систему
sudo apt update && sudo apt upgrade -y

# Устанавливаем Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Устанавливаем PM2 глобально
sudo npm install -g pm2

# Устанавливаем PostgreSQL (если нужно)
sudo apt install postgresql postgresql-contrib -y
```

### 2. Настройка SSH ключей:
```bash
# Создаем папку для SSH ключей
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Добавляем публичный ключ в authorized_keys
echo "ваш_публичный_ключ" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 3. Создание директории для бота:
```bash
# Создаем папку для бота
sudo mkdir -p /var/www/bot
sudo chown $USER:$USER /var/www/bot

# Или используйте домашнюю директорию
mkdir -p ~/bot
```

### 4. Клонирование репозитория:
```bash
cd /var/www/bot  # или ~/bot
git clone https://github.com/ваш_username/ваш_репозиторий.git .
```

### 5. Настройка PM2 для автозапуска:
```bash
# Сохраняем текущую конфигурацию PM2
pm2 save

# Настраиваем автозапуск PM2
pm2 startup
# Выполните команду, которую покажет PM2
```

## 🔄 Процесс деплоя

После настройки секретов и сервера:

1. **Push в main/master ветку** - автоматически запустится деплой
2. **Ручной запуск** - через GitHub Actions → Deploy Telegram Bot → Run workflow

## 📋 Проверка деплоя

```bash
# Проверяем статус процессов
pm2 status

# Смотрим логи
pm2 logs bot
pm2 logs webhook

# Перезапускаем при необходимости
pm2 restart bot
pm2 restart webhook
```

## 🛠️ Troubleshooting

### Если деплой не работает:
1. Проверьте все секреты в GitHub
2. Убедитесь, что SSH ключ работает: `ssh -i ключ пользователь@сервер`
3. Проверьте права доступа к папке: `ls -la /var/www/bot`
4. Посмотрите логи GitHub Actions

### Если бот не запускается:
1. Проверьте переменные окружения: `pm2 env 0`
2. Посмотрите логи: `pm2 logs bot --lines 50`
3. Проверьте подключение к БД
4. Убедитесь, что порты свободны: `netstat -tulpn | grep :8080`
