---
sidebar_position: 5.1
---

# 5.1. Быстрый тест на Pandas

Базовое тестирование стратегии с помощью Pandas позволяет быстро оценить ее эффективность на исторических данных без сложных фреймворков.

## Расчет доходности (PnL)

PnL (Profit and Loss) - это прибыль или убыток от торговли. Для расчета нам нужны позиции и цены.

```python
def calculate_pnl(signals, prices, initial_capital=100000):
    """
    Расчет PnL на основе сигналов и цен
    """
    # Конвертируем сигналы в позиции
    positions = []
    current_position = 0
    
    for signal in signals:
        if signal == 'BUY' and current_position == 0:
            current_position = 1
        elif signal == 'SELL' and current_position == 1:
            current_position = 0
        positions.append(current_position)
    
    # Расчет доходности
    returns = prices.pct_change().fillna(0)
    strategy_returns = positions * returns
    
    # Кумулятивная доходность
    cumulative_returns = (1 + strategy_returns).cumprod()
    pnl = initial_capital * cumulative_returns
    
    return pnl, strategy_returns
```

## Основные статистики

```python
def calculate_basic_stats(returns, risk_free_rate=0.02):
    """
    Расчет основных статистик стратегии
    """
    # Общая доходность
    total_return = (1 + returns).prod() - 1
    
    # Среднегодовая доходность (предполагая 252 торговых дня)
    annual_return = (1 + total_return) ** (252 / len(returns)) - 1
    
    # Волатильность
    volatility = returns.std() * np.sqrt(252)
    
    # Максимальная просадка
    cumulative = (1 + returns).cumprod()
    running_max = cumulative.expanding().max()
    drawdown = (cumulative - running_max) / running_max
    max_drawdown = drawdown.min()
    
    # Коэффициент Шарпа
    excess_returns = returns - risk_free_rate/252
    sharpe_ratio = excess_returns.mean() / excess_returns.std() * np.sqrt(252)
    
    # Количество сделок
    trades = len([r for r in returns if abs(r) > 0.0001])  # Игнорируем очень маленькие изменения
    
    return {
        'total_return': total_return,
        'annual_return': annual_return,
        'volatility': volatility,
        'max_drawdown': max_drawdown,
        'sharpe_ratio': sharpe_ratio,
        'total_trades': trades
    }
```

## Пример полного теста

```python
def backtest_strategy(data, strategy_func, **params):
    """
    Полный бэктест стратегии
    """
    # Генерация сигналов
    signals = strategy_func(data, **params)
    
    # Расчет PnL
    pnl, returns = calculate_pnl(signals, data['close'])
    
    # Статистики
    stats = calculate_basic_stats(returns)
    
    # Вывод результатов
    print("=== Результаты бэктеста ===")
    print(".2%")
    print(".2%")
    print(".2%")
    print(".2%")
    print(".2f")
    print(f"Количество сделок: {stats['total_trades']}")
    
    return pnl, stats

# Пример использования
def simple_ma_strategy(data, fast_period=10, slow_period=30):
    """Простая стратегия пересечения скользящих средних"""
    fast_ma = data['close'].rolling(fast_period).mean()
    slow_ma = data['close'].rolling(slow_period).mean()
    
    signals = []
    for i in range(len(data)):
        if pd.isna(fast_ma.iloc[i]) or pd.isna(slow_ma.iloc[i]):
            signals.append('HOLD')
        elif fast_ma.iloc[i] > slow_ma.iloc[i] and fast_ma.iloc[i-1] <= slow_ma.iloc[i-1]:
            signals.append('BUY')
        elif fast_ma.iloc[i] < slow_ma.iloc[i] and fast_ma.iloc[i-1] >= slow_ma.iloc[i-1]:
            signals.append('SELL')
        else:
            signals.append('HOLD')
    
    return signals

# Запуск теста
pnl, stats = backtest_strategy(data, simple_ma_strategy, fast_period=10, slow_period=30)
```

## Визуализация результатов

```python
def plot_backtest_results(pnl, data):
    """Визуализация результатов бэктеста"""
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8))
    
    # График PnL
    ax1.plot(pnl.index, pnl.values, label='Стратегия')
    ax1.plot(data.index, [100000] * len(data), label='Buy & Hold', linestyle='--')
    ax1.set_title('Кумулятивная доходность')
    ax1.legend()
    ax1.grid(True)
    
    # График цены
    ax2.plot(data.index, data['close'], label='Цена актива')
    ax2.set_title('Цена актива')
    ax2.grid(True)
    
    plt.tight_layout()
    plt.show()
```

## Преимущества Pandas-бэктеста

- **Быстрота**: можно протестировать идею за минуты
- **Простота**: минимум зависимостей
- **Гибкость**: легко модифицировать логику
- **Отладка**: просто добавлять print-отладку

## Ограничения

- Нет учета комиссий и проскальзывания
- Не учитывает ограничения ликвидности
- Простые метрики риска

Для серьезного тестирования используйте специализированные фреймворки, но Pandas идеален для первичной проверки идей.
