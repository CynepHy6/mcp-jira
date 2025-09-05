const nock = require("nock");

// Делаем nock доступным глобально в тестах
(global as any).nock = nock;

// Настройка глобальных переменных окружения для тестов
process.env.JIRA_HOST = "https://test-jira.example.com";
process.env.JIRA_USERNAME = "test-user@example.com";
process.env.JIRA_API_TOKEN = "test-api-token";
process.env.CONFLUENCE_HOST = "https://test-confluence.example.com";
process.env.CONFLUENCE_USERNAME = "test-user@example.com";
process.env.CONFLUENCE_API_TOKEN = "test-confluence-token";

// Настройка nock для тестов
beforeEach(() => {
    nock.cleanAll();
});

afterEach(() => {
    nock.cleanAll();
});

// Включаем nock для всех HTTP запросов в тестах
nock.disableNetConnect();

// Для отладки можно включить логирование nock
// nock.recorder.rec();
