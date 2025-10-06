// Тесты реальных функций построения JQL из src/jql-builder.ts

import {
    buildSearchJQL,
    buildWorklogJQL,
    buildWorklogJQLForUser,
} from "../../src/utils/jql-builder.js";

describe("JQL Query Building", () => {
    describe("buildSearchJQL", () => {
        it("should build basic search query", () => {
            const jql = buildSearchJQL("test");
            expect(jql).toBe(
                '(summary ~ "test" OR description ~ "test") ORDER BY updated DESC'
            );
        });

        it("should build query with project filter", () => {
            const jql = buildSearchJQL("bug", ["VIM", "PROJ"]);
            expect(jql).toBe(
                '(summary ~ "bug" OR description ~ "bug") AND project IN ("VIM","PROJ") ORDER BY updated DESC'
            );
        });

        it("should build query with status filter", () => {
            const jql = buildSearchJQL("error", undefined, [
                "Open",
                "In Progress",
            ]);
            expect(jql).toBe(
                '(summary ~ "error" OR description ~ "error") AND status IN ("Open","In Progress") ORDER BY updated DESC'
            );
        });

        it("should build query with assignee filter", () => {
            const jql = buildSearchJQL("api", undefined, undefined, "john.doe");
            expect(jql).toBe(
                '(summary ~ "api" OR description ~ "api") AND assignee = "john.doe" ORDER BY updated DESC'
            );
        });

        it("should handle currentUser() assignee", () => {
            const jql = buildSearchJQL(
                "task",
                undefined,
                undefined,
                "currentUser()"
            );
            expect(jql).toBe(
                '(summary ~ "task" OR description ~ "task") AND assignee = currentUser() ORDER BY updated DESC'
            );
        });

        it("should build query with all filters", () => {
            const jql = buildSearchJQL(
                "api",
                ["VIM"],
                ["Ready for Development"],
                "currentUser()"
            );
            expect(jql).toBe(
                '(summary ~ "api" OR description ~ "api") AND project IN ("VIM") AND status IN ("Ready for Development") AND assignee = currentUser() ORDER BY updated DESC'
            );
        });
    });

    describe("buildWorklogJQL", () => {
        it("should build basic worklog query", () => {
            const jql = buildWorklogJQL("john.doe", "2025-01-01", "2025-01-07");
            expect(jql).toBe(
                'worklogAuthor = "john.doe" AND worklogDate >= "2025-01-01" AND worklogDate <= "2025-01-07" AND project NOT IN ("COM") AND issuetype != Sub-task AND summary !~ "communications"'
            );
        });

        it("should build worklog query with project filter", () => {
            const jql = buildWorklogJQL(
                "jane.smith",
                "2025-01-01",
                "2025-01-07",
                ["VIM", "PROJ"]
            );
            expect(jql).toBe(
                'worklogAuthor = "jane.smith" AND worklogDate >= "2025-01-01" AND worklogDate <= "2025-01-07" AND project IN ("VIM","PROJ") AND project NOT IN ("COM") AND issuetype != Sub-task AND summary !~ "communications"'
            );
        });

        it("should include communication when requested", () => {
            const jql = buildWorklogJQL(
                "test.user",
                "2025-01-01",
                "2025-01-07",
                undefined,
                true
            );
            expect(jql).toBe(
                'worklogAuthor = "test.user" AND worklogDate >= "2025-01-01" AND worklogDate <= "2025-01-07"'
            );
        });

        it("should exclude communication by default", () => {
            const jql = buildWorklogJQL(
                "test.user",
                "2025-01-01",
                "2025-01-07"
            );
            expect(jql).toContain('project NOT IN ("COM")');
            expect(jql).toContain("issuetype != Sub-task");
            expect(jql).toContain('summary !~ "communications"');
        });
    });

    describe("buildWorklogJQLForUser", () => {
        it("should use currentUser() when username not provided", () => {
            const jql = buildWorklogJQLForUser(
                undefined,
                "2025-01-01",
                "2025-01-07"
            );
            expect(jql).toContain('worklogAuthor = "currentUser()"');
        });

        it("should use provided username", () => {
            const jql = buildWorklogJQLForUser(
                "specific.user",
                "2025-01-01",
                "2025-01-07"
            );
            expect(jql).toContain('worklogAuthor = "specific.user"');
        });

        it("should pass through all parameters", () => {
            const jql = buildWorklogJQLForUser(
                "test.user",
                "2025-01-01",
                "2025-01-07",
                ["VIM"],
                true
            );
            expect(jql).toBe(
                'worklogAuthor = "test.user" AND worklogDate >= "2025-01-01" AND worklogDate <= "2025-01-07" AND project IN ("VIM")'
            );
        });
    });
});
