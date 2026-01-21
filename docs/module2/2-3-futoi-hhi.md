---
sidebar_position: 2.3
---

# 2.3. FUTOI и HHI

FUTOI (Futures Open Interest) и HHI (Herfindahl-Hirschman Index) - это уникальные метрики, доступные через MOEX AlgoPack, которые предоставляют глубокий анализ рыночной структуры.

![image](/img/hi1.png)

## Futures Open Interest (FUTOI)

Открытый интерес по фьючерсам показывает общее количество незакрытых контрактов:

- **Рост OI** - увеличение интереса к инструменту
- **Падение OI** - снижение интереса, возможное закрытие позиций
- **Корреляция с ценой** - анализ взаимосвязи между OI и ценой актива

```python
# Пример анализа открытого интереса
def analyze_futoi_changes(futoi_data):
    futoi_data['oi_change'] = futoi_data['open_interest'].pct_change()
    futoi_data['price_change'] = futoi_data['close'].pct_change()
    
    # Корреляция между изменениями OI и цены
    correlation = futoi_data['oi_change'].corr(futoi_data['price_change'])
    return correlation
```

## Herfindahl-Hirschman Index (HHI)

HHI измеряет концентрацию владения акциями среди крупных акционеров:

- **Высокий HHI** - высокая концентрация, возможное влияние крупных игроков
- **Средний HHI** - умеренная концентрация
- **Низкий HHI**- распыленное владение

```python
def calculate_hhi(shareholders):
    """
    Расчет индекса Херфиндаля-Хиршмана
    shareholders: dict с долями акционеров
    """
    total_shares = sum(shareholders.values())
    hhi = sum((shares/total_shares)**2 for shares in shareholders.values())
    return hhi
```

## Торговые применения

### Анализ с FUTOI

- **Конвергенция/дивергенция** - сравнение движения цены и OI
- **Прогнозирование волатильности** - изменения OI как сигнал волатильности
- **Анализ ликвидности** - OI как индикатор ликвидности контракта

### Анализ с HHI

- **Оценка влияния крупных игроков** - высокая концентрация может привести к манипуляциям
- **Анализ стабильности** - низкий HHI указывает на более стабильный рынок
- **Идентификация целей поглощений** - компании с высоким HHI могут быть интересны для слияний

## Практические сигналы

```python
def generate_signals(price_data, futoi_data, hhi_data):
    signals = []
    
    for date in price_data.index:
        signal = {}
        
        # Сигнал на основе OI
        oi_change = futoi_data.loc[date, 'oi_change']
        if oi_change > 0.1:  # Рост OI более 10%
            signal['oi_signal'] = 'bullish'
        elif oi_change < -0.1:
            signal['oi_signal'] = 'bearish'
        
        # Сигнал на основе HHI
        hhi = hhi_data.loc[date, 'hhi']
        if hhi > 0.18:
            signal['concentration'] = 'high'
        
        signals.append(signal)
    
    return signals
```

Эти метрики дают уникальное преимущество в анализе, недоступное при работе только с ценовыми данными.
