---
sidebar_position: 6.4
---

# 6.4. Отказоустойчивость

Отказоустойчивость - способность системы продолжать работу при возникновении ошибок. В реальных условиях торговый робот может столкнуться с сетевыми проблемами, отказами API, сбоями в данных. Правильная обработка исключений и механизм реконнекта обеспечивают надежную работу.

## Обработка исключений

### Базовая структура try...except

```python
import logging

logger = logging.getLogger('ResilientBot')

def safe_api_call():
    """Безопасный вызов API"""
    try:
        # Попытка выполнить операцию
        result = api_call_that_might_fail()
        return result
        
    except ConnectionError as e:
        # Обработка сетевых ошибок
        logger.error(f"Ошибка соединения: {e}")
        return None
        
    except TimeoutError as e:
        # Обработка таймаутов
        logger.error(f"Таймаут запроса: {e}")
        return None
        
    except APIError as e:
        # Обработка ошибок API
        logger.error(f"Ошибка API: {e}")
        return None
        
    except Exception as e:
        # Обработка неожиданных ошибок
        logger.critical(f"Неожиданная ошибка: {e}")
        return None
```

### Иерархия исключений

```python
class TradingException(Exception):
    """Базовое исключение для торгового робота"""
    pass

class NetworkException(TradingException):
    """Сетевые ошибки"""
    pass

class APIException(TradingException):
    """Ошибки API"""
    pass

class DataException(TradingException):
    """Ошибки данных"""
    pass

# Использование
try:
    data = fetch_market_data()
    if not validate_data(data):
        raise DataException("Некорректные данные")
        
except NetworkException as e:
    logger.error(f"Сетевая ошибка: {e}")
    # Попытка реконнекта
    
except APIException as e:
    logger.error(f"Ошибка API: {e}")
    # Повтор запроса или смена API
    
except DataException as e:
    logger.error(f"Ошибка данных: {e}")
    # Использование резервных данных
    
except TradingException as e:
    logger.error(f"Торговая ошибка: {e}")
    # Общая обработка торговых ошибок
```

## Механизм реконнекта

### Exponential Backoff

```python
import time
import random

class ReconnectionManager:
    """Менеджер реконнекта с exponential backoff"""
    
    def __init__(self, max_attempts=10, base_delay=1, max_delay=300):
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.attempt = 0
    
    def should_retry(self):
        """Проверка, следует ли повторять попытку"""
        return self.attempt < self.max_attempts
    
    def get_delay(self):
        """Расчет задержки перед следующей попыткой"""
        if self.attempt == 0:
            return 0
        
        # Exponential backoff с jitter
        delay = min(self.base_delay * (2 ** self.attempt), self.max_delay)
        jitter = random.uniform(0, delay * 0.1)  # Добавляем случайность
        return delay + jitter
    
    def reset(self):
        """Сброс счетчика попыток"""
        self.attempt = 0
    
    def record_attempt(self):
        """Запись попытки"""
        self.attempt += 1

# Использование
reconnector = ReconnectionManager()

while reconnector.should_retry():
    try:
        # Попытка подключения
        connect_to_api()
        reconnector.reset()  # Успех - сбрасываем счетчик
        break
        
    except ConnectionError:
        delay = reconnector.get_delay()
        logger.warning(f"Попытка {reconnector.attempt + 1} не удалась, ждем {delay:.1f} сек")
        
        reconnector.record_attempt()
        time.sleep(delay)

if reconnector.attempt >= reconnector.max_attempts:
    logger.error("Не удалось подключиться после всех попыток")
    # Активация резервного плана
```

### Circuit Breaker Pattern

```python
class CircuitBreaker:
    """Предохранитель для предотвращения каскадных сбоев"""
    
    def __init__(self, failure_threshold=5, recovery_timeout=60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = 'CLOSED'  # CLOSED, OPEN, HALF_OPEN
    
    def call(self, func, *args, **kwargs):
        """Вызов функции через предохранитель"""
        if self.state == 'OPEN':
            if self._should_attempt_reset():
                self.state = 'HALF_OPEN'
            else:
                raise CircuitBreakerOpen("Предохранитель сработал")
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
            
        except Exception as e:
            self._on_failure()
            raise e
    
    def _should_attempt_reset(self):
        """Проверка, пора ли пытаться сбросить"""
        if self.last_failure_time is None:
            return True
        
        time_since_failure = time.time() - self.last_failure_time
        return time_since_failure >= self.recovery_timeout
    
    def _on_success(self):
        """Обработка успешного вызова"""
        if self.state == 'HALF_OPEN':
            self.state = 'CLOSED'
            self.failure_count = 0
    
    def _on_failure(self):
        """Обработка неудачного вызова"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = 'OPEN'

# Использование
circuit_breaker = CircuitBreaker()

def safe_api_call():
    return circuit_breaker.call(api_call_that_might_fail)

try:
    result = safe_api_call()
except CircuitBreakerOpen:
    logger.warning("API недоступен, используем кэшированные данные")
    result = get_cached_data()
```

## Резервные системы

### Fallback стратегии

```python
class FallbackManager:
    """Менеджер резервных стратегий"""
    
    def __init__(self):
        self.primary_source = PrimaryDataSource()
        self.backup_sources = [
            BackupDataSource1(),
            BackupDataSource2(),
            CachedDataSource()
        ]
    
    def get_data(self, symbol):
        """Получение данных с fallback"""
        # Сначала пытаемся получить из основного источника
        try:
            return self.primary_source.get_data(symbol)
        except Exception as e:
            logger.warning(f"Основной источник недоступен: {e}")
        
        # Пробуем резервные источники
        for backup in self.backup_sources:
            try:
                logger.info(f"Пробуем резервный источник: {backup.__class__.__name__}")
                return backup.get_data(symbol)
            except Exception as e:
                logger.warning(f"Резервный источник тоже недоступен: {e}")
                continue
        
        # Все источники недоступны
        logger.error("Все источники данных недоступны")
        raise DataUnavailableError("Нет доступных источников данных")

# Использование
fallback_manager = FallbackManager()

try:
    data = fallback_manager.get_data('SBER')
except DataUnavailableError:
    # Используем последние известные данные или останавливаемся
    logger.critical("Критическая ошибка: данные недоступны")
```

### Graceful Degradation

```python
class GracefulDegradationManager:
    """Менеджер graceful degradation"""
    
    def __init__(self):
        self.full_mode = True  # Полный функционал
        self.degraded_features = set()
    
    def handle_failure(self, feature, error):
        """Обработка сбоя в функционале"""
        logger.error(f"Сбой в {feature}: {error}")
        self.degraded_features.add(feature)
        
        # Переход в degraded mode
        self.full_mode = False
        
        # Отключение зависимых функций
        if feature == 'realtime_data':
            self.disable_feature('high_frequency_trading')
        elif feature == 'api_connection':
            self.disable_feature('live_trading')
    
    def disable_feature(self, feature):
        """Отключение функции"""
        logger.warning(f"Отключаем функцию: {feature}")
        self.degraded_features.add(feature)
        
        # Логика отключения
        if feature == 'live_trading':
            # Переход в paper trading mode
            switch_to_paper_trading()
        elif feature == 'high_frequency_trading':
            # Переход на низкочастотную торговлю
            switch_to_low_frequency_trading()
    
    def can_use_feature(self, feature):
        """Проверка доступности функции"""
        return feature not in self.degraded_features
    
    def attempt_recovery(self, feature):
        """Попытка восстановления функции"""
        try:
            if self._test_feature(feature):
                self.degraded_features.discard(feature)
                logger.info(f"Функция восстановлена: {feature}")
                
                # Проверка возможности возврата в full mode
                if not self.degraded_features:
                    self.full_mode = True
                    logger.info("Полный функционал восстановлен")
                
        except Exception as e:
            logger.debug(f"Восстановление {feature} не удалось: {e}")
    
    def _test_feature(self, feature):
        """Тестирование функции"""
        # Имитация тестирования
        return True  # или False в случае неудачи

# Использование
degradation_manager = GracefulDegradationManager()

# При возникновении ошибки
try:
    realtime_data = get_realtime_data()
except ConnectionError as e:
    degradation_manager.handle_failure('realtime_data', str(e))

# Проверка перед использованием
if degradation_manager.can_use_feature('high_frequency_trading'):
    # Выполняем высокочастотную торговлю
    high_frequency_trade()
else:
    # Используем альтернативную стратегию
    low_frequency_trade()
```

## Мониторинг здоровья системы

### Health Checks

```python
class HealthMonitor:
    """Монитор здоровья системы"""
    
    def __init__(self):
        self.components = {}
        self.alerts = []
    
    def register_component(self, name, health_check_func):
        """Регистрация компонента для мониторинга"""
        self.components[name] = health_check_func
    
    def check_health(self):
        """Проверка здоровья всех компонентов"""
        health_status = {}
        
        for name, check_func in self.components.items():
            try:
                status = check_func()
                health_status[name] = status
                
                if not status['healthy']:
                    self._trigger_alert(name, status)
                    
            except Exception as e:
                health_status[name] = {'healthy': False, 'error': str(e)}
                self._trigger_alert(name, health_status[name])
        
        return health_status
    
    def _trigger_alert(self, component, status):
        """Создание алерта"""
        alert = {
            'timestamp': datetime.now(),
            'component': component,
            'status': status
        }
        
        self.alerts.append(alert)
        logger.warning(f"Проблема со здоровьем компонента {component}: {status}")

# Использование
health_monitor = HealthMonitor()

# Регистрация компонентов
health_monitor.register_component('database', check_database_health)
health_monitor.register_component('api_connection', check_api_health)
health_monitor.register_component('trading_engine', check_engine_health)

# Периодическая проверка
while True:
    health_status = health_monitor.check_health()
    
    # Если есть проблемы, предпринимаем действия
    if any(not status['healthy'] for status in health_status.values()):
        handle_health_issues(health_status)
    
    time.sleep(30)  # Проверка каждые 30 секунд
```

## Лучшие практики

1. **Защитное программирование**: Всегда ожидайте worst-case сценарии
2. **Graceful degradation**: Лучше ограниченный функционал, чем полный сбой
3. **Circuit breakers**: Предотвращение каскадных сбоев
4. **Мониторинг**: Постоянное отслеживание состояния системы
5. **Тестирование**: Регулярное тестирование сценариев отказов

Отказоустойчивость - это не предотвращение сбоев, а правильная реакция на них. Хорошо спроектированная система может продолжать работу даже при серьезных проблемах.
