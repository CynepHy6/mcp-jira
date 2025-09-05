import { AxiosInstance } from "axios";
import { z } from "zod";
import { ConfluenceConfig } from "../../clients/confluence-client.js";
import { validateConfluenceConfig } from "../../utils/validation.js";

export const searchConfluencePagesSchema = {
    query: z.string().describe("Search query (title or content)"),
    spaceKey: z
        .string()
        .optional()
        .describe("Limit search to specific space (e.g., 'PROJ')"),
    type: z
        .enum(["page", "blogpost"])
        .default("page")
        .describe("Content type to search for"),
    limit: z
        .number()
        .default(10)
        .describe("Maximum number of results (default: 10, max: 50)"),
};

export const searchConfluencePagesHandler =
    (confluence: AxiosInstance, confluenceConfig: ConfluenceConfig) =>
    async ({
        query,
        spaceKey,
        type,
        limit,
    }: {
        query: string;
        spaceKey?: string;
        type: "page" | "blogpost";
        limit: number;
    }) => {
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
            // Build CQL (Confluence Query Language) query
            let cqlQuery = `text ~ "${query}" AND type = "${type}"`;

            if (spaceKey) {
                cqlQuery += ` AND space = "${spaceKey}"`;
            }

            console.error("CQL Query:", cqlQuery);
            console.error("Confluence host:", confluenceConfig.host);

            const response = await confluence.get("/search", {
                params: {
                    cql: cqlQuery,
                    limit: Math.min(limit, 50),
                    expand: "space,version",
                },
            });

            const results = response.data?.results || [];

            if (results.length === 0) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `No ${type}s found for query: "${query}"${
                                spaceKey ? ` in space ${spaceKey}` : ""
                            }`,
                        },
                    ],
                };
            }

            const formattedResults = [
                `Found ${results.length} ${type}(s) for query: "${query}"${
                    spaceKey ? ` in space ${spaceKey}` : ""
                }`,
                "",
            ];

            results.forEach((result: any, index: number) => {
                const title = result.title || "No title";
                const space = result.space?.name || "Unknown space";
                const spaceKey = result.space?.key || "Unknown";
                const webui = result._links?.webui || result._links?.base || "";
                const url = webui
                    ? `${confluenceConfig.host}/wiki${webui}`
                    : "URL not available";
                const lastModified = result.version?.when
                    ? new Date(result.version.when).toLocaleDateString()
                    : "Unknown";
                const author = result.version?.by?.displayName || "Unknown";

                formattedResults.push(
                    `${index + 1}. ${title}`,
                    `   Space: ${space} (${spaceKey})`,
                    `   Last modified: ${lastModified} by ${author}`,
                    `   URL: ${url}`,
                    ""
                );
            });

            return {
                content: [
                    {
                        type: "text",
                        text: formattedResults.join("\n"),
                    },
                ],
            };
        } catch (error) {
            console.error("Error searching Confluence:", error);
            return {
                content: [
                    {
                        type: "text",
                        text: `Search failed: ${(error as Error).message}`,
                    },
                ],
            };
        }
    };
