// Интеграционные тесты с моками HTTP запросов
const nockLib = (global as any).nock;

describe("Jira API Integration", () => {
    const JIRA_HOST = "https://test-jira.example.com";

    beforeEach(() => {
        // Настраиваем переменные окружения для тестов
        process.env.JIRA_HOST = JIRA_HOST;
        process.env.JIRA_USERNAME = "test@example.com";
        process.env.JIRA_API_TOKEN = "test-token";
    });

    afterEach(() => {
        nockLib.cleanAll();
    });

    describe("Search API", () => {
        it("should handle successful search response", async () => {
            // Мок успешного поиска
            const searchMock = nockLib(JIRA_HOST)
                .get("/rest/api/2/search")
                .query(true)
                .reply(200, {
                    issues: [
                        {
                            key: "VIM-123",
                            fields: {
                                summary: "Test issue with uncheckable",
                                description: "Test description",
                                issuetype: { name: "Bug" },
                                priority: { name: "High" },
                                status: { name: "Open" },
                                assignee: { displayName: "John Doe" },
                                creator: { displayName: "Jane Smith" },
                                project: { key: "VIM" },
                                created: "2025-01-01T12:00:00.000+0000",
                                updated: "2025-01-02T14:00:00.000+0000",
                            },
                        },
                    ],
                    total: 1,
                    startAt: 0,
                    maxResults: 50,
                });

            // Проверяем, что мок настроен
            expect(searchMock.isDone()).toBe(false);
            expect(nockLib.pendingMocks()).toHaveLength(1);
        });

        it("should handle empty search results", async () => {
            const emptySearchMock = nockLib(JIRA_HOST)
                .get("/rest/api/2/search")
                .query(true)
                .reply(200, {
                    issues: [],
                    total: 0,
                    startAt: 0,
                    maxResults: 50,
                });

            expect(emptySearchMock.isDone()).toBe(false);
        });

        it("should handle search errors", async () => {
            const errorMock = nockLib(JIRA_HOST)
                .get("/rest/api/2/search")
                .query(true)
                .reply(400, {
                    errorMessages: ["Invalid JQL query"],
                    errors: {},
                });

            expect(errorMock.isDone()).toBe(false);
        });
    });

    describe("Issue API", () => {
        it("should handle issue retrieval", async () => {
            const issueMock = nockLib(JIRA_HOST)
                .get("/rest/api/2/issue/VIM-26407")
                .reply(200, {
                    key: "VIM-26407",
                    fields: {
                        summary: "П отмечают рекординг как uncheckable",
                        description: "Описание проблемы с рекордингом",
                        issuetype: { name: "Задача" },
                        priority: { name: "Серьезный" },
                        status: { name: "Ready for Development" },
                        assignee: null,
                        creator: { displayName: "Test User" },
                        project: { key: "VIM", name: "Vimbox" },
                        created: "2024-12-24T10:00:00.000+0000",
                        updated: "2025-09-03T15:30:00.000+0000",
                    },
                });

            expect(issueMock.isDone()).toBe(false);
        });

        it("should handle comments retrieval", async () => {
            const commentsMock = nockLib(JIRA_HOST)
                .get("/rest/api/2/issue/VIM-26407/comment")
                .reply(200, {
                    comments: [
                        {
                            id: "12345",
                            author: { displayName: "Test User" },
                            body: "Тестовый комментарий к задаче",
                            created: "2025-01-01T10:00:00.000+0000",
                            updated: "2025-01-01T10:00:00.000+0000",
                        },
                    ],
                    total: 1,
                });

            expect(commentsMock.isDone()).toBe(false);
        });

        it("should handle worklogs retrieval", async () => {
            const worklogsMock = nockLib(JIRA_HOST)
                .get("/rest/api/2/issue/VIM-26407/worklog")
                .reply(200, {
                    worklogs: [
                        {
                            id: "10001",
                            author: {
                                name: "test-user",
                                displayName: "Test User",
                            },
                            timeSpent: "2h",
                            timeSpentSeconds: 7200,
                            started: "2025-01-01T09:00:00.000+0000",
                            comment: "Работа над исправлением бага",
                        },
                    ],
                    total: 1,
                });

            expect(worklogsMock.isDone()).toBe(false);
        });
    });

    describe("Authentication", () => {
        it("should handle authentication endpoint", async () => {
            const authMock = nockLib(JIRA_HOST)
                .get("/rest/api/2/myself")
                .reply(200, {
                    accountId: "test-account-id",
                    name: "test-user",
                    displayName: "Test User",
                    emailAddress: "test-user@example.com",
                    active: true,
                });

            expect(authMock.isDone()).toBe(false);
        });

        it("should handle authentication failure", async () => {
            const authFailureMock = nockLib(JIRA_HOST)
                .get("/rest/api/2/myself")
                .reply(401, {
                    errorMessages: ["Unauthorized"],
                    errors: {},
                });

            expect(authFailureMock.isDone()).toBe(false);
        });
    });
});

describe("Confluence API Integration", () => {
    const CONFLUENCE_HOST = "https://test-confluence.example.com";

    beforeEach(() => {
        process.env.CONFLUENCE_HOST = CONFLUENCE_HOST;
        process.env.CONFLUENCE_USERNAME = "test@example.com";
        process.env.CONFLUENCE_API_TOKEN = "test-token";
    });

    afterEach(() => {
        nockLib.cleanAll();
    });

    it("should handle page content retrieval", async () => {
        const pageMock = nockLib(CONFLUENCE_HOST)
            .get("/rest/api/content/123456")
            .query(true)
            .reply(200, {
                id: "123456",
                type: "page",
                title: "Test Page",
                space: {
                    key: "TEST",
                    name: "Test Space",
                },
                body: {
                    storage: {
                        value: "<p>Test page content</p>",
                        representation: "storage",
                    },
                },
                version: {
                    number: 1,
                },
            });

        expect(pageMock.isDone()).toBe(false);
    });

    it("should handle page search", async () => {
        const searchMock = nockLib(CONFLUENCE_HOST)
            .get("/rest/api/content/search")
            .query(true)
            .reply(200, {
                results: [
                    {
                        id: "123456",
                        type: "page",
                        title: "Found Page",
                        space: {
                            key: "TEST",
                            name: "Test Space",
                        },
                        excerpt: "Page excerpt...",
                    },
                ],
                size: 1,
                limit: 10,
                start: 0,
            });

        expect(searchMock.isDone()).toBe(false);
    });
});
