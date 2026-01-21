---
sidebar_position: 6.1
---

# 6.1. Polling (Опросы) vs Streaming (Поток)

Для работы в реальном времени нужно получать актуальные рыночные данные. Существует два основных подхода: polling (опросы) и streaming (потоковая передача). Каждый имеет свои преимущества и ограничения.

## Polling (Опросы)

### Принцип работы

```python
import time
import requests

class PollingDataProvider:
    """Получение данных через опросы"""
    
    def __init__(self, symbol, poll_interval=5):
        self.symbol = symbol
        self.poll_interval = poll_interval  # секунды
        self.last_data = None
    
    def start_polling(self):
        """Запуск цикла опросов"""
        while True:
            try:
                # Запрос последних данных
                data = self._fetch_latest_data()
                
                # Проверка на изменения
                if self._has_data_changed(data):
                    self._process_new_data(data)
                    self.last_data = data
                
                # Ожидание перед следующим запросом
                time.sleep(self.poll_interval)
                
            except Exception as e:
                print(f"Ошибка при опросе: {e}")
                time.sleep(self.poll_interval * 2)  # Увеличенная задержка при ошибке
    
    def _fetch_latest_data(self):
        """Получение последних данных"""
        # Имитация запроса к API
        # response = requests.get(f"https://api.example.com/ticker/{self.symbol}")
        # return response.json()
        pass
    
    def _has_data_changed(self, new_data):
        """Проверка, изменились ли данные"""
        if self.last_data is None:
            return True
        
        # Сравнение ключевых полей
        return (new_data.get('price') != self.last_data.get('price') or
                new_data.get('volume') != self.last_data.get('volume'))
    
    def _process_new_data(self, data):
        """Обработка новых данных"""
        print(f"Новые данные для {self.symbol}: {data}")
        # Здесь логика обработки сигналов

# Пример использования
provider = PollingDataProvider('SBER', poll_interval=10)
# provider.start_polling()  # Запуск в отдельном потоке
```

### Преимущества Polling

1. **Простота реализации**: Легко понять и отладить
2. **Контроль частоты**: Можно регулировать интервал запросов
3. **Надежность**: Не зависит от качества соединения
4. **Совместимость**: Работает с любыми API

### Недостатки Polling

1. **Задержка**: Данные могут быть устаревшими на интервал опроса
2. **Нагрузка на сервер**: Частые запросы создают нагрузку
3. **Неэффективность**: Получаем данные даже когда они не изменились
4. **Лимиты API**: Многие API ограничивают количество запросов

## Streaming (Потоковая передача)

### Принцип работы

```python
import websocket
import json
import threading

class StreamingDataProvider:
    """Получение данных через WebSocket streaming"""
    
    def __init__(self, symbol):
        self.symbol = symbol
        self.ws = None
        self.is_connected = False
    
    def connect(self):
        """Подключение к WebSocket"""
        try:
            # websocket.enableTrace(True)
            self.ws = websocket.WebSocketApp(
                "wss://api.example.com/stream",
                on_message=self._on_message,
                on_error=self._on_error,
                on_close=self._close,
                on_open=self._on_open
            )
            
            # Запуск в отдельном потоке
            wst = threading.Thread(target=self.ws.run_forever)
            wst.daemon = True
            wst.start()
            
        except Exception as e:
            print(f"Ошибка подключения: {e}")
    
    def _on_open(self, ws):
        """Обработчик открытия соединения"""
        self.is_connected = True
        print(f"Подключено к стриму для {self.symbol}")
        
        # Подписка на данные
        subscribe_message = {
            "type": "subscribe",
            "symbol": self.symbol
        }
        ws.send(json.dumps(subscribe_message))
    
    def _on_message(self, ws, message):
        """Обработчик входящих сообщений"""
        try:
            data = json.loads(message)
            self._process_stream_data(data)
        except json.JSONDecodeError:
            print(f"Некорректное сообщение: {message}")
    
    def _on_error(self, ws, error):
        """Обработчик ошибок"""
        print(f"Ошибка стрима: {error}")
    
    def _on_close(self, ws, close_status_code, close_msg):
        """Обработчик закрытия соединения"""
        self.is_connected = False
        print("Соединение закрыто")
    
    def _process_stream_data(self, data):
        """Обработка данных из стрима"""
        if data.get('type') == 'ticker_update':
            price = data.get('price')
            volume = data.get('volume')
            print(f"Realtime: {self.symbol} - Price: {price}, Volume: {volume}")
            
            # Здесь логика обработки сигналов
    
    def disconnect(self):
        """Отключение от стрима"""
        if self.ws:
            self.ws.close()

# Пример использования
streamer = StreamingDataProvider('SBER')
streamer.connect()

# Основной цикл программы
while True:
    time.sleep(1)
    # Другие операции...
```

### Преимущества Streaming

1. **Минимальная задержка**: Данные приходят мгновенно
2. **Эффективность**: Нет лишних запросов
3. **Реальное время**: Обновления по мере изменения данных
4. **Меньшая нагрузка**: Один постоянный канал вместо множества запросов

### Недостатки Streaming

1. **Сложность**: Требует обработки асинхронных событий
2. **Надежность соединения**: Проблемы с интернетом прерывают поток
3. **Реконнект**: Нужно реализовывать логику переподключения
4. **Совместимость**: Не все API поддерживают WebSocket

## Гибридный подход

### Adaptive Polling

```python
class AdaptivePollingProvider:
    """Адаптивный опрос с учетом волатильности"""
    
    def __init__(self, symbol):
        self.symbol = symbol
        self.base_interval = 10  # базовый интервал
        self.volatility_multiplier = 2  # множитель для волатильности
        self.last_price_change = 0
    
    def get_adaptive_interval(self):
        """Расчет адаптивного интервала"""
        # Увеличиваем частоту при высокой волатильности
        if self.last_price_change > 0.01:  # Изменение > 1%
            return max(1, self.base_interval / self.volatility_multiplier)
        else:
            return self.base_interval
    
    def poll_with_adaptation(self):
        """Опрос с адаптацией"""
        while True:
            # Получение данных
            data = self._fetch_data()
            
            # Расчет изменения цены
            if self.last_price_change is not None:
                price_change = abs(data['price'] - self.last_price_change)
                self.last_price_change = data['price']
            
            # Адаптивный интервал
            interval = self.get_adaptive_interval()
            
            # Обработка данных
            self._process_data(data)
            
            time.sleep(interval)
```

## Тайминги и задержки

### Измерение latency

```python
import time

class LatencyMonitor:
    """Мониторинг задержек"""
    
    def __init__(self):
        self.request_times = []
        self.response_times = []
    
    def record_request(self):
        """Запись времени запроса"""
        self.request_times.append(time.time())
    
    def record_response(self):
        """Запись времени ответа"""
        self.response_times.append(time.time())
    
    def get_average_latency(self):
        """Расчет средней задержки"""
        if len(self.request_times) != len(self.response_times):
            return None
        
        latencies = []
        for req, resp in zip(self.request_times, self.response_times):
            latencies.append(resp - req)
        
        return sum(latencies) / len(latencies) if latencies else 0
    
    def get_latency_stats(self):
        """Статистика задержек"""
        latencies = []
        for req, resp in zip(self.request_times[-100:], self.response_times[-100:]):  # Последние 100
            latencies.append(resp - req)
        
        if not latencies:
            return {}
        
        return {
            'avg_latency': sum(latencies) / len(latencies),
            'min_latency': min(latencies),
            'max_latency': max(latencies),
            'median_latency': sorted(latencies)[len(latencies)//2]
        }
```

### Оптимизация задержек

1. **Выбор ближайшего сервера**: Использовать CDN или географически близкие сервера
2. **Кэширование**: Хранить часто используемые данные локально
3. **Компрессия**: Сжимать данные при передаче
4. **Параллельные запросы**: Использовать асинхронность для множественных символов
5. **Предварительная загрузка**: Загружать данные заранее

## Выбор подхода

### Когда использовать Polling:
- Простые интеграции
- Низкочастотные обновления
- Ограниченные ресурсы сервера
- API без WebSocket поддержки

### Когда использовать Streaming:
- Высокочастотный трейдинг
- Критичная задержка
- Большой объем данных
- Стабильное интернет-соединение

### Гибридный подход:
- Streaming для критичных данных
- Polling для вспомогательной информации
- Fallback с polling при проблемах со streaming

Выбор зависит от требований к задержке, надежности и сложности реализации.
