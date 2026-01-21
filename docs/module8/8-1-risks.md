---
sidebar_position: 8.1
---

# 8.1. Жесткие риски

Управление рисками - ключевой элемент успешной торговой системы. Даже самая прибыльная стратегия может привести к катастрофе без proper риск-менеджмента.

## Stop-Loss и Take-Profit

Stop-Loss и Take-Profit - базовые инструменты ограничения убытков и фиксации прибыли.

### Реализация в коде

```python
class RiskManager:
    """Менеджер рисков для торгового робота"""
    
    def __init__(self, stop_loss_pct=0.02, take_profit_pct=0.04):
        self.stop_loss_pct = stop_loss_pct
        self.take_profit_pct = take_profit_pct
        self.positions = {}  # {'symbol': {'entry_price': price, 'quantity': qty}}
    
    def set_stops(self, symbol, entry_price, position_type='long'):
        """Установка стоп-лосса и тейк-профита для позиции"""
        if position_type == 'long':
            stop_loss = entry_price * (1 - self.stop_loss_pct)
            take_profit = entry_price * (1 + self.take_profit_pct)
        else:  # short
            stop_loss = entry_price * (1 + self.stop_loss_pct)
            take_profit = entry_price * (1 - self.take_profit_pct)
        
        self.positions[symbol] = {
            'entry_price': entry_price,
            'stop_loss': stop_loss,
            'take_profit': take_profit,
            'type': position_type
        }
    
    def check_stops(self, symbol, current_price):
        """Проверка срабатывания стопов"""
        if symbol not in self.positions:
            return None
        
        position = self.positions[symbol]
        
        if position['type'] == 'long':
            if current_price <= position['stop_loss']:
                return 'STOP_LOSS'
            elif current_price >= position['take_profit']:
                return 'TAKE_PROFIT'
        else:  # short
            if current_price >= position['stop_loss']:
                return 'STOP_LOSS'
            elif current_price <= position['take_profit']:
                return 'TAKE_PROFIT'
        
        return None
    
    def close_position(self, symbol):
        """Закрытие позиции"""
        if symbol in self.positions:
            del self.positions[symbol]
```

## Ограничение потерь на день (Daily Loss Limit)

Защита от катастрофических дней, когда стратегия работает против вас.

```python
class DailyLossLimiter:
    """Ограничитель дневных потерь"""
    
    def __init__(self, max_daily_loss_pct=0.05, initial_capital=100000):
        self.max_daily_loss = initial_capital * max_daily_loss_pct
        self.daily_pnl = 0
        self.day_start = pd.Timestamp.now().date()
    
    def update_pnl(self, pnl_change):
        """Обновление дневного PnL"""
        current_date = pd.Timestamp.now().date()
        
        # Сброс при новом дне
        if current_date != self.day_start:
            self.daily_pnl = 0
            self.day_start = current_date
        
        self.daily_pnl += pnl_change
    
    def should_stop_trading(self):
        """Проверка, нужно ли остановить торговлю"""
        return self.daily_pnl <= -self.max_daily_loss
    
    def get_remaining_loss_limit(self):
        """Получение оставшегося лимита потерь"""
        return self.max_daily_loss + self.daily_pnl  # Положительное значение
```

## Kill Switch (экстренная остановка)

Механизм экстренной остановки всей системы при критических ситуациях.

```python
class KillSwitch:
    """Кнопка экстренной остановки"""
    
    def __init__(self):
        self.is_active = False
        self.activation_reasons = []
        self.kill_file = './kill_switch.txt'
    
    def activate(self, reason):
        """Активация kill switch"""
        self.is_active = True
        self.activation_reasons.append({
            'timestamp': pd.Timestamp.now(),
            'reason': reason
        })
        
        # Создание файла-метки
        with open(self.kill_file, 'w') as f:
            f.write(f"KILL SWITCH ACTIVATED: {reason}\n")
            f.write(f"Time: {pd.Timestamp.now()}\n")
    
    def check_kill_switch(self):
        """Проверка состояния kill switch"""
        # Проверка файла
        if os.path.exists(self.kill_file):
            with open(self.kill_file, 'r') as f:
                content = f.read()
            if "KILL SWITCH ACTIVATED" in content:
                self.is_active = True
        
        return self.is_active
    
    def deactivate(self):
        """Деактивация kill switch"""
        self.is_active = False
        if os.path.exists(self.kill_file):
            os.remove(self.kill_file)
```

## Интеграция с торговым роботом

```python
class SafeTradingBot:
    """Торговый робот с управлением рисками"""
    
    def __init__(self):
        self.risk_manager = RiskManager(stop_loss_pct=0.02, take_profit_pct=0.04)
        self.daily_limiter = DailyLossLimiter(max_daily_loss_pct=0.05)
        self.kill_switch = KillSwitch()
    
    def process_price_update(self, symbol, price):
        """Обработка обновления цены"""
        
        # Проверка kill switch
        if self.kill_switch.check_kill_switch():
            print("KILL SWITCH ACTIVE: Trading stopped")
            return
        
        # Проверка дневного лимита
        if self.daily_limiter.should_stop_trading():
            self.kill_switch.activate("Daily loss limit reached")
            return
        
        # Проверка стопов
        stop_signal = self.risk_manager.check_stops(symbol, price)
        if stop_signal:
            self.execute_stop_order(symbol, stop_signal)
            return
        
        # Обычная логика торговли
        signal = self.generate_signal(symbol, price)
        if signal:
            self.execute_trade(symbol, signal, price)
    
    def execute_trade(self, symbol, signal, price):
        """Исполнение сделки с учетом рисков"""
        if signal == 'BUY':
            # Установка стопов
            self.risk_manager.set_stops(symbol, price, 'long')
            # Отправка ордера
            place_order(symbol, 'BUY', 100)
        
        elif signal == 'SELL':
            # Установка стопов
            self.risk_manager.set_stops(symbol, price, 'short')
            # Отправка ордера
            place_order(symbol, 'SELL', 100)
    
    def execute_stop_order(self, symbol, stop_type):
        """Исполнение стоп-ордера"""
        # Закрытие позиции
        place_market_order(symbol, 'CLOSE')
        self.risk_manager.close_position(symbol)
        
        # Обновление дневного PnL
        pnl_change = calculate_pnl_change(symbol, stop_type)
        self.daily_limiter.update_pnl(pnl_change)
```

## Многоуровневая защита

1. **Уровень позиции**: Stop-Loss/Take-Profit для каждой сделки
2. **Уровень портфеля**: Ограничение концентрации
3. **Уровень дня**: Daily Loss Limit
4. **Уровень системы**: Kill Switch

## Мониторинг рисков

```python
def monitor_risks(bot):
    """Мониторинг рисков в реальном времени"""
    while True:
        # Проверка дневного лимита
        if bot.daily_limiter.should_stop_trading():
            bot.kill_switch.activate("Daily loss limit exceeded")
            send_alert("Daily loss limit reached!")
        
        # Проверка слишком большого количества позиций
        if len(bot.risk_manager.positions) > 10:
            send_alert("Too many open positions!")
        
        # Проверка слишком большой концентрации
        max_position_size = max([pos['quantity'] * pos['entry_price'] 
                               for pos in bot.risk_manager.positions.values()])
        if max_position_size > bot.initial_capital * 0.1:  # >10%
            send_alert("Position concentration too high!")
        
        time.sleep(60)  # Проверка каждую минуту
```

## Лучшие практики

1. **Консервативные стопы**: Лучше узкие стопы, чем широкие
2. **Диверсификация**: Не класть все яйца в одну корзину
3. **Тестирование**: Проверять риск-менеджмент на исторических данных
4. **Мониторинг**: Постоянно следить за рисками
5. **Документация**: Вести логи всех действий

Риск-менеджмент - это не ограничение прибыли, а защита капитала. Правильная система рисков позволяет стратегии переживать трудные времена и продолжать зарабатывать в долгосрочной перспективе.
