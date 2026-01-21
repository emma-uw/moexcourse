---
sidebar_position: 6.2
---

# 6.2. Обработка времени

Время - критически важный аспект в алгоритмической торговле. Неправильная обработка временных зон, синхронизация и тайминги могут привести к серьезным ошибкам.

## Часовые пояса

### UTC vs MSK

```python
import pandas as pd
from datetime import datetime, timezone, timedelta

# Работа с часовыми поясами
class TimeHandler:
    """Обработчик времени для торгового робота"""
    
    def __init__(self):
        # Определение часовых поясов
        self.utc = timezone.utc
        self.msk = timezone(timedelta(hours=3))  # MSK = UTC+3
    
    def utc_to_msk(self, utc_time):
        """Конвертация UTC в MSK"""
        if isinstance(utc_time, str):
            utc_time = pd.to_datetime(utc_time)
        
        # Если время в UTC, конвертируем в MSK
        if utc_time.tz is None:
            utc_time = utc_time.replace(tzinfo=self.utc)
        
        msk_time = utc_time.astimezone(self.msk)
        return msk_time
    
    def msk_to_utc(self, msk_time):
        """Конвертация MSK в UTC"""
        if isinstance(msk_time, str):
            msk_time = pd.to_datetime(msk_time)
        
        # Если время в MSK, конвертируем в UTC
        if msk_time.tz is None:
            msk_time = msk_time.replace(tzinfo=self.msk)
        
        utc_time = msk_time.astimezone(self.utc)
        return utc_time
    
    def get_current_msk_time(self):
        """Получение текущего времени в MSK"""
        return datetime.now(self.msk)
    
    def get_current_utc_time(self):
        """Получение текущего времени в UTC"""
        return datetime.now(self.utc)

# Пример использования
time_handler = TimeHandler()

# Конвертация времени
utc_time = "2023-01-01 10:00:00"
msk_time = time_handler.utc_to_msk(utc_time)
print(f"UTC: {utc_time} -> MSK: {msk_time}")

current_msk = time_handler.get_current_msk_time()
current_utc = time_handler.get_current_utc_time()
print(f"Текущее время - MSK: {current_msk}, UTC: {current_utc}")
```

### Почему важно правильно работать со временем?

1. **MOEX работает в MSK**: Торги на Московской бирже ведутся по московскому времени
2. **API могут возвращать UTC**: Многие API возвращают время в UTC
3. **Синхронизация**: Все компоненты системы должны использовать согласованное время
4. **Исторические данные**: Данные из разных источников могут быть в разных часовых поясах

## Синхронизация свечей

### Проблема несинхронизированных свечей

```python
class CandleSynchronizer:
    """Синхронизация свечей из разных источников"""
    
    def __init__(self, timeframe='1T'):  # 1 минута
        self.timeframe = timeframe
        self.candles = {}
    
    def add_candle_data(self, source_name, candle_data):
        """Добавление данных свечей из источника"""
        # Предполагаем, что candle_data - DataFrame с колонками: timestamp, open, high, low, close, volume
        self.candles[source_name] = candle_data
    
    def synchronize_candles(self):
        """Синхронизация свечей по времени"""
        if not self.candles:
            return None
        
        # Получение всех временных меток
        all_timestamps = set()
        for source_data in self.candles.values():
            all_timestamps.update(source_data.index)
        
        all_timestamps = sorted(all_timestamps)
        
        # Создание единого DataFrame
        synchronized_data = pd.DataFrame(index=all_timestamps)
        
        for source_name, source_data in self.candles.items():
            # Переиндексация данных источника
            source_reindexed = source_data.reindex(all_timestamps)
            
            # Заполнение пропусков (forward fill для цен, 0 для объема)
            source_reindexed[['open', 'high', 'low', 'close']] = source_reindexed[['open', 'high', 'low', 'close']].fillna(method='ffill')
            source_reindexed['volume'] = source_reindexed['volume'].fillna(0)
            
            # Добавление к синхронизированным данным
            for col in source_reindexed.columns:
                synchronized_data[f"{source_name}_{col}"] = source_reindexed[col]
        
        return synchronized_data
    
    def resample_to_timeframe(self, data, target_timeframe):
        """Ресемплинг данных к целевому таймфрейму"""
        resampled = data.resample(target_timeframe).agg({
            'open': 'first',
            'high': 'max', 
            'low': 'min',
            'close': 'last',
            'volume': 'sum'
        }).dropna()
        
        return resampled

# Пример использования
synchronizer = CandleSynchronizer()

# Добавление данных из разных источников
# synchronizer.add_candle_data('moex', moex_data)
# synchronizer.add_candle_data('broker', broker_data)

# Синхронизация
# synced_data = synchronizer.synchronize_candles()
```

## Обработка конца свечи

### Тайминги в конце свечи

```python
class EndOfCandleHandler:
    """Обработчик конца свечи"""
    
    def __init__(self, timeframe_minutes=1):
        self.timeframe_minutes = timeframe_minutes
        self.pending_signals = []
        self.last_candle_time = None
    
    def is_end_of_candle(self, current_time):
        """Проверка, является ли время концом свечи"""
        if isinstance(current_time, str):
            current_time = pd.to_datetime(current_time)
        
        # Вычисление времени начала текущей свечи
        candle_start = current_time.floor(f'{self.timeframe_minutes}T')
        
        # Проверка, является ли время концом свечи
        candle_end = candle_start + pd.Timedelta(minutes=self.timeframe_minutes)
        
        # Погрешность в 1 секунду
        return abs((current_time - candle_end).total_seconds()) <= 1
    
    def process_end_of_candle(self, current_time, market_data):
        """Обработка конца свечи"""
        if not self.is_end_of_candle(current_time):
            return None
        
        actions = []
        
        # 1. Финализация текущей свечи
        finalized_candle = self._finalize_candle(market_data)
        actions.append(f"Свеча финализирована: {finalized_candle}")
        
        # 2. Обработка накопленных сигналов
        for signal in self.pending_signals:
            if self._should_execute_signal(signal, finalized_candle):
                actions.append(f"Исполнение сигнала: {signal}")
                self._execute_signal(signal)
        
        # Очистка накопленных сигналов
        self.pending_signals = []
        
        # 3. Генерация новых сигналов на основе финализированной свечи
        new_signals = self._generate_new_signals(finalized_candle)
        self.pending_signals.extend(new_signals)
        
        # 4. Обновление состояния
        self.last_candle_time = current_time
        
        return actions
    
    def add_pending_signal(self, signal):
        """Добавление сигнала для обработки в конце свечи"""
        self.pending_signals.append(signal)
    
    def _finalize_candle(self, market_data):
        """Финализация свечи"""
        # Здесь логика финализации свечи
        return {
            'timestamp': market_data.get('timestamp'),
            'open': market_data.get('open'),
            'high': market_data.get('high'),
            'low': market_data.get('low'),
            'close': market_data.get('close'),
            'volume': market_data.get('volume')
        }
    
    def _should_execute_signal(self, signal, candle):
        """Проверка, следует ли исполнять сигнал"""
        # Логика проверки условий исполнения
        return True  # Заглушка
    
    def _execute_signal(self, signal):
        """Исполнение сигнала"""
        print(f"Исполнение сигнала: {signal}")
    
    def _generate_new_signals(self, candle):
        """Генерация новых сигналов"""
        # Логика генерации сигналов на основе свечи
        return []  # Заглушка

# Пример использования
eoc_handler = EndOfCandleHandler(timeframe_minutes=1)

# В основном цикле
while True:
    current_time = pd.Timestamp.now()
    market_data = get_current_market_data()
    
    # Проверка конца свечи
    actions = eoc_handler.process_end_of_candle(current_time, market_data)
    if actions:
        for action in actions:
            print(action)
    
    time.sleep(1)
```

## Торговые сессии и выходные

### Определение торговых часов

```python
class TradingSession:
    """Определение торговых сессий"""
    
    def __init__(self):
        # Основная сессия MOEX (MSK)
        self.main_session_start = pd.Timestamp('10:00').time()
        self.main_session_end = pd.Timestamp('18:40').time()
        
        # Вечерняя сессия (опционально)
        self.evening_session_start = pd.Timestamp('19:00').time()
        self.evening_session_end = pd.Timestamp('23:50').time()
    
    def is_trading_time(self, timestamp):
        """Проверка, является ли время торговым"""
        if isinstance(timestamp, str):
            timestamp = pd.to_datetime(timestamp)
        
        time_only = timestamp.time()
        
        # Проверка основной сессии
        in_main_session = (self.main_session_start <= time_only <= self.main_session_end)
        
        # Проверка вечерней сессии (если есть)
        in_evening_session = (self.evening_session_start <= time_only <= self.evening_session_end)
        
        # Проверка на выходной
        is_weekend = timestamp.weekday() >= 5  # 5 = суббота, 6 = воскресенье
        
        return (in_main_session or in_evening_session) and not is_weekend
    
    def get_next_trading_start(self, current_time):
        """Получение времени начала следующей торговой сессии"""
        if isinstance(current_time, str):
            current_time = pd.to_datetime(current_time)
        
        # Если сейчас торги идут, возвращаем текущее время
        if self.is_trading_time(current_time):
            return current_time
        
        # Поиск следующего торгового дня
        next_day = current_time
        while True:
            next_day += pd.Timedelta(days=1)
            if next_day.weekday() < 5:  # Будний день
                break
        
        # Начало торговой сессии
        trading_start = next_day.replace(hour=10, minute=0, second=0, microsecond=0)
        
        return trading_start
    
    def get_session_progress(self, timestamp):
        """Получение прогресса текущей сессии (0-1)"""
        if not self.is_trading_time(timestamp):
            return 0
        
        time_only = timestamp.time()
        
        if self.main_session_start <= time_only <= self.main_session_end:
            session_start = self.main_session_start
            session_end = self.main_session_end
        elif self.evening_session_start <= time_only <= self.evening_session_end:
            session_start = self.evening_session_start
            session_end = self.evening_session_end
        else:
            return 0
        
        session_duration = (pd.Timestamp.combine(pd.Date.today(), session_end) - 
                          pd.Timestamp.combine(pd.Date.today(), session_start)).total_seconds()
        
        elapsed = (pd.Timestamp.combine(pd.Date.today(), time_only) - 
                  pd.Timestamp.combine(pd.Date.today(), session_start)).total_seconds()
        
        return min(1.0, elapsed / session_duration)

# Пример использования
session = TradingSession()

current_time = pd.Timestamp.now()
print(f"Торговое время: {session.is_trading_time(current_time)}")
print(f"Прогресс сессии: {session.get_session_progress(current_time):.2%}")
```

## Синхронизация системного времени

### NTP синхронизация

```python
import ntplib
import time

def synchronize_system_time(ntp_server='pool.ntp.org'):
    """Синхронизация системного времени через NTP"""
    try:
        client = ntplib.NTPClient()
        response = client.request(ntp_server)
        
        # Время сервера
        server_time = response.tx_time
        
        # Локальное время
        local_time = time.time()
        
        # Разница
        time_diff = server_time - local_time
        
        print(f"Разница времени: {time_diff:.3f} секунд")
        
        if abs(time_diff) > 1:  # Разница более 1 секунды
            print("Рекомендуется синхронизация системного времени")
        
        return time_diff
    
    except Exception as e:
        print(f"Ошибка синхронизации времени: {e}")
        return None

# Синхронизация времени
time_diff = synchronize_system_time()
```

Правильная обработка времени предотвращает множество ошибок в торговых системах и обеспечивает корректную работу алгоритмов.
