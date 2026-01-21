---
sidebar_position: 3.2
---

# 3.2. Корреляционный анализ

Корреляционный анализ помогает выявить взаимосвязи между различными рыночными показателями. Мы научимся проверять гипотезы о влиянии одних факторов на другие.

## Основы корреляции

Корреляция измеряет силу и направление линейной связи между двумя переменными:

- **+1**: Полная положительная корреляция
- **0**: Отсутствие корреляции
- **-1**: Полная отрицательная корреляция

```python
import pandas as pd

# Расчет корреляции между двумя рядами
correlation = data['price'].corr(data['volume'])
print(f"Корреляция цена-объем: {correlation}")
```

## Анализ влияния дисбаланса на цену

Проверка гипотезы: "Влияет ли дисбаланс объемов в стакане на движение цены через 5 минут?"

```python
def analyze_orderbook_impact(data, imbalance_threshold=0.7, look_ahead=5):
    """
    Анализ влияния дисбаланса в стакане на будущую цену
    """
    # Расчет дисбаланса (bid_volume - ask_volume) / (bid_volume + ask_volume)
    data['imbalance'] = (data['bid_volume'] - data['ask_volume']) / (data['bid_volume'] + data['ask_volume'])
    
    # Будущая доходность через look_ahead минут
    data['future_return'] = data['close'].shift(-look_ahead) / data['close'] - 1
    
    # Фильтруем по порогу дисбаланса
    strong_imbalance = data[abs(data['imbalance']) > imbalance_threshold]
    
    # Корреляция между дисбалансом и будущей доходностью
    correlation = strong_imbalance['imbalance'].corr(strong_imbalance['future_return'])
    
    return correlation, strong_imbalance
```

## Матрица корреляций (Heatmap)

Визуализация взаимосвязей между множеством переменных:

```python
import seaborn as sns
import matplotlib.pyplot as plt

def plot_correlation_heatmap(data):
    """
    Построение heatmap корреляций
    """
    # Выбираем числовые колонки
    numeric_data = data.select_dtypes(include=[np.number])
    
    # Расчет матрицы корреляций
    corr_matrix = numeric_data.corr()
    
    # Построение heatmap
    plt.figure(figsize=(12, 8))
    sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', center=0)
    plt.title('Матрица корреляций рыночных показателей')
    plt.show()
    
    return corr_matrix
```

## Лагированная корреляция

Анализ корреляции с временными лагами:

```python
def lagged_correlation_analysis(data, max_lag=10):
    """
    Анализ корреляции с различными лагами
    """
    correlations = {}
    
    for lag in range(1, max_lag + 1):
        # Сдвигаем одну переменную на lag периодов
        lagged_price = data['price'].shift(lag)
        corr = data['imbalance'].corr(lagged_price)
        correlations[lag] = corr
    
    return correlations
```

## Интерпретация результатов

- **Высокая корреляция**: Сильная взаимосвязь, можно использовать для предсказания
- **Низкая корреляция**: Слабая связь, фактор не влияет на результат
- **Отрицательная корреляция**: Обратная зависимость

## Предупреждения

- **Корреляция ≠ причинно-следственная связь**
- **Спурная корреляция**: Случайные совпадения
- **Изменяющаяся корреляция**: Связи могут меняться со временем

Используйте корреляционный анализ для генерации идей, но всегда подтверждайте результаты бэктестингом.
