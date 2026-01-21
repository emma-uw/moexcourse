---
sidebar_position: 8.2
---

# 8.2. Логирование

Логирование - основа надежной работы торгового робота. Без подробных логов невозможно понять, что происходило во время работы системы, особенно при возникновении проблем.

## Базовое использование logging

```python
import logging

# Настройка базового логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),  # Вывод в консоль
        logging.FileHandler('trading_bot.log')  # Запись в файл
    ]
)

# Создание логгера
logger = logging.getLogger('TradingBot')

# Использование
logger.info('Бот запущен')
logger.warning('Обнаружена высокая волатильность')
logger.error('Ошибка подключения к API')
```

## Продвинутая настройка

### Различные уровни логирования

```python
import logging

# Уровни (от низкого к высокому):
# DEBUG - детальная информация для отладки
# INFO - общая информация о работе
# WARNING - предупреждения
# ERROR - ошибки
# CRITICAL - критические ошибки

logger = logging.getLogger('TradingBot')
logger.setLevel(logging.DEBUG)

# Создание обработчика для файла
file_handler = logging.FileHandler('trading_bot.log')
file_handler.setLevel(logging.DEBUG)

# Создание обработчика для консоли
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)

# Форматирование
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s'
)
file_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)

# Добавление обработчиков
logger.addHandler(file_handler)
logger.addHandler(console_handler)
```

### Структурированное логирование

```python
import json
import logging

class StructuredLogger:
    """Логгер с структурированным выводом"""
    
    def __init__(self, name):
        self.logger = logging.getLogger(name)
        
        # JSON formatter
        class JSONFormatter(logging.Formatter):
            def format(self, record):
                log_entry = {
                    'timestamp': self.formatTime(record),
                    'level': record.levelname,
                    'logger': record.name,
                    'message': record.getMessage(),
                    'function': record.funcName,
                    'line': record.lineno
                }
                
                # Добавление дополнительных полей
                if hasattr(record, 'extra_data'):
                    log_entry.update(record.extra_data)
                
                return json.dumps(log_entry, ensure_ascii=False)
        
        # Настройка
        handler = logging.FileHandler('structured.log')
        handler.setFormatter(JSONFormatter())
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)
    
    def log_trade(self, trade_data):
        """Логирование сделки"""
        self.logger.info(
            f"Trade executed: {trade_data['symbol']} {trade_data['side']} {trade_data['quantity']} @ {trade_data['price']}",
            extra={'extra_data': trade_data}
        )
    
    def log_signal(self, signal_data):
        """Логирование сигнала"""
        self.logger.info(
            f"Signal generated: {signal_data['strategy']} {signal_data['signal']}",
            extra={'extra_data': signal_data}
        )

# Использование
structured_logger = StructuredLogger('TradingBot')

# Логирование сделки
trade = {
    'symbol': 'SBER',
    'side': 'BUY',
    'quantity': 100,
    'price': 150.5,
    'timestamp': '2023-01-01 10:00:00'
}
structured_logger.log_trade(trade)
```

## Логирование для торгового робота

### Ключевые события для логирования

```python
class TradingBotLogger:
    """Специализированный логгер для торгового робота"""
    
    def __init__(self):
        self.logger = logging.getLogger('TradingBot')
        self.setup_logging()
    
    def setup_logging(self):
        """Настройка логирования"""
        # Создание форматтера
        formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s'
        )
        
        # Файловый обработчик
        file_handler = logging.FileHandler('trading_bot.log')
        file_handler.setFormatter(formatter)
        file_handler.setLevel(logging.DEBUG)
        
        # Обработчик для ошибок
        error_handler = logging.FileHandler('trading_errors.log')
        error_handler.setFormatter(formatter)
        error_handler.setLevel(logging.ERROR)
        
        # Настройка логгера
        self.logger.setLevel(logging.DEBUG)
        self.logger.addHandler(file_handler)
        self.logger.addHandler(error_handler)
    
    def log_startup(self, config):
        """Логирование запуска"""
        self.logger.info("=" * 50)
        self.logger.info("Торговый робот запущен")
        self.logger.info(f"Конфигурация: {config}")
        self.logger.info("=" * 50)
    
    def log_signal(self, strategy_name, signal, price, reason=""):
        """Логирование сигнала"""
        self.logger.info(
            f"Сигнал от {strategy_name}: {signal} @ {price} | {reason}"
        )
    
    def log_order(self, order_data):
        """Логирование ордера"""
        self.logger.info(
            f"Ордер: {order_data['side']} {order_data['quantity']} {order_data['symbol']} @ {order_data['price']}"
        )
    
    def log_execution(self, execution_data):
        """Логирование исполнения"""
        self.logger.info(
            f"Исполнение: {execution_data['symbol']} {execution_data['side']} {execution_data['quantity']} @ {execution_data['price']}"
        )
    
    def log_pnl(self, pnl_data):
        """Логирование PnL"""
        self.logger.info(
            f"PnL: Общий={pnl_data['total']:.2f}, Сегодня={pnl_data['daily']:.2f}"
        )
    
    def log_error(self, error, context=""):
        """Логирование ошибки"""
        self.logger.error(f"Ошибка: {error} | Контекст: {context}")
    
    def log_shutdown(self, reason=""):
        """Логирование завершения"""
        self.logger.info("=" * 50)
        self.logger.info(f"Торговый робот остановлен: {reason}")
        self.logger.info("=" * 50)

# Использование в боте
class TradingBot:
    def __init__(self):
        self.logger = TradingBotLogger()
    
    def start(self):
        self.logger.log_startup({"symbol": "SBER", "strategy": "MeanReversion"})
        
        try:
            while True:
                # Получение данных
                price = self.get_price()
                
                # Генерация сигнала
                signal = self.generate_signal(price)
                if signal:
                    self.logger.log_signal("MeanReversion", signal, price)
                    
                    # Создание ордера
                    order = self.create_order(signal, price)
                    self.logger.log_order(order)
                    
                    # Исполнение
                    execution = self.execute_order(order)
                    self.logger.log_execution(execution)
                
                # Логирование PnL
                pnl = self.calculate_pnl()
                self.logger.log_pnl(pnl)
                
                time.sleep(60)  # Проверка раз в минуту
                
        except Exception as e:
            self.logger.log_error(str(e), "main_loop")
        finally:
            self.logger.log_shutdown("Exception occurred")
```

## Ротация логов

```python
from logging.handlers import RotatingFileHandler

# Ротация логов по размеру
rotating_handler = RotatingFileHandler(
    'trading_bot.log',
    maxBytes=10*1024*1024,  # 10 MB
    backupCount=5  # Хранить 5 файлов
)
rotating_handler.setFormatter(logging.Formatter(
    '%(asctime)s - %(levelname)s - %(message)s'
))

logger = logging.getLogger('TradingBot')
logger.addHandler(rotating_handler)
```

## Мониторинг логов

### Простой монитор

```python
def monitor_logs(log_file):
    """Мониторинг логов в реальном времени"""
    with open(log_file, 'r') as f:
        f.seek(0, 2)  # Переход в конец файла
        
        while True:
            line = f.readline()
            if line:
                # Анализ строки лога
                if 'ERROR' in line:
                    send_alert(f"Обнаружена ошибка: {line.strip()}")
                elif 'CRITICAL' in line:
                    send_alert(f"Критическая ошибка: {line.strip()}")
            
            time.sleep(0.1)

# Запуск мониторинга в отдельном потоке
import threading
monitor_thread = threading.Thread(target=monitor_logs, args=('trading_bot.log',))
monitor_thread.daemon = True
monitor_thread.start()
```

## Лучшие практики

1. **Уровни логирования**: Используйте разные уровни для разных типов сообщений
2. **Структурированные логи**: Добавляйте контекстную информацию
3. **Ротация**: Настраивайте автоматическую ротацию логов
4. **Мониторинг**: Настраивайте оповещения об ошибках
5. **Производительность**: Не логируйте в критичных циклах

## Анализ логов

### Поиск проблем

```python
def analyze_logs(log_file, days=7):
    """Анализ логов за период"""
    import datetime
    
    end_date = datetime.datetime.now()
    start_date = end_date - datetime.timedelta(days=days)
    
    error_count = 0
    warning_count = 0
    trade_count = 0
    
    with open(log_file, 'r') as f:
        for line in f:
            # Проверка даты
            # ... парсинг даты из строки
            
            if 'ERROR' in line:
                error_count += 1
            elif 'WARNING' in line:
                warning_count += 1
            elif 'Trade executed' in line:
                trade_count += 1
    
    return {
        'errors': error_count,
        'warnings': warning_count,
        'trades': trade_count,
        'period_days': days
    }
```

Логи - это "черный ящик" вашего робота. Хорошее логирование позволяет быстро находить и исправлять проблемы, улучшать стратегию и обеспечивать надежную работу системы.
