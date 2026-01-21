---
sidebar_position: 3.4
---

# 3.4. Очистка данных

Качество данных критически важно для успешной работы алгоритмов. Неочищенные данные могут привести к неверным сигналам и убыткам. В этом разделе мы научимся обрабатывать пропуски, выбросы и другие проблемы с данными.

## Обнаружение пропусков

```python
import pandas as pd
import numpy as np

# Проверка на пропуски
def check_missing_data(data):
    missing_info = data.isnull().sum()
    missing_percent = (missing_info / len(data)) * 100
    
    print("Пропущенные значения:")
    for col, count in missing_info.items():
        if count > 0:
            print(f"{col}: {count} ({missing_percent[col]:.2f}%)")
    
    return missing_info
```

## Обработка пропусков

### Удаление пропусков

```python
# Удаление строк с пропусками
data_clean = data.dropna()

# Удаление колонок с большим количеством пропусков
threshold = 0.5  # 50%
data_clean = data.dropna(thresh=len(data)*threshold, axis=1)
```

### Заполнение пропусков

```python
# Заполнение средним значением
data['price'] = data['price'].fillna(data['price'].mean())

# Заполнение медианой (устойчиво к выбросам)
data['volume'] = data['volume'].fillna(data['volume'].median())

# Forward fill (использование предыдущего значения)
data['price'] = data['price'].fillna(method='ffill')

# Interpolation (интерполяция)
data['price'] = data['price'].interpolate(method='linear')
```

## Обнаружение выбросов

### Статистические методы

```python
def detect_outliers_zscore(data, threshold=3):
    """
    Обнаружение выбросов с помощью Z-score
    """
    z_scores = np.abs((data - data.mean()) / data.std())
    outliers = z_scores > threshold
    return outliers

def detect_outliers_iqr(data):
    """
    Обнаружение выбросов с помощью IQR
    """
    Q1 = data.quantile(0.25)
    Q3 = data.quantile(0.75)
    IQR = Q3 - Q1
    
    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR
    
    outliers = (data < lower_bound) | (data > upper_bound)
    return outliers
```

### Обработка выбросов

```python
def handle_outliers(data, column, method='clip'):
    """
    Обработка выбросов
    """
    if method == 'clip':
        # Ограничение значений
        lower = data[column].quantile(0.01)
        upper = data[column].quantile(0.99)
        data[column] = np.clip(data[column], lower, upper)
    
    elif method == 'remove':
        # Удаление выбросов
        outliers = detect_outliers_iqr(data[column])
        data = data[~outliers]
    
    elif method == 'winsorize':
        # Winsorization (замена на квантили)
        lower = data[column].quantile(0.05)
        upper = data[column].quantile(0.95)
        data[column] = np.where(data[column] < lower, lower,
                               np.where(data[column] > upper, upper, data[column]))
    
    return data
```

## Проверка на "битые" данные

### Валидация цен

```python
def validate_price_data(data):
    """
    Проверка корректности ценовых данных
    """
    issues = []
    
    # Проверка на отрицательные цены
    if (data['close'] <= 0).any():
        issues.append("Найдены отрицательные цены")
    
    # Проверка на экстремальные значения
    price_range = data['close'].max() / data['close'].min()
    if price_range > 10:  # Цена изменилась более чем в 10 раз
        issues.append("Обнаружены экстремальные изменения цены")
    
    # Проверка последовательности OHLC
    invalid_ohlc = (
        (data['high'] < data['low']) | 
        (data['open'] < data['low']) | 
        (data['close'] < data['low']) |
        (data['open'] > data['high']) | 
        (data['close'] > data['high'])
    )
    if invalid_ohlc.any():
        issues.append("Найдены некорректные OHLC данные")
    
    return issues
```

### Очистка объемов

```python
def clean_volume_data(data):
    """
    Очистка данных об объемах
    """
    # Удаление нулевых объемов в рабочее время
    trading_hours = (data.index.hour >= 10) & (data.index.hour <= 18)
    zero_volume_trading = (data['volume'] == 0) & trading_hours
    
    if zero_volume_trading.any():
        print(f"Удалено {zero_volume_trading.sum()} записей с нулевым объемом в рабочее время")
        data = data[~zero_volume_trading]
    
    return data
```

## Автоматизированная очистка

```python
def comprehensive_data_cleaning(data):
    """
    Комплексная очистка данных
    """
    original_shape = data.shape
    
    # 1. Обработка пропусков
    data = data.dropna(subset=['close', 'volume'])  # Критические поля
    data = data.fillna(method='ffill').fillna(method='bfill')  # Остальные
    
    # 2. Удаление выбросов по ценам
    data = handle_outliers(data, 'close', method='clip')
    data = handle_outliers(data, 'volume', method='clip')
    
    # 3. Валидация данных
    issues = validate_price_data(data)
    if issues:
        print("Найденные проблемы:")
        for issue in issues:
            print(f"- {issue}")
    
    # 4. Очистка объемов
    data = clean_volume_data(data)
    
    print(f"Очистка завершена: {original_shape[0]} -> {data.shape[0]} записей")
    
    return data
```

## Лучшие практики

1. **Документируйте изменения**: Ведите логи всех модификаций данных
2. **Тестируйте влияние**: Проверяйте, как очистка влияет на результаты
3. **Будьте консервативны**: Лучше сохранить немного "грязных" данных, чем потерять важную информацию
4. **Автоматизируйте**: Создавайте repeatable процессы очистки
5. **Мониторьте**: Регулярно проверяйте качество входящих данных

Чистые данные - основа надежных торговых стратегий. Потратьте время на качественную очистку, и это окупится результатами.
