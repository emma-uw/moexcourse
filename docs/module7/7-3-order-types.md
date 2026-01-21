---
sidebar_position: 7.3
---

# 7.3. Типы заявок

Выбор типа заявки критически важен для успеха алгоритмической торговли. Разные типы ордеров имеют свои преимущества и недостатки. Неправильный выбор может привести к проскальзыванию, невыполнению ордеров или излишним комиссиям.

## Основные типы заявок

### Рыночные заявки (Market Orders)

**Принцип работы:**
- Исполняются по лучшей доступной цене
- Гарантированное исполнение (если есть ликвидность)
- Могут исполниться по нескольким ценовым уровням

```python
class MarketOrder:
    """Рыночная заявка"""
    
    def __init__(self, symbol, side, quantity):
        self.symbol = symbol
        self.side = side  # 'BUY' or 'SELL'
        self.quantity = quantity
        self.order_type = 'market'
    
    def execute(self, api_client):
        """Исполнение рыночной заявки"""
        return api_client.place_market_order(
            symbol=self.symbol,
            side=self.side,
            quantity=self.quantity
        )

# Пример использования
market_order = MarketOrder('SBER', 'BUY', 100)
result = market_order.execute(tinkoff_api)
```

**Преимущества:**
- Быстрое исполнение
- Гарантированное выполнение
- Простота использования

**Недостатки:**
- Проскальзывание (slippage)
- Неизвестная цена исполнения
- Риск исполнения по худшей цене

### Лимитные заявки (Limit Orders)

**Принцип работы:**
- Устанавливают максимальную/минимальную цену исполнения
- Могут не исполниться, если цена не достигнет уровня
- Экономят на комиссиях в некоторых тарифах

```python
class LimitOrder:
    """Лимитная заявка"""
    
    def __init__(self, symbol, side, quantity, price):
        self.symbol = symbol
        self.side = side  # 'BUY' or 'SELL'
        self.quantity = quantity
        self.price = price  # Желаемая цена
        self.order_type = 'limit'
    
    def execute(self, api_client):
        """Исполнение лимитной заявки"""
        return api_client.place_limit_order(
            symbol=self.symbol,
            side=self.side,
            quantity=self.quantity,
            price=self.price
        )

# Пример использования
limit_order = LimitOrder('SBER', 'BUY', 100, 150.50)
result = limit_order.execute(tinkoff_api)
```

**Преимущества:**
- Контроль цены исполнения
- Экономия на комиссиях
- Лучшая цена при исполнении

**Недостатки:**
- Риск неисполнения
- Не подходит для срочных сделок
- Требует мониторинга

## Продвинутые типы заявок

### Stop-Loss заявки

```python
class StopLossOrder:
    """Стоп-лосс заявка"""
    
    def __init__(self, symbol, quantity, stop_price, side='SELL'):
        self.symbol = symbol
        self.quantity = quantity
        self.stop_price = stop_price  # Цена активации
        self.side = side
    
    def should_trigger(self, current_price):
        """Проверка активации стоп-лосса"""
        if self.side == 'SELL':
            return current_price <= self.stop_price
        else:  # BUY для коротких позиций
            return current_price >= self.stop_price
    
    def execute(self, api_client):
        """Исполнение стоп-лосса"""
        return api_client.place_market_order(
            symbol=self.symbol,
            side=self.side,
            quantity=self.quantity
        )
```

### Take-Profit заявки

```python
class TakeProfitOrder:
    """Тейк-профит заявка"""
    
    def __init__(self, symbol, quantity, target_price, side='SELL'):
        self.symbol = symbol
        self.quantity = quantity
        self.target_price = target_price
        self.side = side
    
    def should_trigger(self, current_price):
        """Проверка достижения цели"""
        if self.side == 'SELL':
            return current_price >= self.target_price
        else:  # BUY для закрытия короткой позиции
            return current_price <= self.target_price
```

### Iceberg заявки

```python
class IcebergOrder:
    """Айсберг-заявка (показывает только часть объема)"""
    
    def __init__(self, symbol, side, total_quantity, price, visible_quantity):
        self.symbol = symbol
        self.side = side
        self.total_quantity = total_quantity
        self.remaining_quantity = total_quantity
        self.price = price
        self.visible_quantity = visible_quantity
    
    def execute_next_chunk(self, api_client):
        """Исполнение следующей части заявки"""
        if self.remaining_quantity <= 0:
            return None
        
        chunk_size = min(self.visible_quantity, self.remaining_quantity)
        
        order = api_client.place_limit_order(
            symbol=self.symbol,
            side=self.side,
            quantity=chunk_size,
            price=self.price
        )
        
        self.remaining_quantity -= chunk_size
        return order
```

## Выбор типа заявки для алготрейдинга

### Стратегии с высокой частотой

```python
class HighFrequencyStrategy:
    """Высокочастотная стратегия"""
    
    def __init__(self):
        self.max_slippage = 0.001  # Максимальное проскальзывание 0.1%
    
    def execute_signal(self, signal, current_price, api_client):
        """Исполнение сигнала с учетом проскальзывания"""
        if signal['type'] == 'BUY':
            # Для быстрого входа используем рыночную заявку
            market_order = MarketOrder(signal['symbol'], 'BUY', signal['quantity'])
            result = market_order.execute(api_client)
            
            # Проверяем проскальзывание
            actual_price = result['execution_price']
            slippage = (actual_price - current_price) / current_price
            
            if abs(slippage) > self.max_slippage:
                logger.warning(f"Высокое проскальзывание: {slippage:.2%}")
        
        elif signal['type'] == 'SELL':
            # Аналогично для продажи
            pass
```

### Среднесрочные стратегии

```python
class MediumTermStrategy:
    """Среднесрочная стратегия"""
    
    def execute_signal(self, signal, current_price, api_client):
        """Исполнение с использованием лимитных ордеров"""
        if signal['type'] == 'BUY':
            # Устанавливаем лимитную цену чуть выше текущей
            limit_price = current_price * (1 + 0.001)  # +0.1%
            
            limit_order = LimitOrder(
                signal['symbol'], 
                'BUY', 
                signal['quantity'], 
                limit_price
            )
            
            # Устанавливаем таймаут
            result = self._place_order_with_timeout(limit_order, api_client, timeout=300)
            
            if not result:
                logger.warning("Лимитная заявка не исполнена за 5 минут")
```

### Долгосрочные стратегии

```python
class LongTermStrategy:
    """Долгосрочная стратегия"""
    
    def execute_signal(self, signal, technical_levels, api_client):
        """Исполнение на ключевых уровнях"""
        if signal['type'] == 'BUY':
            # Размещаем лимитную заявку на уровне поддержки
            support_level = technical_levels['support']
            
            limit_order = LimitOrder(
                signal['symbol'],
                'BUY', 
                signal['quantity'],
                support_level
            )
            
            result = limit_order.execute(api_client)
            logger.info(f"Лимитная заявка размещена на уровне поддержки: {support_level}")
```

## Управление заявками

### Мониторинг исполнения

```python
class OrderManager:
    """Менеджер заявок"""
    
    def __init__(self, api_client):
        self.api_client = api_client
        self.active_orders = {}
    
    def place_order(self, order):
        """Размещение заявки с отслеживанием"""
        result = order.execute(self.api_client)
        
        if result and 'order_id' in result:
            self.active_orders[result['order_id']] = {
                'order': order,
                'timestamp': datetime.now(),
                'status': 'active'
            }
        
        return result
    
    def check_order_status(self, order_id):
        """Проверка статуса заявки"""
        status = self.api_client.get_order_status(order_id)
        
        if status['status'] == 'filled':
            self.active_orders[order_id]['status'] = 'filled'
            self._handle_filled_order(order_id, status)
        elif status['status'] == 'cancelled':
            self.active_orders[order_id]['status'] = 'cancelled'
        
        return status
    
    def cancel_order(self, order_id):
        """Отмена заявки"""
        result = self.api_client.cancel_order(order_id)
        
        if result:
            self.active_orders[order_id]['status'] = 'cancelled'
        
        return result
    
    def cancel_all_orders(self, symbol=None):
        """Отмена всех заявок"""
        orders_to_cancel = []
        
        for order_id, order_info in self.active_orders.items():
            if order_info['status'] == 'active':
                if symbol is None or order_info['order'].symbol == symbol:
                    orders_to_cancel.append(order_id)
        
        for order_id in orders_to_cancel:
            self.cancel_order(order_id)
```

## Лучшие практики

### 1. Адаптивный выбор типа заявки

```python
def choose_order_type(signal, market_conditions):
    """Выбор типа заявки на основе условий рынка"""
    
    volatility = market_conditions['volatility']
    spread = market_conditions['spread']
    volume = market_conditions['volume']
    
    # Высокая волатильность - используем лимитные
    if volatility > 0.02:  # Волатильность > 2%
        return 'limit'
    
    # Низкая ликвидность - лимитные для лучшей цены
    elif volume < 1000:
        return 'limit'
    
    # Иначе - рыночные для быстрого исполнения
    else:
        return 'market'
```

### 2. Управление рисками исполнения

```python
class ExecutionRiskManager:
    """Менеджер рисков исполнения"""
    
    def __init__(self):
        self.max_slippage = 0.005  # 0.5%
        self.max_wait_time = 300   # 5 минут
    
    def validate_execution(self, expected_price, actual_price, timestamp):
        """Валидация исполнения"""
        slippage = abs(actual_price - expected_price) / expected_price
        
        if slippage > self.max_slippage:
            logger.warning(f"Превышен лимит проскальзывания: {slippage:.2%}")
            return False
        
        return True
    
    def should_cancel_order(self, order_age, market_conditions):
        """Проверка необходимости отмены заявки"""
        if order_age > self.max_wait_time:
            return True
        
        # Отмена при резком изменении цены
        if market_conditions['price_change'] > 0.01:  # 1%
            return True
        
        return False
```

### 3. Оптимизация комиссий

```python
def optimize_order_type_for_cost(order_value, api_fees):
    """Оптимизация типа заявки для минимизации комиссий"""
    
    market_fee = order_value * api_fees['market_rate']
    limit_fee = order_value * api_fees['limit_rate']
    
    # Если лимитная комиссия ниже - используем лимитную
    if limit_fee < market_fee:
        return 'limit'
    else:
        return 'market'
```

## Заключение

Выбор типа заявки зависит от:
- **Временного горизонта** стратегии
- **Уровня волатильности** актива
- **Требований к исполнению**
- **Комиссионной политики** брокера

Для большинства алготрейдинговых стратегий оптимальным является комбинированный подход: рыночные заявки для входа/выхода из позиций и лимитные для улучшения цены исполнения.
