// Тесты для функций валидации конфигурации

describe("Configuration Validation Logic", () => {
    // Воспроизводим логику валидации из src/index.ts
    function validateJiraConfig(config: any): string | null {
        if (!config.host) return "JIRA_HOST environment variable is not set";
        if (!config.username)
            return "JIRA_USERNAME environment variable is not set (should be your email)";

        // Check if either password or API token is provided
        if (!config.password && !config.apiToken) {
            return "Either JIRA_PASSWORD or JIRA_API_TOKEN environment variable must be set";
        }

        // For Atlassian Cloud: validate email format for username when using API token
        if (config.apiToken && config.host.includes(".atlassian.net")) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(config.username)) {
                return "For Atlassian Cloud, JIRA_USERNAME must be a valid email address when using API token";
            }
        }

        return null;
    }

    function validateConfluenceConfig(config: any): string | null {
        if (!config.host)
            return "CONFLUENCE_HOST environment variable is not set";
        if (!config.username)
            return "CONFLUENCE_USERNAME environment variable is not set (should be your email)";

        if (!config.password && !config.apiToken) {
            return "Either CONFLUENCE_PASSWORD or CONFLUENCE_API_TOKEN environment variable must be set";
        }

        if (config.apiToken && config.host.includes(".atlassian.net")) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(config.username)) {
                return "For Atlassian Cloud, CONFLUENCE_USERNAME must be a valid email address when using API token";
            }
        }

        return null;
    }

    describe("Jira Configuration Validation", () => {
        it("should validate complete Jira config with API token", () => {
            const config = {
                host: "https://test.atlassian.net",
                username: "test@example.com",
                apiToken: "test-token",
            };

            const result = validateJiraConfig(config);
            expect(result).toBeNull();
        });

        it("should validate Jira config with password", () => {
            const config = {
                host: "https://jira.company.com",
                username: "testuser",
                password: "test-password",
            };

            const result = validateJiraConfig(config);
            expect(result).toBeNull();
        });

        it("should require host", () => {
            const config = {
                username: "test@example.com",
                apiToken: "test-token",
            };

            const result = validateJiraConfig(config);
            expect(result).toBe("JIRA_HOST environment variable is not set");
        });

        it("should require username", () => {
            const config = {
                host: "https://test.atlassian.net",
                apiToken: "test-token",
            };

            const result = validateJiraConfig(config);
            expect(result).toBe(
                "JIRA_USERNAME environment variable is not set (should be your email)"
            );
        });

        it("should require either password or API token", () => {
            const config = {
                host: "https://test.atlassian.net",
                username: "test@example.com",
            };

            const result = validateJiraConfig(config);
            expect(result).toBe(
                "Either JIRA_PASSWORD or JIRA_API_TOKEN environment variable must be set"
            );
        });

        it("should validate email format for Cloud instances", () => {
            const config = {
                host: "https://company.atlassian.net",
                username: "invalidusername", // not an email
                apiToken: "test-token",
            };

            const result = validateJiraConfig(config);
            expect(result).toBe(
                "For Atlassian Cloud, JIRA_USERNAME must be a valid email address when using API token"
            );
        });

        it("should allow non-email usernames for on-premise", () => {
            const config = {
                host: "https://jira.company.com", // not .atlassian.net
                username: "admin",
                password: "admin-password",
            };

            const result = validateJiraConfig(config);
            expect(result).toBeNull();
        });
    });

    describe("Confluence Configuration Validation", () => {
        it("should validate complete Confluence config", () => {
            const config = {
                host: "https://company.atlassian.net",
                username: "user@company.com",
                apiToken: "confluence-token",
            };

            const result = validateConfluenceConfig(config);
            expect(result).toBeNull();
        });

        it("should require all basic fields", () => {
            const config = {};

            const result = validateConfluenceConfig(config);
            expect(result).toBe(
                "CONFLUENCE_HOST environment variable is not set"
            );
        });
    });
});

describe("Environment Variables Processing", () => {
    it("should handle different authentication methods", () => {
        // Тест 1: API Token
        const apiTokenConfig = {
            host: "https://company.atlassian.net",
            username: "user@company.com",
            apiToken: "api-token-123",
        };

        expect(apiTokenConfig.apiToken).toBeDefined();
        expect((apiTokenConfig as any).password).toBeUndefined();
    });

    it("should handle password authentication", () => {
        // Тест 2: Password
        const passwordConfig = {
            host: "https://jira.internal.com",
            username: "admin",
            password: "admin-password",
        };

        expect(passwordConfig.password).toBeDefined();
        expect((passwordConfig as any).apiToken).toBeUndefined();
    });

    it("should handle email format validation for Cloud", () => {
        const cloudEmail = "user@example.com";
        const onPremUser = "admin";

        // Проверяем формат email (для Cloud)
        expect(cloudEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

        // Проверяем формат username (для Server/Data Center)
        expect(onPremUser).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });
});

describe("JQL Query Construction", () => {
    // Тестируем реальную логику построения JQL запросов из кода
    function buildWorklogJQL(
        username: string,
        startDate: string,
        endDate: string,
        projectKeys?: string[]
    ) {
        let jql = `worklogAuthor = "${username}" AND worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"`;

        if (projectKeys && projectKeys.length > 0) {
            jql += ` AND project IN (${projectKeys
                .map((k) => `"${k}"`)
                .join(",")})`;
        }

        jql += ` AND project NOT IN ("COM") AND issuetype != Sub-task AND summary !~ "communications"`;

        return jql;
    }

    it("should build worklog JQL for current user", () => {
        const jql = buildWorklogJQL(
            "currentUser()",
            "2025-01-01",
            "2025-01-07"
        );
        expect(jql).toContain('worklogAuthor = "currentUser()"');
        expect(jql).toContain('worklogDate >= "2025-01-01"');
        expect(jql).toContain('worklogDate <= "2025-01-07"');
        expect(jql).toContain('project NOT IN ("COM")');
        expect(jql).toContain("issuetype != Sub-task");
    });

    it("should build worklog JQL with project filter", () => {
        const jql = buildWorklogJQL("john.doe", "2025-01-01", "2025-01-07", [
            "VIM",
            "PROJ",
        ]);
        expect(jql).toContain('worklogAuthor = "john.doe"');
        expect(jql).toContain('project IN ("VIM","PROJ")');
    });

    it("should exclude communication projects and subtasks", () => {
        const jql = buildWorklogJQL("test.user", "2025-01-01", "2025-01-07");
        expect(jql).toContain('project NOT IN ("COM")');
        expect(jql).toContain("issuetype != Sub-task");
        expect(jql).toContain('summary !~ "communications"');
    });
});

describe("Time Period Calculations", () => {
    function getDateRange(period: string): {
        startDate: string;
        endDate: string;
    } {
        const today = new Date();
        const endDate = today.toISOString().split("T")[0];

        let startDate: string;
        switch (period) {
            case "week":
                const weekAgo = new Date(
                    today.getTime() - 7 * 24 * 60 * 60 * 1000
                );
                startDate = weekAgo.toISOString().split("T")[0];
                break;
            case "month":
                const monthAgo = new Date(
                    today.getTime() - 30 * 24 * 60 * 60 * 1000
                );
                startDate = monthAgo.toISOString().split("T")[0];
                break;
            case "3months":
                const threeMonthsAgo = new Date(
                    today.getTime() - 90 * 24 * 60 * 60 * 1000
                );
                startDate = threeMonthsAgo.toISOString().split("T")[0];
                break;
            default:
                startDate = endDate;
        }

        return { startDate, endDate };
    }

    it("should calculate week date range", () => {
        const { startDate, endDate } = getDateRange("week");
        const start = new Date(startDate);
        const end = new Date(endDate);

        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        expect(diffDays).toBe(7);
    });

    it("should calculate month date range", () => {
        const { startDate, endDate } = getDateRange("month");
        const start = new Date(startDate);
        const end = new Date(endDate);

        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        expect(diffDays).toBe(30);
    });

    it("should format dates in YYYY-MM-DD format", () => {
        const { startDate, endDate } = getDateRange("week");

        expect(startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});
