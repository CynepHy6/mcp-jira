// Тесты для Confluence инструментов

import axios from "axios";
import nock from "nock";
import {
    getConfluencePageHandler,
    getConfluencePageSchema,
} from "../../src/tools/confluence/get-confluence-page.js";
import {
    searchConfluencePagesHandler,
    searchConfluencePagesSchema,
} from "../../src/tools/confluence/search-confluence-pages.js";

describe("Confluence Tools", () => {
    const mockConfig = {
        host: "https://test-confluence.example.com",
        username: "test@example.com",
        password: "test-password",
        apiToken: "test-api-token",
    };

    let confluenceClient: any;

    beforeEach(() => {
        // Create confluence client directly with our mock config
        confluenceClient = axios.create({
            baseURL: `${mockConfig.host}/rest/api`,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer test-confluence-token`,
            },
            timeout: 10000,
        });

        // Clear all nock interceptors
        nock.cleanAll();
    });

    afterEach(() => {
        nock.cleanAll();
        jest.clearAllMocks();
    });

    describe("searchConfluencePagesHandler", () => {
        it("should search for pages successfully", async () => {
            const mockResponse = {
                results: [
                    {
                        content: {
                            id: "123456",
                            title: "Test Page Title",
                            _links: {
                                webui: "/display/SPACE/Test+Page+Title",
                            },
                        },
                        resultGlobalContainer: {
                            title: "Test Space",
                            displayUrl: "/display/SPACE",
                        },
                        friendlyLastModified: "2 days ago",
                        excerpt: "This is a test page excerpt...",
                        url: "/display/SPACE/Test+Page+Title",
                    },
                ],
            };

            nock("https://test-confluence.example.com")
                .get("/rest/api/search")
                .query({
                    cql: 'text ~ "test query" AND type = "page"',
                    limit: 10,
                    expand: "space,version",
                })
                .reply(200, mockResponse);

            const handler = searchConfluencePagesHandler(
                confluenceClient,
                mockConfig
            );
            const result = await handler({
                query: "test query",
                type: "page" as const,
                limit: 10,
            });

            expect(result.content[0].text).toContain(
                "Found 1 page(s) for query"
            );
            expect(result.content[0].text).toContain("Test Page Title");
            expect(result.content[0].text).toContain("ID: 123456");
            expect(result.content[0].text).toContain("Test Space");
        });

        it("should search with space filter", async () => {
            const mockResponse = {
                results: [],
            };

            nock("https://test-confluence.example.com")
                .get("/rest/api/search")
                .query({
                    cql: 'text ~ "test" AND type = "page" AND space = "PROJ"',
                    limit: 10,
                    expand: "space,version",
                })
                .reply(200, mockResponse);

            const handler = searchConfluencePagesHandler(
                confluenceClient,
                mockConfig
            );
            const result = await handler({
                query: "test",
                spaceKey: "PROJ",
                type: "page" as const,
                limit: 10,
            });

            expect(result.content[0].text).toContain(
                "No pages found for query"
            );
            expect(result.content[0].text).toContain("in space PROJ");
        });

        it("should clean up search highlighting markup", async () => {
            const mockResponse = {
                results: [
                    {
                        content: {
                            id: "123456",
                            title: "@@@hl@@@Test@@@endhl@@@ Page",
                            _links: {
                                webui: "/display/SPACE/Test+Page",
                            },
                        },
                        resultGlobalContainer: {
                            title: "Test Space",
                            displayUrl: "/display/SPACE",
                        },
                        friendlyLastModified: "1 day ago",
                        excerpt:
                            "This is a @@@hl@@@test@@@endhl@@@ excerpt with &lt;html&gt; entities...",
                        url: "/display/SPACE/Test+Page",
                    },
                ],
            };

            nock("https://test-confluence.example.com")
                .get("/rest/api/search")
                .query({
                    cql: 'text ~ "test" AND type = "page"',
                    limit: 10,
                    expand: "space,version",
                })
                .reply(200, mockResponse);

            const handler = searchConfluencePagesHandler(
                confluenceClient,
                mockConfig
            );
            const result = await handler({
                query: "test",
                type: "page" as const,
                limit: 10,
            });

            // Should clean up highlighting markup
            expect(result.content[0].text).toContain("Test Page");
            expect(result.content[0].text).not.toContain("@@@hl@@@");
            expect(result.content[0].text).not.toContain("@@@endhl@@@");

            // Should decode HTML entities
            expect(result.content[0].text).toContain(
                "test excerpt with <html> entities"
            );
            expect(result.content[0].text).not.toContain("&lt;");
            expect(result.content[0].text).not.toContain("&gt;");
        });

        it("should handle API errors gracefully", async () => {
            nock("https://test-confluence.example.com")
                .get("/rest/api/search")
                .query({
                    cql: 'text ~ "test" AND type = "page"',
                    limit: 10,
                    expand: "space,version",
                })
                .replyWithError("Network error");

            const handler = searchConfluencePagesHandler(
                confluenceClient,
                mockConfig
            );
            const result = await handler({
                query: "test",
                type: "page" as const,
                limit: 10,
            });

            expect(result.content[0].text).toContain("Search failed");
            expect(result.content[0].text).toContain("Network error");
        });

        it("should validate configuration", async () => {
            const invalidConfig = { ...mockConfig, host: "" };

            const handler = searchConfluencePagesHandler(
                confluenceClient,
                invalidConfig
            );
            const result = await handler({
                query: "test",
                type: "page" as const,
                limit: 10,
            });

            expect(result.content[0].text).toContain("Configuration error");
        });
    });

    describe("getConfluencePageHandler", () => {
        it("should get page by ID successfully", async () => {
            const mockPage = {
                id: "123456",
                title: "Test Page",
                type: "page",
                status: "current",
                createdDate: "2023-01-01T00:00:00.000Z",
                space: {
                    name: "Test Space",
                },
                _links: {
                    webui: "/display/SPACE/Test+Page",
                },
                body: {
                    storage: {
                        value: "<p>This is test content</p>",
                    },
                },
            };

            nock("https://test-confluence.example.com")
                .get("/rest/api/content/123456")
                .query({
                    expand: "space,body.storage",
                })
                .reply(200, mockPage);

            const handler = getConfluencePageHandler(
                confluenceClient,
                mockConfig
            );
            const result = await handler({
                pageIdOrUrl: "123456",
                includeBody: true,
            });

            expect(result.content[0].text).toContain("Title: Test Page");
            expect(result.content[0].text).toContain("Space: Test Space");
            expect(result.content[0].text).toContain("Type: page");
            expect(result.content[0].text).toContain("Status: current");
            expect(result.content[0].text).toContain("This is test content");
        });

        it("should extract page ID from viewpage.action URL", async () => {
            const mockPage = {
                id: "789012",
                title: "Another Test Page",
                type: "page",
                status: "current",
                createdDate: "2023-01-01T00:00:00.000Z",
                space: {
                    name: "Test Space",
                },
                _links: {
                    webui: "/display/SPACE/Another+Test+Page",
                },
            };

            nock("https://test-confluence.example.com")
                .get("/rest/api/content/789012")
                .query({
                    expand: "space",
                })
                .reply(200, mockPage);

            const handler = getConfluencePageHandler(
                confluenceClient,
                mockConfig
            );
            const result = await handler({
                pageIdOrUrl:
                    "https://confluence.example.com/display/SPACE/viewpage.action?pageId=789012",
                includeBody: false,
            });

            expect(result.content[0].text).toContain(
                "Title: Another Test Page"
            );
        });

        it("should extract page ID from pages URL format", async () => {
            const mockPage = {
                id: "345678",
                title: "Third Test Page",
                type: "page",
                status: "current",
                createdDate: "2023-01-01T00:00:00.000Z",
                space: {
                    name: "Test Space",
                },
                _links: {
                    webui: "/display/SPACE/Third+Test+Page",
                },
            };

            nock("https://test-confluence.example.com")
                .get("/rest/api/content/345678")
                .query({
                    expand: "space",
                })
                .reply(200, mockPage);

            const handler = getConfluencePageHandler(
                confluenceClient,
                mockConfig
            );
            const result = await handler({
                pageIdOrUrl:
                    "https://confluence.example.com/wiki/spaces/SPACE/pages/345678/Third+Test+Page",
                includeBody: false,
            });

            expect(result.content[0].text).toContain("Title: Third Test Page");
        });

        it("should handle page not found", async () => {
            nock("https://test-confluence.example.com")
                .get("/rest/api/content/999999")
                .query({
                    expand: "space",
                })
                .reply(404, { message: "Page not found" });

            const handler = getConfluencePageHandler(
                confluenceClient,
                mockConfig
            );
            const result = await handler({
                pageIdOrUrl: "999999",
                includeBody: false,
            });

            expect(result.content[0].text).toContain("Failed to retrieve page");
        });

        it("should handle invalid URL format", async () => {
            const handler = getConfluencePageHandler(
                confluenceClient,
                mockConfig
            );
            const result = await handler({
                pageIdOrUrl: "https://invalid-url-format.com/some/path",
                includeBody: false,
            });

            expect(result.content[0].text).toContain(
                "Cannot extract page ID from URL"
            );
        });

        it("should validate configuration", async () => {
            const invalidConfig = { ...mockConfig, username: "" };

            const handler = getConfluencePageHandler(
                confluenceClient,
                invalidConfig
            );
            const result = await handler({
                pageIdOrUrl: "123456",
                includeBody: false,
            });

            expect(result.content[0].text).toContain("Configuration error");
        });
    });

    describe("Schema validation", () => {
        it("should validate searchConfluencePagesSchema", () => {
            expect(searchConfluencePagesSchema.query).toBeDefined();
            expect(searchConfluencePagesSchema.spaceKey).toBeDefined();
            expect(searchConfluencePagesSchema.type).toBeDefined();
            expect(searchConfluencePagesSchema.limit).toBeDefined();
        });

        it("should validate getConfluencePageSchema", () => {
            expect(getConfluencePageSchema.pageIdOrUrl).toBeDefined();
            expect(getConfluencePageSchema.includeBody).toBeDefined();
            expect(getConfluencePageSchema.expandProperties).toBeDefined();
        });
    });
});
