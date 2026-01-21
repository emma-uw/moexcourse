---
sidebar_position: 5.4
---

# 5.4. Оптимизация параметров

Оптимизация параметров - важный этап разработки стратегии, но она таит в себе опасность переоптимизации (overfitting). Научимся правильно подбирать параметры, избегая подгонки под исторические данные.

## Проблема переоптимизации (Overfitting)

### Что такое overfitting?

```python
# Пример переоптимизации
def overfit_strategy(data, optimal_period=42):  # "Оптимальный" период
    """Стратегия, оптимизированная под конкретные данные"""
    ma = data['close'].rolling(optimal_period).mean()
    signals = []
    
    for i in range(len(data)):
        if data['close'].iloc[i] > ma.iloc[i]:
            signals.append('BUY')
        else:
            signals.append('SELL')
    
    return signals

# Результат: Отличные показатели на исторических данных
# Реальность: Полный провал в будущем
```

### Почему происходит overfitting?

1. **Слишком много параметров**: Попытка оптимизировать все возможные настройки
2. **Отсутствие валидации**: Проверка только на одних данных
3. **Случайные совпадения**: Стратегия улавливает шум, а не реальные закономерности
4. **Data snooping**: Многократное тестирование на одних данных

## Правильный подход: Train/Validation/Test

### Разделение данных

```python
def split_data_for_testing(data, train_ratio=0.6, val_ratio=0.2):
    """Разделение данных на обучающую, валидационную и тестовую выборки"""
    n = len(data)
    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))
    
    train_data = data[:train_end]
    val_data = data[train_end:val_end]
    test_data = data[val_end:]
    
    return train_data, val_data, test_data

# Пример
train_data, val_data, test_data = split_data_for_testing(data)
print(f"Train: {len(train_data)}, Val: {len(val_data)}, Test: {len(test_data)}")
```

### In-sample vs Out-of-sample

- **In-sample**: Данные для оптимизации параметров
- **Out-of-sample**: Данные для проверки качества оптимизации

```python
class ParameterOptimizer:
    """Оптимизатор параметров с валидацией"""
    
    def __init__(self, strategy_class, metric='sharpe'):
        self.strategy_class = strategy_class
        self.metric = metric
    
    def optimize_parameters(self, train_data, val_data, param_grid):
        """Оптимизация параметров с кросс-валидацией"""
        best_params = None
        best_score = -np.inf
        
        # Перебор всех комбинаций параметров
        for params in self._generate_param_combinations(param_grid):
            # Тестирование на обучающих данных
            train_score = self._evaluate_strategy(train_data, params)
            
            # Тестирование на валидационных данных
            val_score = self._evaluate_strategy(val_data, params)
            
            # Используем среднее или другую метрику
            combined_score = (train_score + val_score) / 2
            
            if combined_score > best_score:
                best_score = combined_score
                best_params = params
        
        return best_params, best_score
    
    def _generate_param_combinations(self, param_grid):
        """Генерация всех комбинаций параметров"""
        import itertools
        
        keys = param_grid.keys()
        values = param_grid.values()
        
        for combination in itertools.product(*values):
            yield dict(zip(keys, combination))
    
    def _evaluate_strategy(self, data, params):
        """Оценка стратегии с заданными параметрами"""
        strategy = self.strategy_class(**params)
        
        # Генерация сигналов
        signals = strategy.generate_signals(data)
        
        # Расчет метрики
        if self.metric == 'sharpe':
            returns = self._calculate_returns(signals, data)
            score = calculate_sharpe_ratio(returns)
        elif self.metric == 'total_return':
            returns = self._calculate_returns(signals, data)
            score = (1 + returns).prod() - 1
        else:
            score = 0
        
        return score
    
    def _calculate_returns(self, signals, data):
        """Расчет доходностей стратегии"""
        position = 0
        returns = []
        
        for i in range(len(signals)):
            signal = signals[i]
            
            if signal == 'BUY' and position == 0:
                position = 1
            elif signal == 'SELL' and position == 1:
                position = 0
            
            # Расчет доходности позиции
            if position == 1:
                ret = data['close'].pct_change().iloc[i]
            else:
                ret = 0
            
            returns.append(ret)
        
        return pd.Series(returns)

# Пример использования
optimizer = ParameterOptimizer(MeanReversionStrategy, metric='sharpe')

param_grid = {
    'ma_period': [10, 20, 30, 50],
    'threshold': [1.5, 2.0, 2.5, 3.0]
}

best_params, best_score = optimizer.optimize_parameters(
    train_data, val_data, param_grid
)

print(f"Лучшие параметры: {best_params}")
print(f"Лучший скор: {best_score:.2f}")

# Финальная проверка на тестовых данных
test_strategy = MeanReversionStrategy(**best_params)
test_signals = test_strategy.generate_signals(test_data)
test_score = optimizer._evaluate_strategy(test_data, best_params)

print(f"Результат на тестовых данных: {test_score:.2f}")
```

## Методы оптимизации

### Grid Search (Перебор по сетке)

```python
def grid_search_optimization(strategy_class, data, param_grid, metric='sharpe'):
    """Простой перебор параметров"""
    best_params = None
    best_score = -np.inf
    
    total_combinations = np.prod([len(v) for v in param_grid.values()])
    print(f"Всего комбинаций: {total_combinations}")
    
    for i, params in enumerate(generate_param_combinations(param_grid)):
        score = evaluate_strategy(strategy_class, data, params, metric)
        
        if score > best_score:
            best_score = score
            best_params = params
        
        if (i + 1) % 10 == 0:
            print(f"Проверено {i + 1}/{total_combinations} комбинаций")
    
    return best_params, best_score
```

### Random Search (Случайный поиск)

```python
def random_search_optimization(strategy_class, data, param_distributions, 
                              n_iterations=100, metric='sharpe'):
    """Случайный поиск параметров"""
    best_params = None
    best_score = -np.inf
    
    for i in range(n_iterations):
        # Генерация случайных параметров
        params = {}
        for param_name, distribution in param_distributions.items():
            if isinstance(distribution, list):
                params[param_name] = np.random.choice(distribution)
            elif isinstance(distribution, tuple):  # (min, max)
                params[param_name] = np.random.uniform(distribution[0], distribution[1])
        
        score = evaluate_strategy(strategy_class, data, params, metric)
        
        if score > best_score:
            best_score = score
            best_params = params
    
    return best_params, best_score

# Пример распределений
param_distributions = {
    'ma_period': [5, 10, 15, 20, 30, 50, 100],
    'threshold': (1.0, 4.0),  # равномерное распределение от 1.0 до 4.0
}
```

### Walk Forward Optimization

```python
def walk_forward_optimization(strategy_class, data, param_grid, window_size=252):
    """Пошаговая оптимизация (Walk Forward)"""
    optimized_params = []
    
    for i in range(window_size, len(data), window_size // 4):  # Шаг 3 месяца
        # Оптимизация на окне
        window_data = data[i-window_size:i]
        
        best_params, _ = grid_search_optimization(
            strategy_class, window_data, param_grid
        )
        
        # Сохранение параметров для будущих периодов
        for j in range(window_size // 4):
            if i + j < len(data):
                optimized_params.append(best_params)
    
    # Дополнение для начала
    first_params = optimized_params[0] if optimized_params else list(param_grid.keys())[0]
    optimized_params = [first_params] * window_size + optimized_params
    
    return optimized_params[:len(data)]
```

## Избегание overfitting

### Правила оптимизации

1. **Ограничьте количество параметров**: Максимум 3-5 параметров
2. **Используйте разумные диапазоны**: Основанные на теории, не на данных
3. **Валидируйте на out-of-sample**: Всегда проверяйте на новых данных
4. **Walk Forward Analysis**: Оптимизация с расширением окна
5. **Robustness testing**: Проверка стабильности параметров

### Признаки overfitting

```python
def check_overfitting(train_score, val_score, test_score):
    """Проверка на переоптимизацию"""
    overfitting_indicators = []
    
    # Разница между train и validation
    train_val_gap = train_score - val_score
    if train_val_gap > 0.5:
        overfitting_indicators.append("Большой разрыв между train и validation")
    
    # Падение качества на test
    val_test_gap = val_score - test_score
    if val_test_gap > 0.3:
        overfitting_indicators.append("Качество падает на тестовых данных")
    
    # Слишком высокая train score
    if train_score > 3.0:  # Sharpe > 3
        overfitting_indicators.append("Слишком хорошие результаты на обучении")
    
    return overfitting_indicators
```

## Лучшие практики

1. **Начинайте с простых стратегий**: Добавляйте сложность постепенно
2. **Фиксируйте параметры заранее**: Определяйте диапазоны до тестирования
3. **Используйте кросс-валидацию**: Множественные разбиения данных
4. **Тестируйте на разных рынках**: Проверяйте на разных активах/периодах
5. **Регуляризация**: Добавляйте штрафы за сложность стратегии

## Реалистичные ожидания

- **Хороший Sharpe Ratio**: 1.5-2.0 (не 3.0+)
- **Стабильность**: Параметры работают на разных периодах
- **Логичность**: Параметры имеют экономический смысл
- **Robustness**: Стратегия работает в разных условиях

Оптимизация - это баланс между подгонкой под данные и сохранением адаптивности стратегии к будущим изменениям рынка.
