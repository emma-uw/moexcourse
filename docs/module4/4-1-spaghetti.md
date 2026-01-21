---
sidebar_position: 4.1
---

# 4.1. Почему скрипты ломаются

Большинство начинающих разработчиков алгоритмов пишут код в стиле "спагетти" - один большой скрипт, где все перемешано. Это приводит к проблемам с поддержкой и расширением. В этом разделе мы разберем почему так происходит и как этого избежать.

## Проблемы спагетти-кода

### Что такое спагетти-код?

```python
# Пример плохого кода (спагетти)
import pandas as pd
from moexalgo import Ticker

def main():
    # Получаем данные
    ticker = Ticker('SBER')
    data = ticker.candles()
    
    # Расчет индикаторов
    data['ma'] = data['close'].rolling(20).mean()
    data['rsi'] = calculate_rsi(data['close'])
    
    # Генерация сигналов
    signals = []
    for i in range(len(data)):
        if data['close'].iloc[i] > data['ma'].iloc[i] and data['rsi'].iloc[i] < 30:
            signals.append('BUY')
        else:
            signals.append('HOLD')
    
    # Торговля
    position = 0
    for signal in signals:
        if signal == 'BUY' and position == 0:
            # Отправка ордера
            place_order('BUY', 100)
            position = 1
        elif signal == 'SELL' and position == 1:
            place_order('SELL', 100)
            position = 0
    
    print("Торговля завершена")

if __name__ == "__main__":
    main()
```

### Недостатки спагетти-кода

1. **Сложность понимания** - весь код в одном месте
2. **Трудность тестирования** - невозможно протестировать отдельные части
3. **Повторения кода** - одни и те же операции разбросаны по скрипту
4. **Сложность модификации** - изменение одной части ломает другую
5. **Отсутствие переиспользования** - код нельзя использовать в других проектах

## Объектно-ориентированное программирование (ООП)

ООП помогает организовать код в логические блоки - классы и объекты.

### Основные принципы ООП

1. **Инкапсуляция** - объединение данных и методов в классы
2. **Наследование** - создание новых классов на основе существующих
3. **Полиморфизм** - возможность использовать объекты разных типов одинаково

### Пример хорошей архитектуры

```python
class DataHandler:
    """Класс для работы с данными"""
    
    def __init__(self, ticker):
        self.ticker = ticker
    
    def get_data(self):
        ticker_obj = Ticker(self.ticker)
        return ticker_obj.candles()

class Strategy:
    """Класс для торговой стратегии"""
    
    def __init__(self, data_handler):
        self.data_handler = data_handler
    
    def calculate_indicators(self, data):
        data['ma'] = data['close'].rolling(20).mean()
        data['rsi'] = calculate_rsi(data['close'])
        return data
    
    def generate_signals(self, data):
        signals = []
        for i in range(len(data)):
            if (data['close'].iloc[i] > data['ma'].iloc[i] and 
                data['rsi'].iloc[i] < 30):
                signals.append('BUY')
            else:
                signals.append('HOLD')
        return signals

class TradingBot:
    """Основной класс торгового робота"""
    
    def __init__(self, ticker):
        self.data_handler = DataHandler(ticker)
        self.strategy = Strategy(self.data_handler)
        self.position = 0
    
    def run(self):
        data = self.data_handler.get_data()
        data = self.strategy.calculate_indicators(data)
        signals = self.strategy.generate_signals(data)
        
        for signal in signals:
            self.execute_signal(signal)
    
    def execute_signal(self, signal):
        if signal == 'BUY' and self.position == 0:
            place_order('BUY', 100)
            self.position = 1
        elif signal == 'SELL' and self.position == 1:
            place_order('SELL', 100)
            self.position = 0

# Использование
bot = TradingBot('SBER')
bot.run()
```

## Преимущества ООП

1. **Модульность** - каждый класс отвечает за свою задачу
2. **Переиспользование** - классы можно использовать в разных проектах
3. **Тестируемость** - легко тестировать отдельные компоненты
4. **Поддерживаемость** - изменения в одном классе не влияют на другие
5. **Расширяемость** - легко добавлять новые функции

## Переход от спагетти к ООП

1. **Выделите сущности** - определите основные объекты (данные, стратегия, торговля)
2. **Создайте классы** - для каждой сущности свой класс
3. **Разделите ответственность** - каждый класс делает только свою работу
4. **Добавьте интерфейсы** - четкие методы для взаимодействия классов

Правильная архитектура - залог успешного и долгосрочного проекта. Потратьте время на проектирование, и это окупится сторицей.
