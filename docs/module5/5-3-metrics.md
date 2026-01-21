---
sidebar_position: 5.3
---

# 5.3. Метрики эффективности

Метрики эффективности позволяют объективно оценить качество торговой стратегии. Они помогают сравнивать стратегии между собой и принимать решение о внедрении.

## Основные метрики доходности

### Общая доходность (Total Return)

```python
def calculate_total_return(initial_capital, final_capital):
    """Расчет общей доходности"""
    return (final_capital / initial_capital) - 1

# Пример
initial = 100000
final = 125000
total_return = calculate_total_return(initial, final)
print(f"Общая доходность: {total_return:.2%}")  # 25.00%
```

### Среднегодовая доходность (Annualized Return)

```python
def calculate_annualized_return(total_return, years):
    """Расчет среднегодовой доходности"""
    if years <= 0:
        return 0
    return (1 + total_return) ** (1 / years) - 1

# Для данных за 2 года
annualized_return = calculate_annualized_return(0.25, 2)
print(f"Среднегодовая доходность: {annualized_return:.2%}")  # 11.80%
```

## Метрики риска

### Волатильность (Volatility)

```python
def calculate_volatility(returns, periods_per_year=252):
    """Расчет волатильности (стандартное отклонение)"""
    return returns.std() * np.sqrt(periods_per_year)

# Для дневных доходностей
daily_volatility = calculate_volatility(daily_returns)
annual_volatility = daily_volatility * np.sqrt(252)
```

### Максимальная просадка (Maximum Drawdown)

```python
def calculate_max_drawdown(cumulative_returns):
    """Расчет максимальной просадки"""
    # Кумулятивная доходность
    cumulative = (1 + cumulative_returns).cumprod()
    
    # Максимум на каждом шаге
    running_max = cumulative.expanding().max()
    
    # Просадка
    drawdown = (cumulative - running_max) / running_max
    
    # Максимальная просадка
    max_drawdown = drawdown.min()
    
    return max_drawdown, drawdown

# Пример
max_dd, drawdown_series = calculate_max_drawdown(daily_returns)
print(f"Максимальная просадка: {max_dd:.2%}")
```

## Метрики доходность/риск

### Коэффициент Шарпа (Sharpe Ratio)

```python
def calculate_sharpe_ratio(returns, risk_free_rate=0.02, periods_per_year=252):
    """Расчет коэффициента Шарпа"""
    # Преобразование безрисковой ставки к периодичности
    rf_per_period = risk_free_rate / periods_per_year
    
    # Избыточная доходность
    excess_returns = returns - rf_per_period
    
    # Коэффициент Шарпа
    sharpe = excess_returns.mean() / excess_returns.std() * np.sqrt(periods_per_year)
    
    return sharpe

# Пример
sharpe = calculate_sharpe_ratio(daily_returns, risk_free_rate=0.05)
print(f"Коэффициент Шарпа: {sharpe:.2f}")

# Интерпретация:
# < 1.0: Плохая доходность с учетом риска
# 1.0 - 2.0: Приемлемая доходность
# 2.0 - 3.0: Очень хорошая доходность
# > 3.0: Исключительная доходность
```

### Коэффициент Сортино (Sortino Ratio)

```python
def calculate_sortino_ratio(returns, risk_free_rate=0.02, periods_per_year=252):
    """Расчет коэффициента Сортино (учитывает только негативную волатильность)"""
    rf_per_period = risk_free_rate / periods_per_year
    excess_returns = returns - rf_per_period
    
    # Только негативные доходности
    downside_returns = excess_returns[excess_returns < 0]
    
    if len(downside_returns) == 0:
        return np.inf  # Нет просадок
    
    downside_deviation = downside_returns.std()
    sortino = excess_returns.mean() / downside_deviation * np.sqrt(periods_per_year)
    
    return sortino
```

### Коэффициент Калмара (Calmar Ratio)

```python
def calculate_calmar_ratio(annualized_return, max_drawdown):
    """Расчет коэффициента Калмара"""
    if max_drawdown == 0:
        return np.inf
    
    return annualized_return / abs(max_drawdown)

# Пример
calmar = calculate_calmar_ratio(0.15, -0.20)  # 15% доходность, 20% просадка
print(f"Коэффициент Калмара: {calmar:.2f}")  # 0.75
```

## Метрики эффективности торговли

### Фактор восстановления (Recovery Factor)

```python
def calculate_recovery_factor(total_return, max_drawdown):
    """Расчет фактора восстановления"""
    if max_drawdown == 0:
        return np.inf
    
    return total_return / abs(max_drawdown)

# Интерпретация:
# < 1.0: Стратегия убыточна
# 1.0 - 3.0: Приемлемый фактор
# > 3.0: Отличный фактор восстановления
```

### Процент выигрышных сделок (Win Rate)

```python
def calculate_win_rate(trades):
    """Расчет процента выигрышных сделок"""
    if not trades:
        return 0
    
    winning_trades = [t for t in trades if t['pnl'] > 0]
    win_rate = len(winning_trades) / len(trades) * 100
    
    return win_rate
```

### Средняя прибыль/убыток (Average Win/Loss)

```python
def calculate_avg_win_loss(trades):
    """Расчет средней прибыли и убытка"""
    winning_trades = [t['pnl'] for t in trades if t['pnl'] > 0]
    losing_trades = [t['pnl'] for t in trades if t['pnl'] < 0]
    
    avg_win = np.mean(winning_trades) if winning_trades else 0
    avg_loss = np.mean(losing_trades) if losing_trades else 0
    
    return avg_win, avg_loss
```

### Коэффициент профит-фактор (Profit Factor)

```python
def calculate_profit_factor(trades):
    """Расчет профит-фактора"""
    gross_profit = sum(t['pnl'] for t in trades if t['pnl'] > 0)
    gross_loss = abs(sum(t['pnl'] for t in trades if t['pnl'] < 0))
    
    if gross_loss == 0:
        return np.inf
    
    return gross_profit / gross_loss

# Интерпретация:
# < 1.0: Убыточная стратегия
# 1.0 - 1.5: Слабая стратегия
# 1.5 - 2.0: Хорошая стратегия
# > 2.0: Отличная стратегия
```

## Комплексная оценка стратегии

```python
class StrategyEvaluator:
    """Комплексный анализ стратегии"""
    
    def __init__(self, returns, trades, initial_capital=100000):
        self.returns = returns
        self.trades = trades
        self.initial_capital = initial_capital
    
    def generate_report(self):
        """Генерация полного отчета"""
        # Расчет метрик
        total_return = calculate_total_return(self.initial_capital, 
                                            self.initial_capital * (1 + self.returns).prod())
        
        annualized_return = calculate_annualized_return(total_return, len(self.returns)/252)
        
        volatility = calculate_volatility(self.returns)
        
        max_drawdown, _ = calculate_max_drawdown(self.returns)
        
        sharpe = calculate_sharpe_ratio(self.returns)
        
        sortino = calculate_sortino_ratio(self.returns)
        
        calmar = calculate_calmar_ratio(annualized_return, max_drawdown)
        
        win_rate = calculate_win_rate(self.trades)
        
        profit_factor = calculate_profit_factor(self.trades)
        
        # Формирование отчета
        report = f"""
        === ОТЧЕТ О БЭКТЕСТИНГЕ СТРАТЕГИИ ===
        
        ДОХОДНОСТЬ:
        Общая доходность: {total_return:.2%}
        Среднегодовая доходность: {annualized_return:.2%}
        
        РИСК:
        Волатильность: {volatility:.2%}
        Максимальная просадка: {max_drawdown:.2%}
        
        ДОХОДНОСТЬ/РИСК:
        Коэффициент Шарпа: {sharpe:.2f}
        Коэффициент Сортино: {sortino:.2f}
        Коэффициент Калмара: {calmar:.2f}
        
        ЭФФЕКТИВНОСТЬ ТОРГОВЛИ:
        Процент выигрышных сделок: {win_rate:.1f}%
        Профит-фактор: {profit_factor:.2f}
        Количество сделок: {len(self.trades)}
        
        ОЦЕНКА:
        {'✅ Отличная стратегия' if sharpe > 2 and profit_factor > 2 else '⚠️ Требует улучшения'}
        """
        
        return report
```

## Как читать отчет бэктеста

### Хорошие показатели:
- **Sharpe Ratio > 1.5**: Хорошая доходность с учетом риска
- **Max Drawdown < 20%**: Приемлемый уровень просадки
- **Profit Factor > 1.5**: Стратегия генерирует прибыль
- **Win Rate > 50%**: Большинство сделок прибыльные

### Красные флаги:
- **Sharpe Ratio < 0.5**: Плохое соотношение доходность/риск
- **Max Drawdown > 50%**: Катастрофические просадки
- **Profit Factor < 1.0**: Стратегия убыточна
- **Consistency**: Метрики стабильны на разных периодах

### Сравнение с бенчмарком:
- Сравнивайте с пассивной стратегией (Buy & Hold)
- Учитывайте транзакционные издержки
- Проверяйте на разных рыночных условиях

## Лучшие практики

1. **Не переоптимизируйте**: Не подгоняйте параметры под исторические данные
2. **Тестируйте на разных периодах**: In-sample и out-of-sample тестирование
3. **Учитывайте реалии**: Комиссии, проскальзывание, ликвидность
4. **Мониторьте регулярно**: Метрики могут меняться со временем
5. **Комбинируйте метрики**: Используйте несколько показателей для оценки

Правильное понимание метрик поможет принимать обоснованные решения о внедрении стратегии в реальную торговлю.
