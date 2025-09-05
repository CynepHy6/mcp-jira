// Тесты логики без HTTP запросов

describe("JQL Query Building", () => {
    function buildSearchJQL(
        query: string,
        projectKeys?: string[],
        status?: string[]
    ) {
        let jqlQuery = `(summary ~ "${query}" OR description ~ "${query}")`;

        if (projectKeys && projectKeys.length > 0) {
            jqlQuery += ` AND project IN (${projectKeys
                .map((k) => `"${k}"`)
                .join(",")})`;
        }

        if (status && status.length > 0) {
            jqlQuery += ` AND status IN (${status
                .map((s) => `"${s}"`)
                .join(",")})`;
        }

        jqlQuery += ` ORDER BY updated DESC`;

        return jqlQuery;
    }

    it("should build basic JQL query", () => {
        const jql = buildSearchJQL("test");
        expect(jql).toBe(
            '(summary ~ "test" OR description ~ "test") ORDER BY updated DESC'
        );
    });

    it("should build JQL query with project filter", () => {
        const jql = buildSearchJQL("bug", ["VIM", "PROJ"]);
        expect(jql).toBe(
            '(summary ~ "bug" OR description ~ "bug") AND project IN ("VIM","PROJ") ORDER BY updated DESC'
        );
    });

    it("should build JQL query with status filter", () => {
        const jql = buildSearchJQL("error", undefined, ["Open", "In Progress"]);
        expect(jql).toBe(
            '(summary ~ "error" OR description ~ "error") AND status IN ("Open","In Progress") ORDER BY updated DESC'
        );
    });

    it("should build JQL query with all filters", () => {
        const jql = buildSearchJQL("api", ["VIM"], ["Ready for Development"]);
        expect(jql).toBe(
            '(summary ~ "api" OR description ~ "api") AND project IN ("VIM") AND status IN ("Ready for Development") ORDER BY updated DESC'
        );
    });
});

describe("Response Formatting", () => {
    function formatSearchResults(searchResponse: any, query: string) {
        if (!searchResponse.issues || searchResponse.issues.length === 0) {
            return `No issues found for query: "${query}"`;
        }

        const results: string[] = [
            `Found ${searchResponse.issues.length} issues for query: "${query}"`,
            `(showing ${searchResponse.issues.length} of ${searchResponse.total} total)`,
            "",
        ];

        searchResponse.issues.forEach((issue: any, index: number) => {
            const summary = issue.fields.summary || "No summary";
            const issueType = issue.fields.issuetype?.name || "Unknown type";
            const priority = issue.fields.priority?.name || "No priority";
            const status = issue.fields.status?.name || "Unknown status";
            const project = issue.fields.project?.key || "Unknown project";

            results.push(`${index + 1}. ${issue.key}: ${summary}`);
            results.push(
                `   Type: ${issueType} | Priority: ${priority} | Status: ${status}`
            );
            results.push(`   Project: ${project}`);
            results.push("");
        });

        return results.join("\n");
    }

    it("should format search results correctly", () => {
        const mockResponse = {
            issues: [
                {
                    key: "VIM-123",
                    fields: {
                        summary: "Test issue",
                        issuetype: { name: "Bug" },
                        priority: { name: "High" },
                        status: { name: "Open" },
                        project: { key: "VIM" },
                    },
                },
            ],
            total: 1,
        };

        const formatted = formatSearchResults(mockResponse, "test");

        expect(formatted).toContain('Found 1 issues for query: "test"');
        expect(formatted).toContain("(showing 1 of 1 total)");
        expect(formatted).toContain("1. VIM-123: Test issue");
        expect(formatted).toContain(
            "Type: Bug | Priority: High | Status: Open"
        );
        expect(formatted).toContain("Project: VIM");
    });

    it("should handle empty results", () => {
        const emptyResponse = { issues: [], total: 0 };
        const formatted = formatSearchResults(emptyResponse, "nonexistent");
        expect(formatted).toBe('No issues found for query: "nonexistent"');
    });
});

describe("Date Helpers", () => {
    function formatDate(date: Date): string {
        return date.toISOString().split("T")[0];
    }

    function daysAgo(days: number): Date {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date;
    }

    it("should format dates correctly", () => {
        const date = new Date("2025-01-15T10:30:00Z");
        expect(formatDate(date)).toBe("2025-01-15");
    });

    it("should calculate days ago correctly", () => {
        const today = new Date();
        const weekAgo = daysAgo(7);

        const diffTime = Math.abs(today.getTime() - weekAgo.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        expect(diffDays).toBe(7);
    });
});

describe("Time Formatting", () => {
    function formatDuration(seconds: number): string {
        const days = Math.floor(seconds / (8 * 3600)); // 8-час рабочий день
        const hours = Math.floor((seconds % (8 * 3600)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);

        return parts.join(" ") || "0m";
    }

    it("should format time correctly", () => {
        expect(formatDuration(7200)).toBe("2h"); // 2 hours
        expect(formatDuration(3600)).toBe("1h"); // 1 hour
        expect(formatDuration(1800)).toBe("30m"); // 30 minutes
        expect(formatDuration(28800)).toBe("1d"); // 8 hours = 1 day
        expect(formatDuration(32400)).toBe("1d 1h"); // 9 hours = 1 day 1 hour
        expect(formatDuration(0)).toBe("0m"); // 0 seconds
    });
});
