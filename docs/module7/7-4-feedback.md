---
sidebar_position: 7.4
---

# 7.4. Обратная связь

После отправки заявки роботу необходимо получать обратную связь о ее исполнении. Это включает статус заявки, детали исполнения и синхронизацию позиции робота с реальным состоянием счета.

## Получение статуса заявки

### Основные статусы заявок

```python
from enum import Enum

class OrderStatus(Enum):
    """Статусы заявок"""
    PENDING = "pending"           # Заявка размещена, ожидает исполнения
    PARTIALLY_FILLED = "partially_filled"  # Частично исполнена
    FILLED = "filled"             # Полностью исполнена
    CANCELLED = "cancelled"       # Отменена
    REJECTED = "rejected"         # Отклонена
    EXPIRED = "expired"           # Истекла
```

### Получение статуса через API

```python
class OrderStatusTracker:
    """Отслеживатель статуса заявок"""
    
    def __init__(self, api_client):
        self.api_client = api_client
        self.active_orders = {}  # order_id -> order_info
    
    def submit_order(self, order):
        """Отправка заявки с отслеживанием"""
        result = self.api_client.place_order(order)
        
        if result and 'order_id' in result:
            order_id = result['order_id']
            self.active_orders[order_id] = {
                'order': order,
                'status': OrderStatus.PENDING,
                'submitted_at': datetime.now(),
                'filled_quantity': 0,
                'average_price': 0
            }
            
            logger.info(f"Заявка {order_id} размещена")
            return order_id
        
        return None
    
    def update_order_status(self, order_id):
        """Обновление статуса заявки"""
        status_response = self.api_client.get_order_status(order_id)
        
        if not status_response:
            logger.warning(f"Не удалось получить статус заявки {order_id}")
            return
        
        current_status = OrderStatus(status_response['status'])
        order_info = self.active_orders.get(order_id)
        
        if not order_info:
            logger.warning(f"Информация о заявке {order_id} не найдена")
            return
        
        # Обновление статуса
        old_status = order_info['status']
        order_info['status'] = current_status
        
        # Обновление деталей исполнения
        if 'filled_quantity' in status_response:
            order_info['filled_quantity'] = status_response['filled_quantity']
        
        if 'average_price' in status_response:
            order_info['average_price'] = status_response['average_price']
        
        # Логирование изменений
        if old_status != current_status:
            logger.info(f"Статус заявки {order_id}: {old_status.value} -> {current_status.value}")
        
        # Обработка завершенных заявок
        if current_status in [OrderStatus.FILLED, OrderStatus.CANCELLED, OrderStatus.REJECTED]:
            self._handle_completed_order(order_id, current_status)
    
    def _handle_completed_order(self, order_id, status):
        """Обработка завершенной заявки"""
        order_info = self.active_orders[order_id]
        order = order_info['order']
        
        if status == OrderStatus.FILLED:
            # Полное исполнение
            self._update_position(order, order_info['filled_quantity'], order_info['average_price'])
            logger.info(f"Заявка {order_id} полностью исполнена")
            
        elif status == OrderStatus.PARTIALLY_FILLED:
            # Частичное исполнение
            self._update_position(order, order_info['filled_quantity'], order_info['average_price'])
            logger.info(f"Заявка {order_id} частично исполнена: {order_info['filled_quantity']}")
            
        elif status == OrderStatus.CANCELLED:
            # Отмена заявки
            unfilled_quantity = order['quantity'] - order_info['filled_quantity']
            if unfilled_quantity > 0:
                logger.info(f"Заявка {order_id} отменена, неисполненный объем: {unfilled_quantity}")
        
        # Удаление из активных
        del self.active_orders[order_id]
    
    def _update_position(self, order, filled_quantity, average_price):
        """Обновление позиции"""
        # Здесь логика обновления позиции портфеля
        # Обновление количества, средней цены, P&L и т.д.
        pass
```

## Синхронизация позиции

### Сравнение позиции робота и брокера

```python
class PositionSynchronizer:
    """Синхронизация позиции робота с брокером"""
    
    def __init__(self, api_client):
        self.api_client = api_client
        self.bot_positions = {}  # symbol -> position_info
        self.broker_positions = {}
    
    def update_bot_position(self, symbol, side, quantity, price):
        """Обновление позиции робота"""
        if symbol not in self.bot_positions:
            self.bot_positions[symbol] = {
                'quantity': 0,
                'average_price': 0,
                'total_cost': 0
            }
        
        position = self.bot_positions[symbol]
        
        if side == 'BUY':
            # Расчет новой средней цены
            new_total_cost = position['total_cost'] + (quantity * price)
            new_total_quantity = position['quantity'] + quantity
            
            position['average_price'] = new_total_cost / new_total_quantity
            position['quantity'] = new_total_quantity
            position['total_cost'] = new_total_cost
            
        elif side == 'SELL':
            # Уменьшение позиции
            position['quantity'] -= quantity
            if position['quantity'] <= 0:
                # Полное закрытие позиции
                del self.bot_positions[symbol]
    
    def sync_with_broker(self):
        """Синхронизация с брокером"""
        # Получение позиций от брокера
        broker_positions = self.api_client.get_positions()
        self.broker_positions = {}
        
        for pos in broker_positions:
            symbol = pos['symbol']
            self.broker_positions[symbol] = {
                'quantity': pos['quantity'],
                'average_price': pos['average_price']
            }
        
        # Сравнение позиций
        discrepancies = self._find_discrepancies()
        
        if discrepancies:
            logger.warning("Найдены расхождения в позициях!")
            for symbol, diff in discrepancies.items():
                logger.warning(f"{symbol}: Робот={diff['bot_quantity']}, Брокер={diff['broker_quantity']}")
            
            # Попытка исправления
            self._resolve_discrepancies(discrepancies)
    
    def _find_discrepancies(self):
        """Поиск расхождений"""
        discrepancies = {}
        
        # Все символы из обеих позиций
        all_symbols = set(self.bot_positions.keys()) | set(self.broker_positions.keys())
        
        for symbol in all_symbols:
            bot_qty = self.bot_positions.get(symbol, {}).get('quantity', 0)
            broker_qty = self.broker_positions.get(symbol, {}).get('quantity', 0)
            
            if abs(bot_qty - broker_qty) > 0.001:  # Минимальное расхождение
                discrepancies[symbol] = {
                    'bot_quantity': bot_qty,
                    'broker_quantity': broker_qty,
                    'difference': bot_qty - broker_qty
                }
        
        return discrepancies
    
    def _resolve_discrepancies(self, discrepancies):
        """Исправление расхождений"""
        for symbol, diff in discrepancies.items():
            difference = diff['difference']
            
            if abs(difference) > 10:  # Значительное расхождение
                logger.error(f"Критическое расхождение по {symbol}: {difference}")
                # Остановка торговли или ручное вмешательство
                
            elif abs(difference) > 0:
                # Попытка коррекции
                logger.info(f"Коррекция позиции {symbol} на {difference}")
                
                if difference > 0:
                    # У робота больше - продаем излишек
                    self._adjust_position(symbol, 'SELL', abs(difference))
                else:
                    # У брокера больше - докупаем
                    self._adjust_position(symbol, 'BUY', abs(difference))
    
    def _adjust_position(self, symbol, side, quantity):
        """Коррекция позиции"""
        # Создание корректирующей заявки
        order = {
            'symbol': symbol,
            'side': side,
            'quantity': quantity,
            'type': 'market'
        }
        
        try:
            result = self.api_client.place_order(order)
            logger.info(f"Корректирующая заявка размещена: {result}")
        except Exception as e:
            logger.error(f"Ошибка коррекции позиции {symbol}: {e}")
```

## Обработка частичного исполнения

### Работа с частично исполненными заявками

```python
class PartialFillHandler:
    """Обработчик частичного исполнения"""
    
    def __init__(self, order_tracker):
        self.order_tracker = order_tracker
        self.partial_orders = {}
    
    def handle_partial_fill(self, order_id, fill_info):
        """Обработка частичного исполнения"""
        filled_quantity = fill_info['quantity']
        fill_price = fill_info['price']
        
        # Обновление позиции
        self.order_tracker._update_position(
            self.order_tracker.active_orders[order_id]['order'],
            filled_quantity,
            fill_price
        )
        
        # Логирование
        logger.info(f"Частичное исполнение заявки {order_id}: {filled_quantity} @ {fill_price}")
        
        # Проверка необходимости действий
        order_info = self.order_tracker.active_orders[order_id]
        remaining_quantity = order_info['order']['quantity'] - order_info['filled_quantity']
        
        if remaining_quantity > 0:
            self._handle_remaining_quantity(order_id, remaining_quantity)
    
    def _handle_remaining_quantity(self, order_id, remaining_quantity):
        """Обработка оставшегося объема"""
        order_info = self.order_tracker.active_orders[order_id]
        original_order = order_info['order']
        
        # Решение зависит от стратегии
        if original_order.get('allow_partial_fills', True):
            # Оставляем заявку активной
            logger.info(f"Заявка {order_id} остается активной, осталось: {remaining_quantity}")
            
        else:
            # Отменяем остаток
            self.order_tracker.api_client.cancel_order(order_id)
            logger.info(f"Заявка {order_id} отменена, исполнено частично")
```

## Мониторинг обратной связи

### Регулярная проверка статусов

```python
class FeedbackMonitor:
    """Монитор обратной связи"""
    
    def __init__(self, order_tracker, position_sync):
        self.order_tracker = order_tracker
        self.position_sync = position_sync
        self.check_interval = 30  # секунд
    
    async def start_monitoring(self):
        """Запуск мониторинга"""
        while True:
            try:
                # Проверка статусов активных заявок
                active_order_ids = list(self.order_tracker.active_orders.keys())
                
                for order_id in active_order_ids:
                    self.order_tracker.update_order_status(order_id)
                
                # Синхронизация позиций
                self.position_sync.sync_with_broker()
                
                # Ожидание следующей проверки
                await asyncio.sleep(self.check_interval)
                
            except Exception as e:
                logger.error(f"Ошибка в мониторинге обратной связи: {e}")
                await asyncio.sleep(self.check_interval)
    
    def get_feedback_summary(self):
        """Получение сводки обратной связи"""
        return {
            'active_orders': len(self.order_tracker.active_orders),
            'positions_synced': len(self.position_sync.bot_positions) == len(self.position_sync.broker_positions),
            'last_check': datetime.now()
        }
```

## Обработка ошибок обратной связи

### Сетевая недоступность

```python
class NetworkResilientFeedback:
    """Устойчивая к сети обратная связь"""
    
    def __init__(self, api_client):
        self.api_client = api_client
        self.offline_mode = False
        self.pending_updates = []
    
    def get_order_status_safe(self, order_id):
        """Безопасное получение статуса заявки"""
        try:
            status = self.api_client.get_order_status(order_id)
            self.offline_mode = False
            return status
            
        except ConnectionError:
            if not self.offline_mode:
                logger.warning("Переход в автономный режим")
                self.offline_mode = True
            
            # Сохраняем запрос для повторной отправки
            self.pending_updates.append({
                'type': 'order_status',
                'order_id': order_id,
                'timestamp': datetime.now()
            })
            
            return None
        
        except Exception as e:
            logger.error(f"Ошибка получения статуса заявки {order_id}: {e}")
            return None
    
    def retry_pending_updates(self):
        """Повторная отправка отложенных обновлений"""
        if not self.pending_updates:
            return
        
        successful_updates = []
        
        for update in self.pending_updates:
            try:
                if update['type'] == 'order_status':
                    status = self.api_client.get_order_status(update['order_id'])
                    if status:
                        # Обработка полученного статуса
                        successful_updates.append(update)
                        
            except Exception:
                continue  # Оставляем для следующей попытки
        
        # Удаление успешно обработанных
        for update in successful_updates:
            self.pending_updates.remove(update)
        
        if successful_updates:
            logger.info(f"Восстановлено {len(successful_updates)} обновлений")
```

## Лучшие практики

### 1. Регулярная синхронизация

```python
# Синхронизация каждые 5 минут
SYNC_INTERVAL = 300  # секунд

async def periodic_sync():
    while True:
        try:
            position_sync.sync_with_broker()
            await asyncio.sleep(SYNC_INTERVAL)
        except Exception as e:
            logger.error(f"Ошибка периодической синхронизации: {e}")
            await asyncio.sleep(SYNC_INTERVAL)
```

### 2. Обработка таймаутов

```python
ORDER_STATUS_TIMEOUT = 10  # секунд

def get_order_status_with_timeout(order_id, timeout=ORDER_STATUS_TIMEOUT):
    """Получение статуса с таймаутом"""
    import signal
    
    def timeout_handler(signum, frame):
        raise TimeoutError("Превышен таймаут запроса статуса")
    
    # Установка таймера
    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(timeout)
    
    try:
        status = api_client.get_order_status(order_id)
        return status
    finally:
        signal.alarm(0)  # Отмена таймера
```

### 3. Валидация данных

```python
def validate_order_feedback(feedback):
    """Валидация обратной связи"""
    required_fields = ['order_id', 'status', 'filled_quantity']
    
    for field in required_fields:
        if field not in feedback:
            raise ValueError(f"Отсутствует обязательное поле: {field}")
    
    if feedback['filled_quantity'] < 0:
        raise ValueError("Отрицательное количество исполнения")
    
    if feedback['status'] not in [s.value for s in OrderStatus]:
        raise ValueError(f"Некорректный статус: {feedback['status']}")
    
    return True
```

Обратная связь - это мост между действиями робота и реальностью рынка. Правильная обработка статусов заявок и синхронизация позиций обеспечивает надежную работу торговой системы.
