import { AxiosInstance } from "axios";
import { z } from "zod";
import { ConfluenceConfig } from "../../clients/confluence-client.js";
import { validateConfluenceConfig } from "../../utils/validation.js";

export const getConfluencePageSchema = {
    pageIdOrUrl: z
        .string()
        .describe("The page ID (e.g., 123456) or full Confluence page URL"),
    includeBody: z
        .boolean()
        .default(true)
        .describe("Include page body content (default: true)"),
    expandProperties: z
        .array(z.string())
        .optional()
        .describe(
            "Additional properties to expand (e.g., ['version', 'space', 'ancestors'])",
        ),
};

export const getConfluencePageHandler =
    (confluence: AxiosInstance, confluenceConfig: ConfluenceConfig) =>
    async ({
        pageIdOrUrl,
        includeBody,
        expandProperties,
    }: {
        pageIdOrUrl: string;
        includeBody: boolean;
        expandProperties?: string[];
    }) => {
        const normalizeConfluenceHost = (host: string): string =>
            host.includes("://") ? host.replace(/\/$/, "") : `https://${host}`;

        const formatCreatedAt = (page: any): string => {
            const createdAt = page.history?.createdDate || page.version?.when;
            if (!createdAt) {
                return "Unknown";
            }

            const parsedDate = new Date(createdAt);
            return Number.isNaN(parsedDate.getTime())
                ? "Unknown"
                : parsedDate.toLocaleString();
        };

        const configError = validateConfluenceConfig(confluenceConfig);
        if (configError) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Configuration error: ${configError}`,
                    },
                ],
            };
        }

        try {
            // Extract page ID from URL if necessary
            let pageId = pageIdOrUrl;
            if (pageIdOrUrl.includes("/")) {
                const urlParts = pageIdOrUrl.split("/");
                const pageIndex = urlParts.findIndex(
                    (part) => part === "pages",
                );
                if (pageIndex >= 0 && pageIndex < urlParts.length - 1) {
                    pageId = urlParts[pageIndex + 1];
                } else {
                    // Try to extract from viewpage.action URL
                    const match = pageIdOrUrl.match(/pageId=(\d+)/);
                    if (match) {
                        pageId = match[1];
                    } else {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Cannot extract page ID from URL: ${pageIdOrUrl}`,
                                },
                            ],
                        };
                    }
                }
            }

            // Build expand parameter
            const expandParams = ["space", "history", "version"];
            if (includeBody) {
                expandParams.push("body.storage");
            }
            if (expandProperties) {
                expandParams.push(...expandProperties);
            }

            const response = await confluence.get(`/content/${pageId}`, {
                params: {
                    expand: expandParams.join(","),
                },
            });

            const page = response.data;

            if (!page) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Page not found: ${pageId}`,
                        },
                    ],
                };
            }

            let content = `Title: ${page.title}\n`;
            content += `Space: ${page.space?.name || "Unknown"}\n`;
            content += `Type: ${page.type}\n`;
            content += `Status: ${page.status}\n`;
            content += `Created: ${formatCreatedAt(page)}\n`;
            const webui = page._links?.webui || "";
            const baseUrl =
                page._links?.base ||
                normalizeConfluenceHost(confluenceConfig.host);
            content += `URL: ${
                webui ? `${baseUrl}${webui}` : "URL not available"
            }\n`;

            if (includeBody && page.body?.storage?.value) {
                content += `\nContent:\n${page.body.storage.value}`;
            }

            return {
                content: [
                    {
                        type: "text",
                        text: content,
                    },
                ],
            };
        } catch (error) {
            console.error("Error fetching Confluence page:", error);
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to retrieve page: ${
                            (error as Error).message
                        }`,
                    },
                ],
            };
        }
    };
