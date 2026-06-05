# mcp-jira

MCP-сервер для **Jira**, **Confluence**, **Insight (Assets)** и **Zephyr Scale** в Cursor.

## Быстрый старт

1. Клонировать репозиторий и перейти в каталог:

```bash
git clone https://github.com/CynepHy6/mcp-jira.git
cd mcp-jira
```

2. Скопировать `.env.example` → `.env`, заполнить креды.
3. `npm install && npm run build`
4. Подключить в Cursor MCP:

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-jira/build/index.js"]
    }
  }
}
```

Креды можно держать только в `.env` рядом с репозиторием.

5. Reload MCP после обновления `build/`.

## Что умеет

- **Jira** — описание/комментарии, поиск issues, ворклоги
- **Insight** — объекты Assets по ключу и IQL
- **Confluence** — чтение, поиск, создание и правка страниц
- **Zephyr** — test cases (read/create/update/delete), test runs, результаты прогонов

## Документация

| Файл | Для кого |
|------|----------|
| [AGENTS.md](AGENTS.md) | агент / быстрый разбор кода, workflows, API-ограничения |
| [CHANGELOG.md](CHANGELOG.md) | история изменений |
