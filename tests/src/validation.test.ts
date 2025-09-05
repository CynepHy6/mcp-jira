// Тесты реальных функций валидации из src/validation.ts

import {
    validateConfluenceConfig,
    validateJiraConfig,
    type ConfluenceConfig,
    type JiraConfig,
} from "../../src/utils/validation.js";

describe("Configuration Validation", () => {
    describe("Jira Configuration Validation", () => {
        it("should validate complete Jira config with API token", () => {
            const config: JiraConfig = {
                host: "https://test.atlassian.net",
                username: "test@example.com",
                password: "",
                apiToken: "test-token",
            };

            const result = validateJiraConfig(config);
            expect(result).toBeNull();
        });

        it("should validate Jira config with password", () => {
            const config: JiraConfig = {
                host: "https://jira.company.com",
                username: "testuser",
                password: "test-password",
                apiToken: undefined,
            };

            const result = validateJiraConfig(config);
            expect(result).toBeNull();
        });

        it("should require host", () => {
            const config: JiraConfig = {
                host: "",
                username: "test@example.com",
                password: "",
                apiToken: "test-token",
            };

            const result = validateJiraConfig(config);
            expect(result).toBe("JIRA_HOST environment variable is not set");
        });

        it("should require username", () => {
            const config: JiraConfig = {
                host: "https://test.atlassian.net",
                username: "",
                password: "",
                apiToken: "test-token",
            };

            const result = validateJiraConfig(config);
            expect(result).toBe(
                "JIRA_USERNAME environment variable is not set (should be your email)"
            );
        });

        it("should require either password or API token", () => {
            const config: JiraConfig = {
                host: "https://test.atlassian.net",
                username: "test@example.com",
                password: "",
                apiToken: undefined,
            };

            const result = validateJiraConfig(config);
            expect(result).toBe(
                "Either JIRA_PASSWORD or JIRA_API_TOKEN environment variable must be set"
            );
        });

        it("should validate email format for Cloud instances", () => {
            const config: JiraConfig = {
                host: "https://company.atlassian.net",
                username: "invalidusername", // not an email
                password: "",
                apiToken: "test-token",
            };

            const result = validateJiraConfig(config);
            expect(result).toBe(
                "For Atlassian Cloud, JIRA_USERNAME must be a valid email address when using API token"
            );
        });

        it("should allow non-email usernames for on-premise", () => {
            const config: JiraConfig = {
                host: "https://jira.company.com", // not .atlassian.net
                username: "admin",
                password: "admin-password",
                apiToken: undefined,
            };

            const result = validateJiraConfig(config);
            expect(result).toBeNull();
        });
    });

    describe("Confluence Configuration Validation", () => {
        it("should validate complete Confluence config", () => {
            const config: ConfluenceConfig = {
                host: "https://company.atlassian.net",
                username: "user@company.com",
                password: "",
                apiToken: "confluence-token",
            };

            const result = validateConfluenceConfig(config);
            expect(result).toBeNull();
        });

        it("should require all basic fields", () => {
            const config: ConfluenceConfig = {
                host: "",
                username: "",
                password: "",
                apiToken: undefined,
            };

            const result = validateConfluenceConfig(config);
            expect(result).toBe(
                "CONFLUENCE_HOST environment variable is not set"
            );
        });

        it("should require username", () => {
            const config: ConfluenceConfig = {
                host: "https://confluence.company.com",
                username: "",
                password: "password",
                apiToken: undefined,
            };

            const result = validateConfluenceConfig(config);
            expect(result).toBe(
                "CONFLUENCE_USERNAME environment variable is not set (should be your email)"
            );
        });

        it("should require authentication", () => {
            const config: ConfluenceConfig = {
                host: "https://confluence.company.com",
                username: "user@company.com",
                password: "",
                apiToken: undefined,
            };

            const result = validateConfluenceConfig(config);
            expect(result).toBe(
                "Either CONFLUENCE_PASSWORD or CONFLUENCE_API_TOKEN environment variable must be set"
            );
        });
    });
});
