---
sidebar_position: 5.2
---

# 5.2. Симуляция реальности

Идеальный бэктест показывает красивые кривые доходности, но реальная торговля далека от идеала. Нужно учитывать комиссии, проскальзывание и другие реалии рынка.

## Комиссии брокера и биржи

### Структура комиссий на MOEX

```python
class CommissionCalculator:
    """Расчет комиссий для MOEX"""
    
    def __init__(self):
        # Комиссии в базисных пунктах (0.01% = 1 bp)
        self.broker_commission = 0.04  # 0.04%
        self.exchange_commission = 0.01  # 0.01%
        self.min_commission = 0.01  # Минимальная комиссия в рублях
    
    def calculate_trade_commission(self, price, quantity, is_market_order=True):
        """Расчет комиссии за сделку"""
        trade_value = price * quantity
        
        # Брокерская комиссия
        broker_fee = max(trade_value * self.broker_commission / 100, self.min_commission)
        
        # Биржевая комиссия
        exchange_fee = trade_value * self.exchange_commission / 100
        
        # Для рыночных ордеров может быть дополнительная комиссия
        market_fee = 0
        if is_market_order:
            market_fee = trade_value * 0.005 / 100  # 0.005%
        
        total_commission = broker_fee + exchange_fee + market_fee
        
        return {
            'broker_fee': broker_fee,
            'exchange_fee': exchange_fee,
            'market_fee': market_fee,
            'total': total_commission,
            'percentage': (total_commission / trade_value) * 100
        }
```

### Применение комиссий в бэктесте

```python
def apply_commissions_to_backtest(signals, prices, commission_calc):
    """Применение комиссий к результатам бэктеста"""
    capital = 100000
    position = 0
    trades = []
    
    for i in range(len(signals)):
        signal = signals[i]
        price = prices.iloc[i]
        
        if signal == 'BUY' and position == 0:
            # Покупка
            quantity = capital // price  # Максимальное количество
            commission = commission_calc.calculate_trade_commission(price, quantity)
            
            actual_cost = (price * quantity) + commission['total']
            capital -= actual_cost
            position = quantity
            
            trades.append({
                'type': 'BUY',
                'price': price,
                'quantity': quantity,
                'commission': commission['total'],
                'timestamp': prices.index[i]
            })
            
        elif signal == 'SELL' and position > 0:
            # Продажа
            commission = commission_calc.calculate_trade_commission(price, position)
            
            revenue = (price * position) - commission['total']
            capital += revenue
            position = 0
            
            trades.append({
                'type': 'SELL',
                'price': price,
                'quantity': position,
                'commission': commission['total'],
                'timestamp': prices.index[i]
            })
    
    return capital, trades
```

## Проскальзывание (Slippage)

Проскальзывание - разница между ожидаемой ценой исполнения и реальной ценой.

### Типы проскальзывания

1. **Ценовое проскальзывание**: Ордер исполняется по худшей цене
2. **Временное проскальзывание**: Задержка между сигналом и исполнением
3. **Объемное проскальзывание**: Невозможно исполнить весь объем по заявленной цене

### Моделирование проскальзывания

```python
class SlippageModel:
    """Модель проскальзывания"""
    
    def __init__(self, volatility_multiplier=0.5, volume_impact=0.1):
        self.volatility_multiplier = volatility_multiplier
        self.volume_impact = volume_impact
    
    def calculate_price_slippage(self, signal_price, order_type, volatility, spread):
        """Расчет ценового проскальзывания"""
        if order_type == 'market':
            # Для рыночных ордеров проскальзывание зависит от волатильности
            slippage = signal_price * volatility * self.volatility_multiplier
            
            if signal_price == 'BUY':
                return signal_price + slippage
            else:  # SELL
                return signal_price - slippage
        
        elif order_type == 'limit':
            # Для лимитных ордеров проскальзывание меньше
            return signal_price
    
    def calculate_volume_slippage(self, desired_volume, available_volume):
        """Расчет объемного проскальзывания"""
        if desired_volume <= available_volume:
            return desired_volume  # Полное исполнение
        else:
            return available_volume * 0.9  # Частичное исполнение
    
    def apply_slippage_to_order(self, order_price, order_volume, market_data):
        """Применение проскальзывания к ордеру"""
        # Получаем рыночные данные
        current_volatility = market_data['volatility']
        current_spread = market_data['spread']
        available_volume = market_data['available_volume']
        
        # Расчет эффективной цены
        effective_price = self.calculate_price_slippage(
            order_price, 'market', current_volatility, current_spread
        )
        
        # Расчет исполненного объема
        executed_volume = self.calculate_volume_slippage(order_volume, available_volume)
        
        return effective_price, executed_volume
```

## Реалистичный бэктест

```python
class RealisticBacktester:
    """Бэктестер с учетом реалий рынка"""
    
    def __init__(self):
        self.commission_calc = CommissionCalculator()
        self.slippage_model = SlippageModel()
        self.initial_capital = 100000
    
    def run_realistic_backtest(self, signals, price_data, volume_data):
        """Запуск реалистичного бэктеста"""
        capital = self.initial_capital
        position = 0
        trades = []
        daily_pnl = []
        
        for i in range(len(signals)):
            signal = signals[i]
            price = price_data.iloc[i]
            volume = volume_data.iloc[i]
            
            # Подготовка рыночных данных для проскальзывания
            market_data = {
                'volatility': price_data.pct_change().rolling(20).std().iloc[i],
                'spread': price * 0.001,  # Предполагаем спред 0.1%
                'available_volume': volume
            }
            
            if signal == 'BUY' and position == 0:
                # Покупка с проскальзыванием
                desired_quantity = capital // price
                
                effective_price, executed_quantity = self.slippage_model.apply_slippage_to_order(
                    price, desired_quantity, market_data
                )
                
                # Расчет комиссий
                commission = self.commission_calc.calculate_trade_commission(
                    effective_price, executed_quantity
                )
                
                # Исполнение сделки
                cost = (effective_price * executed_quantity) + commission['total']
                capital -= cost
                position = executed_quantity
                
                trades.append({
                    'type': 'BUY',
                    'signal_price': price,
                    'execution_price': effective_price,
                    'quantity': executed_quantity,
                    'commission': commission['total'],
                    'slippage': effective_price - price,
                    'timestamp': price_data.index[i]
                })
                
            elif signal == 'SELL' and position > 0:
                # Продажа с проскальзыванием
                effective_price, executed_quantity = self.slippage_model.apply_slippage_to_order(
                    price, position, market_data
                )
                
                # Расчет комиссий
                commission = self.commission_calc.calculate_trade_commission(
                    effective_price, executed_quantity
                )
                
                # Исполнение сделки
                revenue = (effective_price * executed_quantity) - commission['total']
                capital += revenue
                position -= executed_quantity
                
                trades.append({
                    'type': 'SELL',
                    'signal_price': price,
                    'execution_price': effective_price,
                    'quantity': executed_quantity,
                    'commission': commission['total'],
                    'slippage': price - effective_price,
                    'timestamp': price_data.index[i]
                })
            
            # Отслеживание дневного PnL
            if i > 0 and price_data.index[i].date() != price_data.index[i-1].date():
                daily_pnl.append(capital - self.initial_capital)
        
        return capital, trades, daily_pnl
    
    def calculate_realistic_metrics(self, final_capital, trades, daily_pnl):
        """Расчет реалистичных метрик"""
        total_return = (final_capital / self.initial_capital) - 1
        
        # Учет комиссий в общей доходности
        total_commissions = sum(trade['commission'] for trade in trades)
        commission_impact = total_commissions / self.initial_capital
        
        # Учет проскальзывания
        total_slippage_impact = sum(abs(trade['slippage']) * trade['quantity'] 
                                  for trade in trades) / self.initial_capital
        
        # Расчет максимальной просадки с учетом комиссий
        cumulative_returns = np.array(daily_pnl)
        running_max = np.maximum.accumulate(cumulative_returns)
        drawdown = cumulative_returns - running_max
        max_drawdown = np.min(drawdown)
        
        return {
            'total_return': total_return,
            'commission_impact': commission_impact,
            'slippage_impact': total_slippage_impact,
            'max_drawdown': max_drawdown,
            'total_trades': len(trades),
            'win_rate': len([t for t in trades if t['type'] == 'SELL']) / len(trades) * 100
        }
```

## Важность реалистичного тестирования

Реалистичный бэктест показывает:

- **Влияние комиссий**: Даже небольшие комиссии могут съесть всю прибыль
- **Проскальзывание**: Особенно важно для высокочастотных стратегий
- **Ликвидность**: Невозможность исполнения больших объемов
- **Задержки**: Время между сигналом и исполнением

## Лучшие практики

1. **Консервативные оценки**: Лучше переоценить издержки, чем недооценить
2. **Тестирование на разных условиях**: Разные уровни волатильности и ликвидности
3. **Мониторинг в реальном времени**: Сравнение ожидаемых и реальных издержек
4. **Оптимизация**: Минимизация комиссий через выбор брокера и типов ордеров

Реалистичный бэктест - мост между теорией и практикой. Он помогает понять, будет ли стратегия прибыльной в реальных условиях.
