---
sidebar_position: 7.2
---

# 7.2. Безопасность

Безопасность - критически важный аспект при работе с торговыми API. Неправильное хранение учетных данных может привести к потере средств или компрометации аккаунта. В этом разделе мы рассмотрим правильные практики хранения и использования токенов доступа.

## Переменные окружения

### Файл .env

```bash
# .env файл в корне проекта
# Никогда не коммитите этот файл в git!

# API ключи
TINKOFF_TOKEN=your_tinkoff_token_here
TINKOFF_SANDBOX_TOKEN=your_sandbox_token_here

# Finam API
FINAM_CLIENT_ID=your_client_id
FINAM_CLIENT_SECRET=your_client_secret
FINAM_ACCESS_TOKEN=your_access_token

# Alor OpenAPI
ALOR_REFRESH_TOKEN=your_refresh_token
ALOR_USERNAME=your_username

# Telegram бот (для уведомлений)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# База данных
DB_HOST=localhost
DB_USER=trading_user
DB_PASSWORD=secure_password
DB_NAME=trading_db
```

### Использование python-dotenv

```python
# Установка
# pip install python-dotenv

import os
from dotenv import load_dotenv

# Загрузка переменных окружения
load_dotenv()

# Получение значений
tinkoff_token = os.getenv('TINKOFF_TOKEN')
finam_client_id = os.getenv('FINAM_CLIENT_ID')
telegram_token = os.getenv('TELEGRAM_BOT_TOKEN')

# Проверка наличия обязательных переменных
required_vars = ['TINKOFF_TOKEN', 'FINAM_CLIENT_ID', 'TELEGRAM_BOT_TOKEN']
missing_vars = [var for var in required_vars if not os.getenv(var)]

if missing_vars:
    raise ValueError(f"Отсутствуют обязательные переменные окружения: {missing_vars}")
```

## Шифрование чувствительных данных

### Fernet шифрование

```python
from cryptography.fernet import Fernet
import base64
import os

class SecureStorage:
    """Безопасное хранение данных"""
    
    def __init__(self, key_file='.encryption_key'):
        self.key_file = key_file
        self.key = self._load_or_create_key()
        self.cipher = Fernet(self.key)
    
    def _load_or_create_key(self):
        """Загрузка или создание ключа шифрования"""
        if os.path.exists(self.key_file):
            with open(self.key_file, 'rb') as f:
                return f.read()
        else:
            # Создание нового ключа
            key = Fernet.generate_key()
            with open(self.key_file, 'wb') as f:
                f.write(key)
            return key
    
    def encrypt_token(self, token):
        """Шифрование токена"""
        return self.cipher.encrypt(token.encode()).decode()
    
    def decrypt_token(self, encrypted_token):
        """Расшифровка токена"""
        return self.cipher.decrypt(encrypted_token.encode()).decode()

# Использование
storage = SecureStorage()

# Шифрование
encrypted_token = storage.encrypt_token('your_secret_token')

# Сохранение в файл
with open('.encrypted_tokens', 'w') as f:
    f.write(f"TINKOFF_TOKEN={encrypted_token}\n")

# Расшифровка при использовании
with open('.encrypted_tokens', 'r') as f:
    for line in f:
        if line.startswith('TINKOFF_TOKEN='):
            encrypted = line.split('=')[1].strip()
            token = storage.decrypt_token(encrypted)
            break
```

## Безопасное хранение в коде

### Избегайте этих ошибок

```python
# ❌ ПЛОХО: токены в коде
TINKOFF_TOKEN = "t.sandbox_token_here"  # Видно всем!

# ❌ ПЛОХО: в конфигурационном файле без защиты
# config.json
{
  "tinkoff_token": "t.sandbox_token_here"
}

# ❌ ПЛОХО: логирование токенов
logger.info(f"Using token: {token}")  # Токен в логах!
```

### Правильные практики

```python
# ✅ ХОРОШО: переменные окружения
import os
token = os.getenv('TINKOFF_TOKEN')

# ✅ ХОРОШО: валидация токенов
def validate_token(token):
    """Проверка корректности токена"""
    if not token:
        raise ValueError("Токен не найден")
    
    if len(token) < 50:  # Минимальная длина
        raise ValueError("Некорректный токен")
    
    # Дополнительные проверки формата
    return True

# ✅ ХОРОШО: безопасное логирование
logger.info("Токен загружен успешно")  # Без самого токена
logger.debug(f"Token length: {len(token)}")  # Только длина
```

## Защита от компрометации

### Ограничение прав доступа

```bash
# Установка правильных прав на .env файл
chmod 600 .env

# Проверка
ls -la .env
# -rw------- 1 user user ... .env
```

### .gitignore для чувствительных файлов

```bash
# .gitignore
# Переменные окружения
.env
.env.local
.env.production

# Ключи шифрования
.encryption_key
*.key

# Логи с чувствительной информацией
*debug*.log
*error*.log

# Базы данных
*.db
*.sqlite
```

## Ротация токенов

```python
import time
from datetime import datetime, timedelta

class TokenManager:
    """Менеджер токенов с автоматической ротацией"""
    
    def __init__(self):
        self.tokens = {}
        self.expiry_times = {}
        self.refresh_intervals = {
            'tinkoff': timedelta(hours=24),
            'finam': timedelta(hours=1),
            'alor': timedelta(hours=24)
        }
    
    def get_token(self, service):
        """Получение актуального токена"""
        if self._is_token_expired(service):
            self._refresh_token(service)
        
        return self.tokens.get(service)
    
    def _is_token_expired(self, service):
        """Проверка истечения токена"""
        if service not in self.expiry_times:
            return True
        
        return datetime.now() > self.expiry_times[service]
    
    def _refresh_token(self, service):
        """Обновление токена"""
        try:
            if service == 'tinkoff':
                new_token = self._refresh_tinkoff_token()
            elif service == 'finam':
                new_token = self._refresh_finam_token()
            # ...
            
            self.tokens[service] = new_token
            self.expiry_times[service] = datetime.now() + self.refresh_intervals[service]
            
            logger.info(f"Токен для {service} обновлен")
            
        except Exception as e:
            logger.error(f"Ошибка обновления токена {service}: {e}")
            raise
    
    def _refresh_tinkoff_token(self):
        """Обновление токена Tinkoff"""
        # Логика обновления через refresh token
        # return new_token
        pass

# Использование
token_manager = TokenManager()

# Получение токена (автоматически обновляется при необходимости)
token = token_manager.get_token('tinkoff')
```

## Мониторинг безопасности

```python
class SecurityMonitor:
    """Монитор безопасности"""
    
    def __init__(self):
        self.failed_attempts = {}
        self.suspicious_activity = []
    
    def log_api_call(self, service, success):
        """Логирование API вызовов"""
        if not success:
            self.failed_attempts[service] = self.failed_attempts.get(service, 0) + 1
            
            if self.failed_attempts[service] > 5:
                self._alert_security_issue(service)
    
    def check_token_exposure(self, log_files):
        """Проверка на утечку токенов в логах"""
        sensitive_patterns = [
            r't\.[a-zA-Z0-9_-]{50,}',  # Tinkoff токены
            r'[a-f0-9]{32,}',  # MD5 хэши
            # Другие паттерны
        ]
        
        for log_file in log_files:
            with open(log_file, 'r') as f:
                for line_num, line in enumerate(f, 1):
                    for pattern in sensitive_patterns:
                        if re.search(pattern, line):
                            self.suspicious_activity.append({
                                'file': log_file,
                                'line': line_num,
                                'pattern': pattern,
                                'line_content': line.strip()
                            })
    
    def _alert_security_issue(self, service):
        """Оповещение о проблеме безопасности"""
        logger.critical(f"Множественные неудачные попытки для {service}")
        # Отправка алерта администратору
        send_security_alert(f"Обнаружена подозрительная активность для {service}")

# Использование
security_monitor = SecurityMonitor()

# После каждого API вызова
success = make_api_call(token)
security_monitor.log_api_call('tinkoff', success)

# Периодическая проверка логов
security_monitor.check_token_exposure(['trading_bot.log', 'api_calls.log'])
```

## Лучшие практики

1. **Никогда не храните секреты в коде**
2. **Используйте переменные окружения**
3. **Шифруйте чувствительные данные**
4. **Регулярно обновляйте токены**
5. **Мониторьте использование API**
6. **Ограничивайте права доступа к файлам**
7. **Ведите аудит логов**

Безопасность - это процесс, а не одноразовая настройка. Регулярно проверяйте и обновляйте меры безопасности вашего торгового робота.
