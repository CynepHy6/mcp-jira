import {
    formatIssueStructure,
    type IssueStructure,
} from "../../src/utils/issue-relationships.js";

describe("issue relationships formatter", () => {
    it("should include issue links in formatted structure", () => {
        const structure: IssueStructure = {
            current: {
                key: "GRW-1813",
                summary: "Каталог П",
                status: "Inbox",
                type: "Эпик",
                url: "https://jira.example.com/browse/GRW-1813",
                priority: "Незначительный",
            },
            subtasks: [],
            siblings: [],
            epicStories: [],
            issueLinks: [
                {
                    key: "GRW-1834",
                    summary: "Навигация и переходы",
                    status: "In Progress",
                    type: "Задача",
                    url: "https://jira.example.com/browse/GRW-1834",
                    priority: "Средний",
                    relation: "blocks",
                    relationType: "Blocks",
                },
            ],
        };

        const formatted = formatIssueStructure(structure);

        expect(formatted).toContain("СВЯЗИ С ДРУГИМИ ЗАДАЧАМИ");
        expect(formatted).toContain("GRW-1834: Навигация и переходы");
        expect(formatted).toContain("**Связь:** blocks");
        expect(formatted).toContain("**Статус:** 🔄 In Progress | **Тип:** Задача");
    });

    it("should include epic stories when current issue is epic", () => {
        const structure: IssueStructure = {
            current: {
                key: "GRW-1813",
                summary: "Каталог П",
                status: "Inbox",
                type: "Эпик",
                url: "https://jira.example.com/browse/GRW-1813",
                priority: "Незначительный",
            },
            subtasks: [],
            siblings: [],
            epicStories: [
                {
                    key: "GRW-1822",
                    summary: "Создание раздела каталога П v2",
                    status: "Inbox",
                    type: "Задача",
                    url: "https://jira.example.com/browse/GRW-1822",
                    priority: "Незначительный",
                },
                {
                    key: "GRW-1823",
                    summary: "Отображение сертификатов П в карточке",
                    status: "Inbox",
                    type: "Задача",
                    url: "https://jira.example.com/browse/GRW-1823",
                    priority: "Незначительный",
                },
            ],
            issueLinks: [],
        };

        const formatted = formatIssueStructure(structure);

        expect(formatted).toContain("ЗАДАЧИ В ЭПИКЕ");
        expect(formatted).toContain("GRW-1822: Создание раздела каталога П v2");
        expect(formatted).toContain(
            "GRW-1823: Отображение сертификатов П в карточке"
        );
    });
});
