# WebSocket Task Board

Совместная доска задач на React с планируемой синхронизацией между участниками через WebSocket.

## Текущее состояние

Подготовлены React с JavaScript/JSX, Vite, ESLint, Prettier, настройки редактора и GitHub Actions. Приложение содержит стартовый экран. Сервер и синхронизация через WebSocket пока не реализованы.

## Запуск

Нужны Node.js 22.13+ (рекомендуется 24) и pnpm 11.25.0.

```sh
npm install -g pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm dev
```

Откройте http://127.0.0.1:5174/. Для остановки нажмите Ctrl+C.

## Команды

| Команда             | Назначение                                      |
| ------------------- | ----------------------------------------------- |
| `pnpm dev`          | Запустить разработку с обновлением страницы     |
| `pnpm lint`         | Проверить JavaScript, JSX и правила React hooks |
| `pnpm lint:fix`     | Исправить автоматически исправляемые замечания  |
| `pnpm format`       | Отформатировать файлы                           |
| `pnpm format:check` | Проверить форматирование                        |
| `pnpm build`        | Собрать приложение в `dist/`                    |
| `pnpm preview`      | Проверить сборку на http://127.0.0.1:4174/      |
| `pnpm check`        | Выполнить lint, format:check и build            |

ESLint проверяет ошибки и правила React, а Prettier отвечает за оформление. `eslint-config-prettier` отключает конфликтующие правила. В VS Code рекомендуемые расширения указаны в `.vscode/extensions.json`; устанавливаются пользователем.

## Структура

```text
src/
  App.jsx           # Основной компонент приложения
  main.jsx          # Точка входа React и StrictMode
  styles.css        # Минимальное оформление
eslint.config.js    # Правила JavaScript и React
vite.config.js      # Сборка и локальные порты
.github/workflows/ci.yml
```

Точные зависимости закреплены в `pnpm-lock.yaml`. `.env`, зависимости и сборка не хранятся в Git.
