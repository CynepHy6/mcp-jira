# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/); нумерация версий — [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

## [1.3.2] - 2026-06-05

### Добавлено

- Запуск через `npx -y github:CynepHy6/mcp-jira#dist` без клона: `bin`, shebang, GitHub Action публикует `build/` в ветку `dist`.

### Изменено

- README: npx quick start; локальный клон — альтернатива.
- `mcp-config.example.json` — пример с npx и `env`.

## [1.3.1] - 2026-06-05

### Добавлено

- **`delete-zephyr-testcase`** — удаление test case по ключу или URL (`confirm: true` обязателен).

### Изменено

- Документация: подробный [AGENTS.md](AGENTS.md) для агентов; [README.md](README.md) сокращён до quick start.

## [1.3.0] - 2026-06-05

### Добавлено

- Инструменты Zephyr Scale (REST `/rest/atm/1.0`): `get-zephyr-testcase`, `search-zephyr-testcases`, `create-zephyr-testcase`, `update-zephyr-testcase`, `create-zephyr-testrun`, `send-zephyr-test-result`.
- **`inspect-zephyr-project`** и **`upsert-zephyr-testcase`** — основной agent-friendly flow для синхронизации test-wdio ↔ Zephyr (create/update по `#PREFIX-Tnnn` в `it()`).
- Чтение и запись test cases / test runs / test results через тот же Jira PAT (`JIRA_API_TOKEN`).

## [1.2.0] - 2026-06-05

### Добавлено

- Инструмент `get-insight-asset` для получения объектов Jira Insight (Assets) по ключу, id или URL.
- Инструмент `search-insight-assets` для поиска объектов Insight через IQL.

## [1.1.1] - 2026-05-18

### Добавлено

- Инструмент `edit-confluence-page` для редактирования заголовка и содержимого страниц Confluence по ID или URL.

### Исправлено

- В `get-confluence-page` дата создания теперь берется из реального ответа Confluence (`history.createdDate` с запасным вариантом `version.when`) без `Invalid Date`.

## [1.1.0] - 2026-05-18

### Добавлено

- Инструмент `create-confluence-page` для создания страниц Confluence, включая дочерние страницы по ID или URL родителя.

## [1.0.1] - 2026-04-20

### Добавлено

- Задачи из эпика и оценка времени.

## [1.0.0] - 2025-10-06

### Добавлено

- MCP-сервер для Jira и Confluence (Jira Server/DC и Cloud).
- Инструмент получения ворклогов.
- Поддержка Confluence: контент страниц, поиск, метаданные.
- Поиск задач в Jira.
- Получение связей задач.
