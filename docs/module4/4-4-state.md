---
sidebar_position: 4.4
---

# 4.4. Управление состоянием (State Machine)

Управление состоянием - критически важная часть торгового робота. State Machine предотвращает дублирующие сделки, обеспечивает корректную последовательность операций и позволяет безопасно останавливать/запускать торговлю.

## Основные состояния робота

```python
from enum import Enum

class BotState(Enum):
    WAITING = "waiting"          # Ожидание сигнала
    IN_POSITION = "in_position"   # В позиции
    STOPPED = "stopped"          # Остановлен
    ERROR = "error"              # Ошибка
```

## Реализация State Machine

```python
class TradingStateMachine:
    """Машина состояний для торгового робота"""
    
    def __init__(self):
        self.state = BotState.WAITING
        self.position = 0  # 0 - нет позиции, 1 - лонг, -1 - шорт
        self.entry_price = 0
        self.stop_loss = 0
        self.take_profit = 0
    
    def transition(self, signal, current_price):
        """Переход между состояниями на основе сигнала"""
        
        if self.state == BotState.STOPPED:
            # Из остановленного состояния можно только запустить
            if signal == "START":
                self.state = BotState.WAITING
                return "Бот запущен"
            return "Бот остановлен"
        
        elif self.state == BotState.WAITING:
            if signal == "BUY" and self.position == 0:
                # Открываем длинную позицию
                self.position = 1
                self.entry_price = current_price
                self.state = BotState.IN_POSITION
                self._set_stops(current_price)
                return "Открыта длинная позиция"
            
            elif signal == "SELL" and self.position == 0:
                # Открываем короткую позицию
                self.position = -1
                self.entry_price = current_price
                self.state = BotState.IN_POSITION
                self._set_stops(current_price)
                return "Открыта короткая позиция"
            
            elif signal == "STOP":
                self.state = BotState.STOPPED
                return "Бот остановлен"
        
        elif self.state == BotState.IN_POSITION:
            # Проверяем стоп-лосс и тейк-профит
            if self._check_stops(current_price):
                self.position = 0
                self.state = BotState.WAITING
                return "Позиция закрыта по стопу/таргету"
            
            # Закрываем позицию по сигналу
            if ((signal == "SELL" and self.position == 1) or 
                (signal == "BUY" and self.position == -1)):
                self.position = 0
                self.state = BotState.WAITING
                return "Позиция закрыта по сигналу"
            
            elif signal == "STOP":
                self._close_position(current_price)
                self.state = BotState.STOPPED
                return "Бот остановлен с закрытием позиции"
        
        return "Нет действий"
    
    def _set_stops(self, entry_price):
        """Установка стоп-лосса и тейк-профита"""
        stop_distance = entry_price * 0.02  # 2% стоп
        
        if self.position == 1:  # Лонг
            self.stop_loss = entry_price - stop_distance
            self.take_profit = entry_price + stop_distance * 2  # 4% таргет
        else:  # Шорт
            self.stop_loss = entry_price + stop_distance
            self.take_profit = entry_price - stop_distance * 2
    
    def _check_stops(self, current_price):
        """Проверка срабатывания стопов"""
        if self.position == 1:  # Лонг
            return current_price <= self.stop_loss or current_price >= self.take_profit
        elif self.position == -1:  # Шорт
            return current_price >= self.stop_loss or current_price <= self.take_profit
        return False
    
    def _close_position(self, current_price):
        """Закрытие позиции по рынку"""
        # Здесь код для закрытия позиции
        self.position = 0
        self.entry_price = 0
    
    def get_status(self):
        """Получение текущего статуса"""
        return {
            'state': self.state.value,
            'position': self.position,
            'entry_price': self.entry_price,
            'stop_loss': self.stop_loss,
            'take_profit': self.take_profit
        }
```

## Предотвращение дублирующих сделок

### Проблема дубликатов

```python
# Плохой пример - может открыть несколько позиций
class BadBot:
    def __init__(self):
        self.has_position = False
    
    def process_signal(self, signal):
        if signal == "BUY":
            # Нет проверки на существующую позицию!
            place_order("BUY", 100)  # Может выполниться несколько раз
            self.has_position = True
```

### Решение с State Machine

```python
class SafeBot:
    def __init__(self):
        self.state_machine = TradingStateMachine()
    
    def process_signal(self, signal, price):
        # State Machine сама проверит корректность перехода
        result = self.state_machine.transition(signal, price)
        
        if "позиция" in result.lower():
            # Выполняем ордер только если состояние изменилось
            if "открыта" in result.lower():
                place_order(signal, 100)
            elif "закрыта" in result.lower():
                place_order("CLOSE", 100)
        
        return result
```

## Расширенные состояния

```python
class AdvancedBotState(Enum):
    WAITING = "waiting"
    ENTRY_PENDING = "entry_pending"      # Ожидание исполнения входа
    IN_POSITION = "in_position"          # В позиции
    EXIT_PENDING = "exit_pending"        # Ожидание исполнения выхода
    STOPPED = "stopped"
    ERROR = "error"
    MAINTENANCE = "maintenance"          # Техническое обслуживание

class AdvancedStateMachine(TradingStateMachine):
    """Расширенная машина состояний"""
    
    def __init__(self):
        super().__init__()
        self.pending_orders = []  # Ожидающие исполнения ордера
    
    def transition(self, event, data):
        """Обработка событий с дополнительными состояниями"""
        
        if isinstance(event, dict):
            event_type = event.get('type')
            order_id = event.get('order_id')
            price = data.get('price', 0)
        else:
            event_type = event
            order_id = None
            price = data if isinstance(data, (int, float)) else 0
        
        # Обработка исполнения ордеров
        if event_type == "ORDER_FILLED":
            if self.state == BotState.ENTRY_PENDING:
                self.state = BotState.IN_POSITION
                return "Вход выполнен"
            elif self.state == BotState.EXIT_PENDING:
                self.state = BotState.WAITING
                self.position = 0
                return "Выход выполнен"
        
        # Основная логика переходов
        return super().transition(event_type, price)
```

## Мониторинг состояния

```python
class StateMonitor:
    """Мониторинг состояния робота"""
    
    def __init__(self, state_machine):
        self.state_machine = state_machine
        self.state_history = []
    
    def log_state_change(self, old_state, new_state, reason):
        """Логирование изменения состояния"""
        timestamp = pd.Timestamp.now()
        self.state_history.append({
            'timestamp': timestamp,
            'old_state': old_state,
            'new_state': new_state,
            'reason': reason
        })
    
    def get_state_summary(self):
        """Получение сводки по состояниям"""
        if not self.state_history:
            return {}
        
        df = pd.DataFrame(self.state_history)
        summary = df.groupby('new_state').size()
        return summary.to_dict()
    
    def detect_anomalies(self):
        """Обнаружение аномалий в состояниях"""
        # Проверка на слишком частые переходы
        recent_changes = [h for h in self.state_history 
                         if (pd.Timestamp.now() - h['timestamp']).seconds < 300]
        
        if len(recent_changes) > 10:  # Более 10 изменений за 5 минут
            return "Частые изменения состояния - возможная ошибка"
        
        return None
```

## Лучшие практики

1. **Явные состояния** - используйте Enum для определения состояний
2. **Валидация переходов** - проверяйте корректность каждого перехода
3. **Логирование** - ведите подробный лог всех изменений состояния
4. **Обработка ошибок** - предусмотрите состояние ERROR
5. **Тестирование** - пишите тесты для всех переходов между состояниями

State Machine делает поведение робота предсказуемым и безопасным, предотвращая costly ошибки в торговле.
