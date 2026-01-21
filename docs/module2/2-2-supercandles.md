---
sidebar_position: 2.2
---

# 2.2. SuperCandles

SuperCandles - это производные данные, созданные на основе базовых свечей. Они позволяют анализировать рынок на более высоком уровне абстракции и выявлять долгосрочные паттерны.

## Что такое SuperCandles

SuperCandles формируются путем агрегации нескольких обычных свечей:

- **Time-based aggregation** - объединение свечей по времени (часовые из минутных)
- **Volume-based aggregation** - объединение по объему торгов
- **Tick-based aggregation** - объединение по количеству сделок

## Примеры SuperCandles

### Агрегация по времени

```python
import pandas as pd

def create_hourly_supercandles(minute_data):
    # Группируем минутные данные в часовые
    hourly = minute_data.resample('H').agg({
        'open': 'first',
        'high': 'max',
        'low': 'min',
        'close': 'last',
        'volume': 'sum'
    })
    return hourly
```

### Агрегация по объему

```python
def create_volume_supercandles(data, target_volume=10000):
    supercandles = []
    current_candle = None
    
    for _, row in data.iterrows():
        if current_candle is None:
            current_candle = row.copy()
        else:
            current_candle['high'] = max(current_candle['high'], row['high'])
            current_candle['low'] = min(current_candle['low'], row['low'])
            current_candle['close'] = row['close']
            current_candle['volume'] += row['volume']
            
        if current_candle['volume'] >= target_volume:
            supercandles.append(current_candle)
            current_candle = None
    
    return pd.DataFrame(supercandles)
```

## Преимущества SuperCandles

- **Шумоподавление** - сглаживание краткосрочных колебаний
- **Выявление трендов** - лучшее представление долгосрочных движений
- **Мульти-таймфрейм анализ** - одновременный анализ разных масштабов
- **Снижение вычислительной нагрузки** - меньше данных для обработки

## Практическое применение

SuperCandles используются для:
- Анализа долгосрочных трендов
- Создания мульти-таймфреймовых индикаторов
- Оптимизации стратегий для разных горизонтов инвестирования
- Снижения влияния рыночного шума на сигналы

В комбинации с обычными свечами SuperCandles дают более полную картину рыночной динамики.
