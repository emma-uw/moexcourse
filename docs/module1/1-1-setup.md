---
sidebar_position: 1.1
---

# 1.1. Настройка среды трейдера

Для успешного начала работы с алгоритмической торговлей необходимо подготовить рабочую среду. Мы будем использовать Python как основной язык программирования, а Anaconda для управления пакетами и окружениями.

## Установка Python и Anaconda

1. Скачайте установщик Anaconda с официального сайта: [anaconda.com](https://www.anaconda.com/products/distribution)
2. Запустите установщик и следуйте инструкциям
3. Убедитесь, что Python установлен правильно, проверив версию:

```bash
python --version
```

## Настройка виртуального окружения

Создайте новое виртуальное окружение для проекта:

```bash
conda create -n moex-trading python=3.9
conda activate moex-trading
```

## Установка Jupyter Lab

Jupyter Lab - это современная интерактивная среда для разработки:

```bash
conda install -c conda-forge jupyterlab
```

Запуск:

```bash
jupyter lab
```

## Необходимые библиотеки

Установите основные библиотеки для работы с данными:

```bash
conda install pandas numpy matplotlib plotly
```

## Проверка установки

Создайте простой скрипт для проверки:

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

print("Все библиотеки установлены корректно!")
```

Теперь ваша среда готова для работы с финансовыми данными и алгоритмами торговли.
