---
sidebar_position: 3.3
---

# 3.3. Создание "Сигналов"

Сигналы - это правила, по которым алгоритм принимает решения о покупке или продаже. Мы научимся программировать логику сигналов с использованием условных операторов.

## Основы создания сигналов

Сигналы формируются на основе анализа рыночных данных и условий:

```python
def generate_signals(data):
    """
    Функция генерации торговых сигналов
    Возвращает: 'BUY', 'SELL', или 'HOLD'
    """
    signals = []
    
    for i in range(len(data)):
        signal = 'HOLD'  # По умолчанию держим позицию
        
        # Условия для сигнала
        if check_buy_conditions(data, i):
            signal = 'BUY'
        elif check_sell_conditions(data, i):
            signal = 'SELL'
        
        signals.append(signal)
    
    return signals
```

## Примеры сигналов

### Сигнал на основе дисбаланса и скользящей средней

```python
def orderbook_ma_signal(data, imbalance_threshold=0.8, ma_period=20):
    """
    Сигнал: дисбаланс > 80% и цена выше скользящей средней
    """
    # Расчет дисбаланса
    data['imbalance'] = (data['bid_volume'] - data['ask_volume']) / (data['bid_volume'] + data['ask_volume'])
    
    # Расчет скользящей средней
    data['ma'] = data['close'].rolling(ma_period).mean()
    
    signals = []
    
    for i in range(len(data)):
        if (data['imbalance'].iloc[i] > imbalance_threshold and 
            data['close'].iloc[i] > data['ma'].iloc[i]):
            signals.append('BUY')
        elif (data['imbalance'].iloc[i] < -imbalance_threshold and 
              data['close'].iloc[i] < data['ma'].iloc[i]):
            signals.append('SELL')
        else:
            signals.append('HOLD')
    
    return signals
```

### Многофакторный сигнал

```python
def multi_factor_signal(data):
    """
    Сигнал на основе нескольких факторов
    """
    signals = []
    
    for i in range(len(data)):
        buy_score = 0
        sell_score = 0
        
        # Фактор 1: Относительная сила (RSI)
        rsi = calculate_rsi(data['close'], 14)
        if rsi.iloc[i] < 30:
            buy_score += 1
        elif rsi.iloc[i] > 70:
            sell_score += 1
        
        # Фактор 2: Тренд (скользящие средние)
        if data['close'].iloc[i] > data['ma_20'].iloc[i] > data['ma_50'].iloc[i]:
            buy_score += 1
        elif data['close'].iloc[i] < data['ma_20'].iloc[i] < data['ma_50'].iloc[i]:
            sell_score += 1
        
        # Фактор 3: Объем
        avg_volume = data['volume'].rolling(20).mean()
        if data['volume'].iloc[i] > avg_volume.iloc[i] * 1.5:
            if buy_score > sell_score:
                buy_score += 1
            elif sell_score > buy_score:
                sell_score += 1
        
        # Решение
        if buy_score >= 2:
            signals.append('BUY')
        elif sell_score >= 2:
            signals.append('SELL')
        else:
            signals.append('HOLD')
    
    return signals
```

## Валидация сигналов

Проверка качества сигналов:

```python
def validate_signals(signals, returns):
    """
    Оценка эффективности сигналов
    """
    # Конвертируем сигналы в позиции
    positions = []
    for signal in signals:
        if signal == 'BUY':
            positions.append(1)  # Длинная позиция
        elif signal == 'SELL':
            positions.append(-1)  # Короткая позиция
        else:
            positions.append(0)  # Нет позиции
    
    # Расчет доходности стратегии
    strategy_returns = positions * returns
    
    # Метрики
    total_return = strategy_returns.sum()
    sharpe_ratio = strategy_returns.mean() / strategy_returns.std() * np.sqrt(252)
    max_drawdown = calculate_max_drawdown(strategy_returns)
    
    return {
        'total_return': total_return,
        'sharpe_ratio': sharpe_ratio,
        'max_drawdown': max_drawdown
    }
```

## Лучшие практики

1. **Простота**: Начинайте с простых сигналов
2. **Тестирование**: Всегда тестируйте на исторических данных
3. **Диверсификация**: Комбинируйте несколько факторов
4. **Управление рисками**: Добавляйте стоп-лоссы
5. **Адаптивность**: Мониторьте эффективность и корректируйте

Сигналы - это сердце любой торговой стратегии. Качественные сигналы могут принести стабильную прибыль при правильном управлении рисками.
