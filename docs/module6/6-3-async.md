---
sidebar_position: 6.3
---

# 6.3. Асинхронность (Asyncio)

Асинхронное программирование позволяет выполнять несколько задач одновременно без блокировки программы. Это особенно важно для торговых роботов, которые должны одновременно получать данные, обрабатывать сигналы и логировать информацию.

## Основы Asyncio

### Синхронный vs Асинхронный подход

```python
# Синхронный подход (блокирующий)
import time
import requests

def sync_approach():
    """Синхронная обработка - все по очереди"""
    print("Начинаем обработку...")
    
    # Получение данных (блокирует программу на 2 секунды)
    time.sleep(2)
    data = {"price": 100.5}
    print(f"Получены данные: {data}")
    
    # Обработка данных (блокирует на 1 секунду)
    time.sleep(1)
    processed = data["price"] * 1.01
    print(f"Обработанные данные: {processed}")
    
    # Логирование (блокирует на 0.5 секунды)
    time.sleep(0.5)
    print("Данные залогированы")

sync_approach()  # Общее время: ~3.5 секунды
```

```python
# Асинхронный подход
import asyncio

async def async_approach():
    """Асинхронная обработка - задачи выполняются параллельно"""
    print("Начинаем обработку...")
    
    # Создаем задачи
    task1 = asyncio.create_task(get_data_async())
    task2 = asyncio.create_task(process_data_async(task1))
    task3 = asyncio.create_task(log_data_async(task2))
    
    # Ждем завершения всех задач
    await asyncio.gather(task1, task2, task3)
    
    print("Все задачи завершены")

async def get_data_async():
    """Асинхронное получение данных"""
    await asyncio.sleep(2)  # Не блокирует!
    data = {"price": 100.5}
    print(f"Получены данные: {data}")
    return data

async def process_data_async(data_task):
    """Асинхронная обработка данных"""
    data = await data_task  # Ждем результат первой задачи
    await asyncio.sleep(1)
    processed = data["price"] * 1.01
    print(f"Обработанные данные: {processed}")
    return processed

async def log_data_async(processed_task):
    """Асинхронное логирование"""
    processed = await processed_task  # Ждем результат второй задачи
    await asyncio.sleep(0.5)
    print("Данные залогированы")

# Запуск
asyncio.run(async_approach())  # Общее время: ~2 секунды (максимальная из задач)
```

## Асинхронный торговый робот

### Структура асинхронного бота

```python
import asyncio
import aiohttp
import logging
from datetime import datetime

class AsyncTradingBot:
    """Асинхронный торговый робот"""
    
    def __init__(self):
        self.is_running = False
        self.logger = logging.getLogger('AsyncBot')
        self.session = None
    
    async def start(self):
        """Запуск бота"""
        self.is_running = True
        self.session = aiohttp.ClientSession()
        
        try:
            # Создаем задачи
            tasks = [
                self.market_data_listener(),
                self.signal_processor(),
                self.order_executor(),
                self.risk_monitor(),
                self.logger_writer()
            ]
            
            # Запускаем все задачи параллельно
            await asyncio.gather(*tasks, return_exceptions=True)
            
        except Exception as e:
            self.logger.error(f"Ошибка в основном цикле: {e}")
        finally:
            await self.session.close()
    
    async def market_data_listener(self):
        """Слушатель рыночных данных"""
        while self.is_running:
            try:
                # Получаем данные асинхронно
                data = await self._fetch_market_data()
                
                # Отправляем данные другим компонентам
                await self._broadcast_data(data)
                
                # Небольшая пауза
                await asyncio.sleep(1)
                
            except Exception as e:
                self.logger.error(f"Ошибка в слушателе данных: {e}")
                await asyncio.sleep(5)  # Пауза при ошибке
    
    async def signal_processor(self):
        """Обработчик сигналов"""
        while self.is_running:
            try:
                # Ждем новые данные
                data = await self._wait_for_data()
                
                # Обрабатываем сигналы
                signals = await self._process_signals(data)
                
                # Отправляем сигналы исполнителю
                for signal in signals:
                    await self._send_signal(signal)
                
                await asyncio.sleep(0.1)  # Быстрая обработка
                
            except Exception as e:
                self.logger.error(f"Ошибка в обработчике сигналов: {e}")
    
    async def order_executor(self):
        """Исполнитель ордеров"""
        while self.is_running:
            try:
                # Ждем сигналы
                signal = await self._wait_for_signal()
                
                # Проверяем риски
                if await self._check_risks(signal):
                    # Исполняем ордер
                    result = await self._execute_order(signal)
                    self.logger.info(f"Ордер исполнен: {result}")
                
                await asyncio.sleep(0.05)  # Очень быстрая реакция
                
            except Exception as e:
                self.logger.error(f"Ошибка в исполнителе: {e}")
    
    async def risk_monitor(self):
        """Монитор рисков"""
        while self.is_running:
            try:
                # Проверяем позиции
                positions = await self._get_positions()
                
                # Оцениваем риски
                risk_level = await self._assess_risks(positions)
                
                if risk_level > 0.8:  # Высокий риск
                    await self._trigger_risk_measures()
                
                await asyncio.sleep(10)  # Проверка каждые 10 секунд
                
            except Exception as e:
                self.logger.error(f"Ошибка в мониторе рисков: {e}")
    
    async def logger_writer(self):
        """Асинхронный писатель логов"""
        log_queue = asyncio.Queue()
        
        # Задача для сбора логов
        async def log_collector():
            while self.is_running:
                try:
                    log_entry = await log_queue.get()
                    await self._write_log_entry(log_entry)
                    log_queue.task_done()
                except Exception as e:
                    print(f"Ошибка в сборщике логов: {e}")
        
        # Задача для периодической записи
        async def periodic_writer():
            while self.is_running:
                await asyncio.sleep(60)  # Каждую минуту
                await self._flush_logs()
        
        # Запускаем обе задачи
        await asyncio.gather(
            log_collector(),
            periodic_writer(),
            return_exceptions=True
        )
    
    # Вспомогательные методы
    async def _fetch_market_data(self):
        """Асинхронное получение рыночных данных"""
        async with self.session.get('https://api.example.com/market-data') as response:
            return await response.json()
    
    async def _broadcast_data(self, data):
        """Рассылка данных другим компонентам"""
        # Используем asyncio.Queue или asyncio.Event для коммуникации
        pass
    
    async def _wait_for_data(self):
        """Ожидание новых данных"""
        # Реализация с asyncio.Queue
        pass
    
    async def _process_signals(self, data):
        """Обработка сигналов"""
        # Логика генерации сигналов
        return []
    
    async def _send_signal(self, signal):
        """Отправка сигнала"""
        pass
    
    async def _wait_for_signal(self):
        """Ожидание сигнала"""
        pass
    
    async def _check_risks(self, signal):
        """Проверка рисков"""
        return True
    
    async def _execute_order(self, signal):
        """Исполнение ордера"""
        async with self.session.post('https://api.example.com/order', 
                                   json=signal) as response:
            return await response.json()
    
    async def _get_positions(self):
        """Получение позиций"""
        async with self.session.get('https://api.example.com/positions') as response:
            return await response.json()
    
    async def _assess_risks(self, positions):
        """Оценка рисков"""
        # Логика оценки рисков
        return 0.1  # Низкий риск
    
    async def _trigger_risk_measures(self):
        """Активация мер по управлению рисками"""
        self.logger.warning("Активированы меры по управлению рисками")
    
    async def _write_log_entry(self, entry):
        """Запись записи лога"""
        # Асинхронная запись в файл или БД
        pass
    
    async def _flush_logs(self):
        """Сброс логов"""
        pass

# Запуск бота
async def main():
    bot = AsyncTradingBot()
    await bot.start()

if __name__ == "__main__":
    asyncio.run(main())
```

## Коммуникация между задачами

### Использование Queue

```python
import asyncio

class AsyncCommunicator:
    """Коммуникатор между асинхронными задачами"""
    
    def __init__(self):
        self.data_queue = asyncio.Queue(maxsize=100)
        self.signal_queue = asyncio.Queue(maxsize=50)
        self.log_queue = asyncio.Queue(maxsize=200)
    
    async def put_data(self, data):
        """Отправка рыночных данных"""
        await self.data_queue.put(data)
    
    async def get_data(self):
        """Получение рыночных данных"""
        return await self.data_queue.get()
    
    async def put_signal(self, signal):
        """Отправка торгового сигнала"""
        await self.signal_queue.put(signal)
    
    async def get_signal(self):
        """Получение торгового сигнала"""
        return await self.signal_queue.get()
    
    async def put_log(self, log_entry):
        """Отправка записи лога"""
        await self.log_queue.put(log_entry)
    
    async def get_log(self):
        """Получение записи лога"""
        return await self.log_queue.get()

# Использование
communicator = AsyncCommunicator()

async def data_producer():
    """Производитель данных"""
    for i in range(10):
        data = {"price": 100 + i, "timestamp": datetime.now()}
        await communicator.put_data(data)
        await asyncio.sleep(1)

async def data_consumer():
    """Потребитель данных"""
    while True:
        data = await communicator.get_data()
        print(f"Получены данные: {data}")
        
        # Генерация сигнала
        if data["price"] > 105:
            await communicator.put_signal({"type": "SELL", "price": data["price"]})

async def signal_handler():
    """Обработчик сигналов"""
    while True:
        signal = await communicator.get_signal()
        print(f"Обработка сигнала: {signal}")
        
        # Логирование
        await communicator.put_log({
            "timestamp": datetime.now(),
            "event": "signal_processed",
            "signal": signal
        })

async def log_writer():
    """Писатель логов"""
    while True:
        log_entry = await communicator.get_log()
        print(f"Запись в лог: {log_entry}")
        # Здесь запись в файл

async def main():
    tasks = [
        data_producer(),
        data_consumer(),
        signal_handler(),
        log_writer()
    ]
    
    await asyncio.gather(*tasks, return_exceptions=True)

asyncio.run(main())
```

## Преимущества асинхронности

1. **Производительность**: Параллельное выполнение задач
2. **Отзывчивость**: Система не блокируется
3. **Масштабируемость**: Легко добавлять новые компоненты
4. **Надежность**: Ошибки в одной задаче не влияют на другие

## Когда использовать asyncio

- **Множество I/O операций**: Сетевые запросы, работа с файлами
- **Реального времени**: Быстрая реакция на события
- **Параллельная обработка**: Несколько потоков данных одновременно
- **Высокая нагрузка**: Когда синхронный код становится bottleneck

Асинхронное программирование - мощный инструмент для создания эффективных и отзывчивых торговых систем.
