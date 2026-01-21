---
sidebar_position: 4.2
---

# 4.2. Класс Strategy

Класс Strategy - сердце торгового робота. Он инкапсулирует всю логику принятия решений, отделяя расчет технических индикаторов от генерации торговых сигналов.

## Структура класса Strategy

```python
class BaseStrategy:
    """Базовый класс стратегии"""
    
    def __init__(self, parameters=None):
        self.parameters = parameters or {}
        self.indicators = {}
    
    def calculate_indicators(self, data):
        """Расчет технических индикаторов"""
        raise NotImplementedError
    
    def generate_signals(self, data):
        """Генерация торговых сигналов"""
        raise NotImplementedError
    
    def validate_signal(self, signal):
        """Валидация сигнала перед исполнением"""
        return signal

class MeanReversionStrategy(BaseStrategy):
    """Стратегия возврата к среднему"""
    
    def __init__(self, ma_period=20, threshold=2.0):
        super().__init__({
            'ma_period': ma_period,
            'threshold': threshold
        })
    
    def calculate_indicators(self, data):
        """Расчет индикаторов для стратегии"""
        # Скользящая средняя
        data['ma'] = data['close'].rolling(self.parameters['ma_period']).mean()
        
        # Стандартное отклонение
        data['std'] = data['close'].rolling(self.parameters['ma_period']).std()
        
        # Z-score (стандартизированное отклонение)
        data['z_score'] = (data['close'] - data['ma']) / data['std']
        
        return data
    
    def generate_signals(self, data):
        """Генерация сигналов на основе z-score"""
        signals = []
        
        for i in range(len(data)):
            z_score = data['z_score'].iloc[i]
            threshold = self.parameters['threshold']
            
            if pd.isna(z_score):
                signals.append('HOLD')
            elif z_score < -threshold:
                signals.append('BUY')
            elif z_score > threshold:
                signals.append('SELL')
            else:
                signals.append('HOLD')
        
        return signals
    
    def validate_signal(self, signal, current_position=0):
        """Дополнительная валидация сигналов"""
        # Не открываем позицию, если уже в позиции
        if signal == 'BUY' and current_position > 0:
            return 'HOLD'
        elif signal == 'SELL' and current_position < 0:
            return 'HOLD'
        
        return signal

class TrendFollowingStrategy(BaseStrategy):
    """Стратегия следования за трендом"""
    
    def __init__(self, fast_ma=10, slow_ma=30):
        super().__init__({
            'fast_ma': fast_ma,
            'slow_ma': slow_ma
        })
    
    def calculate_indicators(self, data):
        """Расчет скользящих средних"""
        data['fast_ma'] = data['close'].rolling(self.parameters['fast_ma']).mean()
        data['slow_ma'] = data['close'].rolling(self.parameters['slow_ma']).mean()
        
        return data
    
    def generate_signals(self, data):
        """Генерация сигналов на основе пересечения MA"""
        signals = []
        
        for i in range(len(data)):
            fast_ma = data['fast_ma'].iloc[i]
            slow_ma = data['slow_ma'].iloc[i]
            
            if pd.isna(fast_ma) or pd.isna(slow_ma):
                signals.append('HOLD')
                continue
            
            # Пересечение снизу вверх
            if (fast_ma > slow_ma and 
                data['fast_ma'].iloc[i-1] <= data['slow_ma'].iloc[i-1]):
                signals.append('BUY')
            
            # Пересечение сверху вниз
            elif (fast_ma < slow_ma and 
                  data['fast_ma'].iloc[i-1] >= data['slow_ma'].iloc[i-1]):
                signals.append('SELL')
            else:
                signals.append('HOLD')
        
        return signals
```

## Преимущества инкапсуляции

### 1. Разделение ответственности

```python
class StrategyManager:
    """Менеджер стратегий"""
    
    def __init__(self):
        self.strategies = {}
    
    def add_strategy(self, name, strategy):
        self.strategies[name] = strategy
    
    def run_strategy(self, name, data):
        strategy = self.strategies[name]
        data = strategy.calculate_indicators(data)
        signals = strategy.generate_signals(data)
        return signals
```

### 2. Легкость тестирования

```python
def test_strategy():
    """Тестирование стратегии"""
    strategy = MeanReversionStrategy(ma_period=20, threshold=2.0)
    
    # Тестовые данные
    test_data = pd.DataFrame({
        'close': [100, 95, 90, 105, 110]
    })
    
    # Расчет индикаторов
    result = strategy.calculate_indicators(test_data)
    
    # Проверка сигналов
    signals = strategy.generate_signals(result)
    
    assert len(signals) == len(test_data)
    print("Тест пройден!")

test_strategy()
```

### 3. Переиспользование кода

```python
class MultiTimeframeStrategy(BaseStrategy):
    """Стратегия с несколькими таймфреймами"""
    
    def __init__(self):
        self.hourly_strategy = TrendFollowingStrategy(fast_ma=5, slow_ma=20)
        self.daily_strategy = MeanReversionStrategy(ma_period=50, threshold=1.5)
    
    def calculate_indicators(self, data):
        # Используем существующие стратегии для разных таймфреймов
        hourly_data = self.hourly_strategy.calculate_indicators(data)
        daily_data = self.daily_strategy.calculate_indicators(data)
        
        # Комбинируем результаты
        combined = hourly_data.copy()
        combined['daily_signal'] = self.daily_strategy.generate_signals(daily_data)
        
        return combined
    
    def generate_signals(self, data):
        # Комбинированная логика
        hourly_signals = self.hourly_strategy.generate_signals(data)
        daily_signals = data['daily_signal'].tolist()
        
        # Итоговые сигналы
        final_signals = []
        for h_sig, d_sig in zip(hourly_signals, daily_signals):
            if h_sig == d_sig:  # Согласие стратегий
                final_signals.append(h_sig)
            else:
                final_signals.append('HOLD')  # Нет согласия
        
        return final_signals
```

## Лучшие практики

1. **Наследование** - создавайте базовые классы для общих функций
2. **Интерфейсы** - четкие методы для взаимодействия
3. **Валидация** - проверяйте входные данные и сигналы
4. **Документация** - описывайте параметры и логику
5. **Тестирование** - пишите unit-тесты для стратегий

Класс Strategy делает код модульным, тестируемым и поддерживаемым. Это основа для создания надежных торговых систем.
