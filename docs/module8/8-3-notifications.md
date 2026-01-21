---
sidebar_position: 8.3
---

# 8.3. Уведомления

Уведомления позволяют оперативно получать информацию о работе торгового робота на телефон или другие устройства. Telegram бот - идеальный инструмент для этого благодаря простоте использования и надежности.

## Создание Telegram бота

### Регистрация бота

1. **Найти BotFather в Telegram**
   - Перейдите к [@BotFather](https://t.me/botfather)
   - Отправьте команду `/newbot`

2. **Настройка бота**
   ```
   /newbot
   Имя бота: MyTradingBot
   Username: my_trading_bot
   ```

3. **Получение токена**
   - BotFather пришлет токен: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`
   - **Сохраните токен в безопасном месте**

### Получение Chat ID

```python
import requests
import os

# Получение обновлений бота
def get_chat_id(bot_token):
    """Получение chat ID через API"""
    url = f"https://api.telegram.org/bot{bot_token}/getUpdates"
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json()
        if data['result']:
            chat_id = data['result'][0]['message']['chat']['id']
            return chat_id
    
    return None

# Или отправьте сообщение боту и получите updates
bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
chat_id = get_chat_id(bot_token)
print(f"Chat ID: {chat_id}")
```

## Класс TelegramNotifier

### Базовая реализация

```python
import requests
import logging

class TelegramNotifier:
    """Уведомления через Telegram"""
    
    def __init__(self, bot_token=None, chat_id=None):
        self.bot_token = bot_token or os.getenv('TELEGRAM_BOT_TOKEN')
        self.chat_id = chat_id or os.getenv('TELEGRAM_CHAT_ID')
        self.base_url = f"https://api.telegram.org/bot{self.bot_token}"
        
        if not self.bot_token or not self.chat_id:
            raise ValueError("Необходимо указать bot_token и chat_id")
    
    def send_message(self, text, parse_mode='HTML'):
        """Отправка текстового сообщения"""
        try:
            url = f"{self.base_url}/sendMessage"
            data = {
                'chat_id': self.chat_id,
                'text': text,
                'parse_mode': parse_mode,
                'disable_web_page_preview': True
            }
            
            response = requests.post(url, data=data, timeout=10)
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logging.error(f"Ошибка отправки сообщения в Telegram: {e}")
            return None
    
    def send_photo(self, photo_path, caption=""):
        """Отправка фотографии"""
        try:
            url = f"{self.base_url}/sendPhoto"
            with open(photo_path, 'rb') as photo:
                data = {'chat_id': self.chat_id, 'caption': caption}
                files = {'photo': photo}
                
                response = requests.post(url, data=data, files=files, timeout=30)
                response.raise_for_status()
                
                return response.json()
                
        except Exception as e:
            logging.error(f"Ошибка отправки фото: {e}")
            return None
```

## Типы уведомлений

### Торговые сигналы

```python
class TradingNotifications:
    """Уведомления о торговле"""
    
    def __init__(self, telegram_notifier):
        self.notifier = telegram_notifier
    
    def notify_signal(self, strategy_name, signal, symbol, price, reason=""):
        """Уведомление о торговом сигнале"""
        emoji = "🟢" if signal == "BUY" else "🔴"
        
        message = f"""
{emoji} <b>Торговый сигнал</b>

Стратегия: {strategy_name}
Сигнал: {signal}
Инструмент: {symbol}
Цена: {price:.2f}
Причина: {reason}
Время: {datetime.now().strftime('%H:%M:%S')}
        """.strip()
        
        self.notifier.send_message(message)
    
    def notify_order_executed(self, order_info):
        """Уведомление об исполнении заявки"""
        message = f"""
✅ <b>Заявка исполнена</b>

Инструмент: {order_info['symbol']}
Сторона: {order_info['side']}
Количество: {order_info['quantity']}
Цена: {order_info['price']:.2f}
Сумма: {order_info['quantity'] * order_info['price']:.2f}
        """.strip()
        
        self.notifier.send_message(message)
    
    def notify_pnl_update(self, pnl_info):
        """Уведомление об обновлении P&L"""
        emoji = "📈" if pnl_info['daily_pnl'] >= 0 else "📉"
        
        message = f"""
{emoji} <b>P&L Update</b>

Дневной P&L: {pnl_info['daily_pnl']:+.2f} ({pnl_info['daily_change']:+.2%})
Общий P&L: {pnl_info['total_pnl']:+.2f}
Активных позиций: {pnl_info['active_positions']}
        """.strip()
        
        self.notifier.send_message(message)
```

### Системные уведомления

```python
class SystemNotifications:
    """Системные уведомления"""
    
    def __init__(self, telegram_notifier):
        self.notifier = telegram_notifier
    
    def notify_startup(self, config):
        """Уведомление о запуске"""
        message = f"""
🚀 <b>Торговый робот запущен</b>

Время: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Конфигурация:
• Инструменты: {', '.join(config.get('symbols', []))}
• Стратегии: {', '.join(config.get('strategies', []))}
• Режим: {config.get('mode', 'live')}
        """.strip()
        
        self.notifier.send_message(message)
    
    def notify_shutdown(self, reason=""):
        """Уведомление об остановке"""
        message = f"""
🛑 <b>Торговый робот остановлен</b>

Причина: {reason or 'Ручная остановка'}
Время: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        """.strip()
        
        self.notifier.send_message(message)
    
    def notify_error(self, error_type, error_message, context=""):
        """Уведомление об ошибке"""
        message = f"""
❌ <b>Критическая ошибка</b>

Тип: {error_type}
Сообщение: {error_message}
Контекст: {context}
Время: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

<i>Требуется вмешательство!</i>
        """.strip()
        
        self.notifier.send_message(message)
    
    def notify_warning(self, warning_type, warning_message):
        """Уведомление о предупреждении"""
        message = f"""
⚠️ <b>Предупреждение</b>

Тип: {warning_type}
Сообщение: {warning_message}
Время: {datetime.now().strftime('%H:%M:%S')}
        """.strip()
        
        self.notifier.send_message(message)
```

## Интеграция с торговым роботом

### TradingBot с уведомлениями

```python
class TradingBotWithNotifications:
    """Торговый робот с уведомлениями"""
    
    def __init__(self):
        self.telegram = TelegramNotifier()
        self.trading_notifications = TradingNotifications(self.telegram)
        self.system_notifications = SystemNotifications(self.telegram)
        
        # Настройка логирования в Telegram
        self.setup_telegram_logging()
    
    def setup_telegram_logging(self):
        """Настройка отправки логов в Telegram"""
        import logging
        
        class TelegramHandler(logging.Handler):
            def __init__(self, notifier, level=logging.ERROR):
                super().__init__(level)
                self.notifier = notifier
            
            def emit(self, record):
                try:
                    message = self.format(record)
                    if record.levelno >= logging.ERROR:
                        self.notifier.send_message(f"🔴 ERROR: {message}")
                    elif record.levelno >= logging.WARNING:
                        self.notifier.send_message(f"🟡 WARNING: {message}")
                except Exception:
                    pass  # Не позволяем ошибкам логирования ломать систему
        
        telegram_handler = TelegramHandler(self.telegram)
        telegram_handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        
        # Добавление к корневому логгеру
        logging.getLogger().addHandler(telegram_handler)
    
    def start(self):
        """Запуск с уведомлением"""
        config = self.get_config()
        self.system_notifications.notify_startup(config)
        
        try:
            self.run_trading_loop()
        except KeyboardInterrupt:
            self.system_notifications.notify_shutdown("Прервано пользователем")
        except Exception as e:
            self.system_notifications.notify_error("SystemCrash", str(e))
            raise
    
    def on_signal_generated(self, signal_data):
        """Обработка генерации сигнала"""
        self.trading_notifications.notify_signal(
            signal_data['strategy'],
            signal_data['signal'],
            signal_data['symbol'],
            signal_data['price'],
            signal_data.get('reason', '')
        )
    
    def on_order_executed(self, order_data):
        """Обработка исполнения заявки"""
        self.trading_notifications.notify_order_executed(order_data)
    
    def periodic_report(self):
        """Периодический отчет"""
        pnl_info = self.calculate_pnl()
        self.trading_notifications.notify_pnl_update(pnl_info)
```

## Расписание уведомлений

### Cron-like планировщик

```python
import schedule
import time
from threading import Thread

class NotificationScheduler:
    """Планировщик уведомлений"""
    
    def __init__(self, trading_bot):
        self.bot = trading_bot
        self.schedule_thread = None
    
    def start_scheduler(self):
        """Запуск планировщика в отдельном потоке"""
        def run_scheduler():
            # Настройка расписания
            schedule.every().day.at("09:00").do(self._morning_report)
            schedule.every().hour.do(self._hourly_report)
            schedule.every(30).minutes.do(self._health_check)
            
            while True:
                schedule.run_pending()
                time.sleep(60)
        
        self.schedule_thread = Thread(target=run_scheduler, daemon=True)
        self.schedule_thread.start()
    
    def _morning_report(self):
        """Утренний отчет"""
        report = self.bot.generate_daily_report()
        self.bot.system_notifications.notify_startup({
            'type': 'morning_report',
            'report': report
        })
    
    def _hourly_report(self):
        """Почасовой отчет"""
        pnl = self.bot.calculate_pnl()
        self.bot.trading_notifications.notify_pnl_update({
            'hourly_pnl': pnl['hourly'],
            'daily_pnl': pnl['daily'],
            'total_pnl': pnl['total'],
            'active_positions': pnl['positions']
        })
    
    def _health_check(self):
        """Проверка здоровья системы"""
        health = self.bot.check_health()
        if not health['healthy']:
            self.bot.system_notifications.notify_warning(
                "HealthCheck",
                f"Проблемы со здоровьем: {health['issues']}"
            )
```

## Безопасность уведомлений

### Шифрование чувствительных данных

```python
from cryptography.fernet import Fernet

class SecureTelegramNotifier(TelegramNotifier):
    """Безопасный Telegram notifier с шифрованием"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.cipher = self._setup_encryption()
    
    def _setup_encryption(self):
        """Настройка шифрования для чувствительных данных"""
        key = os.getenv('TELEGRAM_ENCRYPTION_KEY')
        if not key:
            # Генерация ключа при первом запуске
            key = Fernet.generate_key()
            with open('.telegram_key', 'wb') as f:
                f.write(key)
        return Fernet(key)
    
    def send_secure_message(self, message, sensitive_data=None):
        """Отправка сообщения с шифрованием чувствительных данных"""
        if sensitive_data:
            # Шифрование чувствительных данных
            sensitive_json = json.dumps(sensitive_data)
            encrypted = self.cipher.encrypt(sensitive_json.encode())
            
            # Добавление маркера для расшифровки
            message += f"\n\n[ENCRYPTED:{encrypted.decode()}]"
        
        return self.send_message(message)
    
    def decrypt_received_data(self, encrypted_data):
        """Расшифровка полученных данных"""
        try:
            decrypted = self.cipher.decrypt(encrypted_data.encode())
            return json.loads(decrypted.decode())
        except Exception:
            return None
```

## Лучшие практики

### 1. Уровни важности

```python
class NotificationPriority:
    """Приоритеты уведомлений"""
    LOW = "low"          # Информационные сообщения
    MEDIUM = "medium"    # Важные обновления
    HIGH = "high"        # Критические события
    URGENT = "urgent"    # Требуют немедленного внимания

def should_send_notification(priority, user_preferences):
    """Проверка необходимости отправки уведомления"""
    min_priority = user_preferences.get('min_notification_priority', 'medium')
    
    priorities = {
        'low': 1,
        'medium': 2, 
        'high': 3,
        'urgent': 4
    }
    
    return priorities.get(priority, 0) >= priorities.get(min_priority, 2)
```

### 2. Ограничение частоты

```python
class NotificationThrottler:
    """Ограничитель частоты уведомлений"""
    
    def __init__(self, max_per_hour=10):
        self.max_per_hour = max_per_hour
        self.sent_notifications = []
    
    def can_send(self, notification_type):
        """Проверка возможности отправки"""
        # Очистка старых уведомлений
        cutoff_time = datetime.now() - timedelta(hours=1)
        self.sent_notifications = [
            n for n in self.sent_notifications 
            if n['timestamp'] > cutoff_time
        ]
        
        # Подсчет уведомлений данного типа за час
        recent_count = len([
            n for n in self.sent_notifications 
            if n['type'] == notification_type
        ])
        
        return recent_count < self.max_per_hour
    
    def record_sent(self, notification_type):
        """Запись отправленного уведомления"""
        self.sent_notifications.append({
            'type': notification_type,
            'timestamp': datetime.now()
        })
```

### 3. Fallback каналы

```python
class MultiChannelNotifier:
    """Уведомления через多个 каналы"""
    
    def __init__(self):
        self.channels = {
            'telegram': TelegramNotifier(),
            'email': EmailNotifier(),
            'sms': SMSNotifier()
        }
    
    def send_critical_notification(self, message):
        """Отправка критического уведомления через все каналы"""
        for channel_name, channel in self.channels.items():
            try:
                channel.send_message(message)
            except Exception as e:
                logging.error(f"Ошибка отправки в {channel_name}: {e}")
```

Уведомления превращают автономный торговый робот в систему, с которой можно взаимодействовать. Правильная настройка уведомлений обеспечивает оперативный контроль и своевременное вмешательство при необходимости.
