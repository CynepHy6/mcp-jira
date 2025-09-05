# Тестирование MCP Jira Server

## 📁 Структура тестов

```
tests/
├── config/
│   └── validation.test.ts     # Тесты валидации конфигурации
├── integration/
│   └── jira-client.test.ts    # Интеграционные тесты с моками API
├── tools/
│   ├── search-logic.test.ts   # Тесты логики инструментов
│   └── confluence.test.ts     # Тесты Confluence инструментов
├── src/                       # Тесты утилит
│   ├── date-utils.test.ts     # Работа с датами
│   ├── formatters.test.ts     # Форматирование данных
│   ├── jql-builder.test.ts    # Построение JQL запросов
│   └── validation.test.ts     # Валидация
├── fixtures/
│   └── jira-responses.ts      # Моки ответов от API
├── helpers/
│   └── test-utils.ts          # Вспомогательные функции
└── setup.ts                   # Глобальная настройка
```

## 🛠 Технологии

- **Jest**: Фреймворк для тестирования
- **Nock**: Мокирование HTTP запросов
- **TypeScript**: Типизация и транспиляция
- **ts-jest**: TypeScript поддержка для Jest

## 🚀 Команды для запуска

```bash
# Запуск всех тестов
yarn test

# Запуск тестов с покрытием
yarn test --coverage

# Запуск конкретного теста
yarn test tests/tools/confluence.test.ts

# Запуск тестов конкретной папки
yarn test tests/src/
```

## ⚙️ Конфигурация

### Jest настройки
- **moduleNameMapper**: Маппинг `.js` импортов на `.ts` файлы
- **ts-jest**: Транспиляция TypeScript
- **setupFilesAfterEnv**: Глобальная настройка через `setup.ts`

### Переменные окружения
```bash
# Используются моки, реальные API не вызываются
JIRA_HOST=https://test-jira.example.com
JIRA_USERNAME=test@example.com
JIRA_API_TOKEN=test-token
```

## 📝 Добавление тестов

### Структура по типам:
- **`src/`** - Утилиты (date-utils, formatters, jql-builder, validation)
- **`tools/`** - Инструменты MCP (search-logic, confluence)
- **`integration/`** - Интеграционные тесты с nock
- **`config/`** - Тесты конфигурации

### Пример нового теста:
```typescript
// tests/tools/new-tool.test.ts
import nock from "nock";

describe("New Tool", () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  it("should handle API calls", async () => {
    nock("https://api.example.com")
      .get("/endpoint")
      .reply(200, { data: "test" });

    // Тест логики
  });
});
```