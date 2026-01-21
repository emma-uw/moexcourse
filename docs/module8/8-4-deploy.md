---
sidebar_position: 8.4
---

# 8.4. Деплой

Последний шаг - развертывание торгового робота на облачном сервере. Это позволит ему работать 24/7 независимо от вашего локального компьютера.

## Выбор VPS провайдера

### Рекомендуемые провайдеры

| Провайдер | Стоимость | Надежность | Особенности |
|-----------|-----------|------------|-------------|
| **DigitalOcean** | $6/мес | Высокая | Простота, SSD, API |
| **Hetzner** | €3/мес | Высокая | Дешево, хорошая сеть |
| **Linode** | $5/мес | Высокая | Стабильный, хорошая поддержка |
| **Vultr** | $2.5/мес | Средняя | Дешево, много локаций |
| **AWS Lightsail** | $3.5/мес | Очень высокая | Масштабируемость |

### Требования к серверу

```bash
# Минимальные требования
- RAM: 1 GB
- CPU: 1 vCPU
- Disk: 20 GB SSD
- OS: Ubuntu 20.04 LTS или выше
- Network: Стабильное подключение
```

## Настройка сервера

### 1. Создание VPS

```bash
# Пример с DigitalOcean
# 1. Зарегистрироваться на digitalocean.com
# 2. Создать Droplet:
#    - Ubuntu 22.04
#    - 1 GB RAM / 1 vCPU
#    - 25 GB SSD
#    - Добавить SSH ключ
```

### 2. Базовая настройка безопасности

```bash
# Подключение к серверу
ssh root@your_server_ip

# Обновление системы
sudo apt update && sudo apt upgrade -y

# Создание пользователя для бота
sudo adduser tradingbot
sudo usermod -aG sudo tradingbot

# Настройка SSH для нового пользователя
sudo mkdir /home/tradingbot/.ssh
sudo cp ~/.ssh/authorized_keys /home/tradingbot/.ssh/
sudo chown -R tradingbot:tradingbot /home/tradingbot/.ssh
sudo chmod 600 /home/tradingbot/.ssh/authorized_keys

# Отключение root SSH
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# Настройка firewall
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```

### 3. Установка Python и зависимостей

```bash
# Переключение на пользователя tradingbot
su - tradingbot

# Установка Python
sudo apt install python3 python3-pip python3-venv -y

# Создание виртуального окружения
python3 -m venv trading_env
source trading_env/bin/activate

# Установка зависимостей
pip install --upgrade pip
pip install pandas numpy ta-lib requests aiohttp python-dotenv cryptography python-telegram-bot schedule
```

## Развертывание кода

### Структура проекта на сервере

```bash
# Создание структуры
mkdir -p ~/trading_bot/{src,logs,config,data}

# Структура:
/home/tradingbot/trading_bot/
├── src/
│   ├── main.py           # Главный файл
│   ├── strategies/       # Стратегии
│   ├── brokers/          # Брокерские API
│   └── utils/            # Утилиты
├── logs/                 # Логи
├── config/               # Конфигурационные файлы
├── data/                 # Данные (кэш, история)
├── requirements.txt      # Зависимости
├── .env                  # Переменные окружения
└── run.sh               # Скрипт запуска
```

### Копирование кода

```bash
# На локальной машине
scp -r /path/to/your/trading_bot tradingbot@server_ip:~/trading_bot/

# Или через git
ssh tradingbot@server_ip
cd ~/trading_bot
git clone https://github.com/yourusername/trading_bot.git .
```

## Настройка переменных окружения

### Безопасное хранение секретов

```bash
# Создание .env файла на сервере
nano ~/trading_bot/.env

# Содержимое .env
TINKOFF_TOKEN=your_encrypted_token_here
FINAM_CLIENT_ID=your_client_id
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
LOG_LEVEL=INFO
MAX_POSITION_SIZE=100000
RISK_PER_TRADE=0.02
```

### Шифрование чувствительных данных

```python
# Локально зашифровать токены перед загрузкой
from cryptography.fernet import Fernet
import os

# Генерация ключа
key = Fernet.generate_key()
with open('encryption_key', 'wb') as f:
    f.write(key)

cipher = Fernet(key)

# Шифрование
token = "your_secret_token"
encrypted = cipher.encrypt(token.encode())

# Сохранить encrypted.hex() в .env
```

## Настройка автозапуска

### Systemd сервис

```bash
# Создание сервиса
sudo nano /etc/systemd/system/trading-bot.service

# Содержимое файла
[Unit]
Description=Trading Bot Service
After=network.target

[Service]
Type=simple
User=tradingbot
WorkingDirectory=/home/tradingbot/trading_bot
ExecStart=/home/tradingbot/trading_bot/trading_env/bin/python /home/tradingbot/trading_bot/src/main.py
Restart=always
RestartSec=10
Environment=PYTHONPATH=/home/tradingbot/trading_bot/src

[Install]
WantedBy=multi-user.target
```

```bash
# Запуск сервиса
sudo systemctl daemon-reload
sudo systemctl enable trading-bot
sudo systemctl start trading-bot

# Проверка статуса
sudo systemctl status trading-bot

# Просмотр логов
sudo journalctl -u trading-bot -f
```

### Скрипт запуска

```bash
# Создание run.sh
nano ~/trading_bot/run.sh

# Содержимое
#!/bin/bash
cd /home/tradingbot/trading_bot
source trading_env/bin/activate
python src/main.py

# Сделать исполняемым
chmod +x run.sh
```

## Мониторинг и обслуживание

### Настройка логирования

```python
# В main.py настроить логирование
import logging
from logging.handlers import RotatingFileHandler

def setup_logging():
    """Настройка логирования для сервера"""
    log_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Файловый лог
    log_file = '/home/tradingbot/trading_bot/logs/trading_bot.log'
    file_handler = RotatingFileHandler(
        log_file, maxBytes=10*1024*1024, backupCount=5
    )
    file_handler.setFormatter(log_formatter)
    
    # Консольный лог
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(log_formatter)
    
    # Настройка логгера
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger

# В начале main.py
logger = setup_logging()
logger.info("Торговый робот запущен на сервере")
```

### Мониторинг ресурсов

```bash
# Установка мониторинга
sudo apt install htop iotop -y

# Проверка использования ресурсов
htop

# Мониторинг диска
df -h

# Мониторинг памяти
free -h

# Проверка сетевых подключений
netstat -tlnp | grep :80
```

### Автоматические бэкапы

```bash
# Настройка cron для бэкапов
crontab -e

# Добавить строку для ежедневного бэкапа в 2:00
0 2 * * * /home/tradingbot/trading_bot/backup.sh

# Создание скрипта бэкапа
nano ~/trading_bot/backup.sh

#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/tradingbot/backups"
mkdir -p $BACKUP_DIR

# Бэкап логов и конфигурации
tar -czf $BACKUP_DIR/logs_$DATE.tar.gz /home/tradingbot/trading_bot/logs/
tar -czf $BACKUP_DIR/config_$DATE.tar.gz /home/tradingbot/trading_bot/config/

# Очистка старых бэкапов (старше 30 дней)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Бэкап завершен: $DATE"
```

## Обновление кода

### Автоматическое обновление

```python
# В trading_bot добавить функцию обновления
def check_for_updates():
    """Проверка обновлений кода"""
    try:
        # Проверка новой версии в git
        import subprocess
        result = subprocess.run(
            ['git', 'fetch', 'origin'],
            cwd='/home/tradingbot/trading_bot',
            capture_output=True, text=True
        )
        
        if result.returncode == 0:
            # Проверка наличия обновлений
            result = subprocess.run(
                ['git', 'status', '-uno'],
                cwd='/home/tradingbot/trading_bot',
                capture_output=True, text=True
            )
            
            if 'behind' in result.stdout:
                logger.info("Доступны обновления, перезапуск...")
                restart_bot()
                
    except Exception as e:
        logger.error(f"Ошибка проверки обновлений: {e}")

def restart_bot():
    """Перезапуск бота"""
    logger.info("Перезапуск торгового робота...")
    
    # Обновление кода
    subprocess.run(['git', 'pull'], cwd='/home/tradingbot/trading_bot')
    
    # Перезапуск сервиса
    subprocess.run(['sudo', 'systemctl', 'restart', 'trading-bot'])
```

### Ручное обновление

```bash
# На сервере
cd ~/trading_bot
git pull origin main

# Перезапуск
sudo systemctl restart trading-bot

# Проверка логов
tail -f logs/trading_bot.log
```

## Безопасность сервера

### Настройка Fail2Ban

```bash
# Защита от brute force атак
sudo apt install fail2ban -y

# Настройка
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Настройка SSL (опционально)

```bash
# Для HTTPS подключений (если нужен веб-интерфейс)
sudo apt install certbot python3-certbot-nginx -y

# Получение сертификата
sudo certbot --nginx -d your-domain.com
```

## Масштабирование

### Несколько стратегий

```bash
# Запуск нескольких экземпляров
sudo nano /etc/systemd/system/trading-bot-scalping.service
sudo nano /etc/systemd/system/trading-bot-swing.service

# Разные конфигурации для разных стратегий
cp .env .env_scalping
cp .env .env_swing

# В сервисах указать разные переменные окружения
EnvironmentFile=/home/tradingbot/trading_bot/.env_scalping
```

### Балансировка нагрузки

```python
# Распределение стратегий по разным серверам
servers = [
    'trading-server-1',
    'trading-server-2', 
    'trading-server-3'
]

def assign_strategy_to_server(strategy_name):
    """Назначение стратегии серверу"""
    # Простое распределение по хэшу
    server_index = hash(strategy_name) % len(servers)
    return servers[server_index]
```

## Мониторинг uptime

### Настройка health checks

```python
# Добавление эндпоинта здоровья
from flask import Flask
import psutil

app = Flask(__name__)

@app.route('/health')
def health_check():
    """Проверка здоровья системы"""
    health = {
        'status': 'healthy',
        'cpu_percent': psutil.cpu_percent(),
        'memory_percent': psutil.virtual_memory().percent,
        'disk_usage': psutil.disk_usage('/').percent,
        'trading_bot_active': check_trading_bot_status()
    }
    
    # Проверка порогов
    if health['cpu_percent'] > 90 or health['memory_percent'] > 90:
        health['status'] = 'warning'
    
    return health

def check_trading_bot_status():
    """Проверка статуса торгового робота"""
    # Проверка процесса, подключения к брокеру и т.д.
    return True
```

## Финальные шаги

1. **Тестирование на сервере**
   ```bash
   # Запуск в тестовом режиме
   python src/main.py --test-mode
   
   # Проверка логов
   tail -f logs/trading_bot.log
   ```

2. **Настройка мониторинга**
   ```bash
   # Установка monitoring tools
   sudo apt install prometheus-node-exporter -y
   ```

3. **Документирование**
   ```bash
   # Создание README для сервера
   nano ~/trading_bot/README_SERVER.md
   ```

Теперь ваш торговый робот работает автономно на облачном сервере, обеспечивая 24/7 торговлю независимо от вашего локального компьютера.
