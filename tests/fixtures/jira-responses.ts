// Фикстуры ответов от Jira API для тестов

exports.mockSearchResponse = {
    issues: [
        {
            key: "VIM-26407",
            fields: {
                summary: "П отмечают рекординг как uncheckable",
                description:
                    'Проблема с проверкой рекординга. П нажимает кнопку "Cannot check because of bad record quality".',
                issuetype: { name: "Задача" },
                priority: { name: "Серьезный" },
                status: { name: "Ready for Development" },
                assignee: null,
                creator: { displayName: "Test User" },
                project: { key: "VIM" },
                created: "2024-12-24T10:00:00.000+0000",
                updated: "2025-09-03T15:30:00.000+0000",
            },
        },
        {
            key: "VIM-12345",
            fields: {
                summary: "Тестовая задача для поиска",
                description:
                    "Описание тестовой задачи с ключевыми словами для поиска.",
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
    total: 2,
    startAt: 0,
    maxResults: 50,
};

exports.mockEmptySearchResponse = {
    issues: [],
    total: 0,
    startAt: 0,
    maxResults: 50,
};

exports.mockIssueResponse = {
    key: "VIM-26407",
    fields: {
        summary: "П отмечают рекординг как uncheckable",
        description: "Подробное описание проблемы с рекордингом...",
        issuetype: { name: "Задача" },
        priority: { name: "Серьезный" },
        status: { name: "Ready for Development" },
        assignee: null,
        creator: { displayName: "Test User" },
        project: { key: "VIM", name: "Vimbox" },
        created: "2024-12-24T10:00:00.000+0000",
        updated: "2025-09-03T15:30:00.000+0000",
    },
};

exports.mockCommentsResponse = {
    comments: [
        {
            id: "12345",
            author: { displayName: "Test User" },
            body: "Тестовый комментарий к задаче",
            created: "2025-01-01T10:00:00.000+0000",
            updated: "2025-01-01T10:00:00.000+0000",
        },
        {
            id: "12346",
            author: { displayName: "Another User" },
            body: "Еще один комментарий с дополнительной информацией",
            created: "2025-01-02T11:00:00.000+0000",
            updated: "2025-01-02T11:00:00.000+0000",
        },
    ],
    total: 2,
};

exports.mockWorklogsResponse = {
    worklogs: [
        {
            id: "10001",
            author: {
                name: "test-user",
                key: "test-user",
                accountId: "test-account-id",
                displayName: "Test User",
            },
            timeSpent: "2h",
            timeSpentSeconds: 7200,
            started: "2025-01-01T09:00:00.000+0000",
            comment: "Работа над исправлением бага",
            created: "2025-01-01T09:00:00.000+0000",
            updated: "2025-01-01T09:00:00.000+0000",
        },
    ],
    total: 1,
};

exports.mockCurrentUserResponse = {
    accountId: "test-account-id",
    name: "test-user",
    key: "test-user",
    displayName: "Test User",
    emailAddress: "test-user@example.com",
    active: true,
};

exports.mockErrorResponse = {
    errorMessages: ["Invalid JQL query"],
    errors: {},
};
