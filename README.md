# mcp-jira

MCP-сервер для **Jira**, **Confluence**, **Insight (Assets)** и **Zephyr Scale** в Cursor.

## Быстрый старт (npx, без клона)

1. Добавить в Cursor MCP (`~/.cursor/mcp.json` или project config):

```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "github:CynepHy6/mcp-jira#dist"],
      "env": {
        "JIRA_HOST": "https://jira.example.com",
        "JIRA_USERNAME": "your_login",
        "JIRA_API_TOKEN": "your_jira_pat",
        "CONFLUENCE_HOST": "https://confluence.example.com",
        "CONFLUENCE_USERNAME": "your_login",
        "CONFLUENCE_API_TOKEN": "your_confluence_pat"
      }
    }
  }
}
```

Креды передаются **только через `env`** в MCP-конфиге (файл `.env` рядом с репозиторием при npx не используется).

| Переменная | Нужна для | Примечание |
|------------|-----------|------------|
| `JIRA_HOST` | Jira, Insight, Zephyr | URL инстанса Jira |
| `JIRA_USERNAME` | Jira, Insight, Zephyr | Логин или email (Cloud) |
| `JIRA_API_TOKEN` | Jira, Insight, Zephyr | PAT Jira (отдельный от Confluence) |
| `JIRA_PASSWORD` | Jira, Insight, Zephyr | Альтернатива токену (Server/DC) |
| `CONFLUENCE_HOST` | Confluence | URL инстанса Confluence |
| `CONFLUENCE_USERNAME` | Confluence | Если не задан — берётся `JIRA_USERNAME` |
| `CONFLUENCE_API_TOKEN` | Confluence | PAT Confluence (создаётся отдельно от Jira) |
| `CONFLUENCE_PASSWORD` | Confluence | Альтернатива токену; иначе — `JIRA_PASSWORD` |

Insight и Zephyr используют те же `JIRA_*`, отдельных переменных нет. **`JIRA_API_TOKEN` и `CONFLUENCE_API_TOKEN` — разные токены** (даже на одном домене Server/DC); логин можно указать один и тот же.

2. Reload MCP в Cursor.

При первом запуске `npx` скачает ветку **`dist`** с GitHub (сборка из CI, в `master` исходники без `build/`). Отдельная локальная сборка не нужна.

## Альтернатива: локальный клон

```bash
git clone https://github.com/CynepHy6/mcp-jira.git
cd mcp-jira
cp .env.example .env   # заполнить креды
npm install && npm run build
```

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

Креды можно держать в `.env` в корне клонированного репозитория.

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
| [mcp-config.example.json](mcp-config.example.json) | пример MCP-конфига для npx |

## Проверка локально (разработка)

```bash
npm test
./test-tool.sh read-description '{"issueKey": "PROJ-123"}'
```

## Стек

TypeScript, `@modelcontextprotocol/sdk`, `jira.js`, `axios`, `zod`. Исходники — `src/`, сборка — `build/`.
