# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/); нумерация версий — [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

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
