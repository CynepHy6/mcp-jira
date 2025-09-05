import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import nock from "nock";
import { mockCurrentUserResponse } from "../fixtures/jira-responses.js";

/**
 * Создает тестовый MCP сервер с базовой конфигурацией
 */
export function createTestServer(): McpServer {
    return new McpServer({
        name: "test-jira-server",
        version: "1.0.0",
    });
}

/**
 * Настраивает общие моки для Jira API
 */
export function setupJiraMocks(jiraHost: string) {
    // Мок аутентификации
    nock(jiraHost)
        .persist()
        .get("/rest/api/2/myself")
        .reply(200, mockCurrentUserResponse);
}

/**
 * Очищает все nock моки
 */
export function cleanupMocks() {
    nock.cleanAll();
}

/**
 * Создает мок для поискового запроса к Jira
 */
export function mockJiraSearch(
    jiraHost: string,
    jql: string,
    response: any,
    status: number = 200
) {
    return nock(jiraHost)
        .get("/rest/api/2/search")
        .query({
            jql,
            fields: expect.any(String),
            maxResults: expect.any(Number),
            startAt: expect.any(Number),
        })
        .reply(status, response);
}

/**
 * Создает мок для получения конкретной задачи
 */
export function mockJiraIssue(
    jiraHost: string,
    issueKey: string,
    response: any,
    status: number = 200
) {
    return nock(jiraHost)
        .get(`/rest/api/2/issue/${issueKey}`)
        .reply(status, response);
}

/**
 * Создает мок для получения комментариев к задаче
 */
export function mockJiraComments(
    jiraHost: string,
    issueKey: string,
    response: any,
    status: number = 200
) {
    return nock(jiraHost)
        .get(`/rest/api/2/issue/${issueKey}/comment`)
        .reply(status, response);
}

/**
 * Создает мок для получения ворклогов задачи
 */
export function mockJiraWorklogs(
    jiraHost: string,
    issueKey: string,
    response: any,
    status: number = 200
) {
    return nock(jiraHost)
        .get(`/rest/api/2/issue/${issueKey}/worklog`)
        .reply(status, response);
}

/**
 * Форматирует дату в формат YYYY-MM-DD
 */
export function formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
}

/**
 * Создает дату N дней назад от текущей даты
 */
export function daysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
}

/**
 * Проверяет, содержит ли текст все указанные подстроки
 */
export function textContainsAll(text: string, substrings: string[]): boolean {
    return substrings.every((substring) => text.includes(substring));
}

/**
 * Извлекает первый текстовый контент из результата MCP инструмента
 */
export function getTextContent(result: any): string {
    return result.content?.[0]?.text || "";
}
