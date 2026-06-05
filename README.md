# mcp-jira

MCP-сервер для **Jira**, **Confluence**, **Insight (Assets)** и **Zephyr Scale** в Cursor.

## Быстрый старт (npx, без клона)

1. Добавить в Cursor MCP (`~/.cursor/mcp.json` или project config):

```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "github:CynepHy6/mcp-jira#semver:^1"],
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
| `CONFLUENCE_HOST` | Confluence | URL инстанса Confluence |
| `CONFLUENCE_USERNAME` | Confluence | Если не задан — берётся `JIRA_USERNAME` |
| `CONFLUENCE_API_TOKEN` | Confluence | PAT Confluence (создаётся отдельно от Jira) |

Insight и Zephyr используют те же `JIRA_*`, отдельных переменных нет. **`JIRA_API_TOKEN` и `CONFLUENCE_API_TOKEN` — разные токены** (даже на одном домене Server/DC); логин можно указать один и тот же.

2. Reload MCP в Cursor.

CI на каждый push в `master` собирает `build/`, публикует ветку **`dist`** и ставит git-тег **`v{version}`** из `package.json` (например `v1.3.2`). Тег указывает на коммит `dist` со сборкой, не на `master`.

### Версия в `args`

CI ставит git-тег **`v{version}`** (из `package.json`). Синтаксис ref:

| Ref | Пример `args` | Когда использовать |
|-----|---------------|-------------------|
| последний `v1.x` | `["-y", "github:CynepHy6/mcp-jira#semver:^1"]` | по умолчанию, авто-обновления в мажоре 1 |
| конкретный тег | `["-y", "github:CynepHy6/mcp-jira#v1.3.2"]` | зафиксировать версию |
| exact semver | `["-y", "github:CynepHy6/mcp-jira#semver:1.3.2"]` | то же, через semver (ищет тег `v1.3.2`) |
| HEAD `dist` | `["-y", "github:CynepHy6/mcp-jira#dist"]` | без semver, всегда последняя сборка |

`#^1` **не работает** — для диапазона нужен префикс `#semver:`.

Пример с **конкретной версией**:

```json
"args": ["-y", "github:CynepHy6/mcp-jira#v1.3.2"]
```

Обновление на другую версию — сменить ref (например `#v1.3.3`), при необходимости `npx clear-npx-cache`, reload MCP. Перед релизом **поднимите `version` в `package.json`** — иначе CI перезапишет существующий тег.

## Альтернатива: локальный клон

```bash
git clone https://github.com/CynepHy6/mcp-jira.git
cd mcp-jira
cp .env.example .env   # заполнить креды
npm install && npm run compile
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
| [mcp-config.example.json](mcp-config.example.json) | MCP-конфиг npx, последний `v1.x` (`#semver:^1`) |
| [mcp-config.pinned.example.json](mcp-config.pinned.example.json) | MCP-конфиг npx, конкретная версия (`#v1.3.2`) |

## Проверка локально (разработка)

```bash
npm test
./test-tool.sh read-description '{"issueKey": "PROJ-123"}'
```

## Стек

TypeScript, `@modelcontextprotocol/sdk`, `jira.js`, `axios`, `zod`. Исходники — `src/`, сборка — `build/`.
