# MCP Jira

MCP сервер для интеграции с Jira. Позволяет Cursor AI читать описания и комментарии задач Jira прямо в среде разработки.

## Возможности

- Поддержка Jira Server/Data Center (Personal Access Token)
- Поддержка Atlassian Cloud (API Token)
- Получение описания задач
- Получение комментариев к задачам

## Установка

1. **Создайте .env файл** на основе .env.example
2. **Установите зависимости**: `yarn install && yarn build`
3. **Добавьте в Cursor MCP конфигурацию**

## Настройка

**Для Jira Server/Data Center:**
```env
JIRA_HOST=https://jira.yourcompany.com
JIRA_USERNAME=ваш_логин
JIRA_API_TOKEN=ваш_personal_access_token
```

**Для Atlassian Cloud:**
```env
JIRA_HOST=https://yourcompany.atlassian.net
JIRA_USERNAME=your.email@company.com
JIRA_API_TOKEN=ваш_api_token
```

## Использование

После настройки можете обращаться к Cursor AI:
- "Покажи описание задачи VIM-27113"
- "Какие комментарии к PROJ-456?"
