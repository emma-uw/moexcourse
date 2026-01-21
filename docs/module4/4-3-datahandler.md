---
sidebar_position: 4.3
---

# 4.3. Класс DataHandler

Класс DataHandler унифицирует доступ к различным источникам данных, обеспечивая единый интерфейс для получения исторической информации, котировок в реальном времени и других рыночных данных.

## Архитектура DataHandler

```python
from abc import ABC, abstractmethod
import pandas as pd
from moexalgo import Ticker, Market

class BaseDataHandler(ABC):
    """Базовый класс для работы с данными"""
    
    @abstractmethod
    def get_historical_data(self, symbol, start_date, end_date, timeframe='D'):
        """Получение исторических данных"""
        pass
    
    @abstractmethod
    def get_realtime_data(self, symbol):
        """Получение данных в реальном времени"""
        pass
    
    @abstractmethod
    def get_orderbook(self, symbol):
        """Получение стакана заявок"""
        pass

class MOEXDataHandler(BaseDataHandler):
    """Обработчик данных MOEX"""
    
    def __init__(self, cache_enabled=True):
        self.cache = {} if cache_enabled else None
        self.tickers = {}
    
    def get_historical_data(self, symbol, start_date, end_date, timeframe='D'):
        """Получение исторических данных из MOEX"""
        cache_key = f"{symbol}_{start_date}_{end_date}_{timeframe}"
        
        # Проверяем кэш
        if self.cache and cache_key in self.cache:
            return self.cache[cache_key]
        
        try:
            # Получаем данные через MOEX AlgoPack
            ticker = Ticker(symbol)
            data = ticker.candles(date=start_date, till=end_date, period=timeframe)
            
            # Преобразуем в DataFrame
            df = pd.DataFrame(data)
            if not df.empty:
                df['begin'] = pd.to_datetime(df['begin'])
                df.set_index('begin', inplace=True)
            
            # Сохраняем в кэш
            if self.cache:
                self.cache[cache_key] = df
            
            return df
            
        except Exception as e:
            print(f"Ошибка получения данных для {symbol}: {e}")
            return pd.DataFrame()
    
    def get_realtime_data(self, symbol):
        """Получение последних котировок"""
        try:
            ticker = Ticker(symbol)
            # Получаем последние данные
            latest = ticker.candles(limit=1)
            return latest[0] if latest else None
        except Exception as e:
            print(f"Ошибка получения realtime данных для {symbol}: {e}")
            return None
    
    def get_orderbook(self, symbol):
        """Получение стакана заявок"""
        # В MOEX AlgoPack может быть отдельный метод для стакана
        # Здесь упрощенная реализация
        try:
            # Предполагаем, что есть метод для получения стакана
            # orderbook = get_orderbook(symbol)
            # return orderbook
            pass
        except Exception as e:
            print(f"Ошибка получения стакана для {symbol}: {e}")
            return None

class CachedDataHandler(MOEXDataHandler):
    """DataHandler с расширенным кэшированием"""
    
    def __init__(self, cache_dir='./cache', max_cache_age=3600):
        super().__init__(cache_enabled=True)
        self.cache_dir = cache_dir
        self.max_cache_age = max_cache_age  # секунды
    
    def _is_cache_valid(self, cache_file):
        """Проверка актуальности кэша"""
        import os
        import time
        
        if not os.path.exists(cache_file):
            return False
        
        file_age = time.time() - os.path.getmtime(cache_file)
        return file_age < self.max_cache_age
    
    def _save_to_cache(self, key, data):
        """Сохранение данных в файл"""
        import pickle
        
        cache_file = f"{self.cache_dir}/{key}.pkl"
        os.makedirs(self.cache_dir, exist_ok=True)
        
        with open(cache_file, 'wb') as f:
            pickle.dump(data, f)
    
    def _load_from_cache(self, key):
        """Загрузка данных из файла"""
        import pickle
        
        cache_file = f"{self.cache_dir}/{key}.pkl"
        
        if not self._is_cache_valid(cache_file):
            return None
        
        try:
            with open(cache_file, 'rb') as f:
                return pickle.load(f)
        except:
            return None
    
    def get_historical_data(self, symbol, start_date, end_date, timeframe='D'):
        """Получение данных с файловым кэшем"""
        cache_key = f"{symbol}_{start_date}_{end_date}_{timeframe}"
        
        # Проверяем файловый кэш
        cached_data = self._load_from_cache(cache_key)
        if cached_data is not None:
            return cached_data
        
        # Получаем данные от родительского класса
        data = super().get_historical_data(symbol, start_date, end_date, timeframe)
        
        # Сохраняем в кэш
        if not data.empty:
            self._save_to_cache(cache_key, data)
        
        return data
```

## Преимущества унификации

### 1. Единый интерфейс

```python
# Независимо от источника данных, интерфейс одинаковый
data_handlers = {
    'moex': MOEXDataHandler(),
    'cached': CachedDataHandler(),
    # Можно легко добавить другие источники
    # 'yahoo': YahooDataHandler(),
    # 'alpha_vantage': AlphaVantageDataHandler(),
}

# Использование
handler = data_handlers['cached']
sber_data = handler.get_historical_data('SBER', '2023-01-01', '2023-12-31')
```

### 2. Легкая замена источников

```python
class DataHandlerFactory:
    """Фабрика обработчиков данных"""
    
    @staticmethod
    def create_handler(source_type, **kwargs):
        if source_type == 'moex':
            return MOEXDataHandler(**kwargs)
        elif source_type == 'cached':
            return CachedDataHandler(**kwargs)
        else:
            raise ValueError(f"Неизвестный тип источника: {source_type}")

# Создание обработчика
handler = DataHandlerFactory.create_handler('cached', cache_dir='./my_cache')
```

### 3. Кэширование и оптимизация

```python
class OptimizedDataHandler(BaseDataHandler):
    """Оптимизированный обработчик с множественными источниками"""
    
    def __init__(self):
        self.primary_handler = MOEXDataHandler()
        self.backup_handler = CachedDataHandler()
        self.request_count = 0
    
    def get_historical_data(self, symbol, start_date, end_date, timeframe='D'):
        """Получение данных с fallback"""
        self.request_count += 1
        
        # Сначала пытаемся получить из основного источника
        data = self.primary_handler.get_historical_data(symbol, start_date, end_date, timeframe)
        
        # Если не удалось, используем backup
        if data.empty:
            print(f"Основной источник недоступен для {symbol}, используем backup")
            data = self.backup_handler.get_historical_data(symbol, start_date, end_date, timeframe)
        
        return data
```

## Лучшие практики

1. **Обработка ошибок** - всегда обрабатывайте сетевые ошибки и недоступность данных
2. **Кэширование** - используйте кэширование для снижения нагрузки на API
3. **Валидация данных** - проверяйте корректность полученных данных
4. **Логирование** - ведите логи всех запросов и ошибок
5. **Асинхронность** - для realtime данных используйте асинхронные запросы

DataHandler абстрагирует работу с данными, позволяя легко менять источники и добавлять новые возможности без изменения основной логики робота.
