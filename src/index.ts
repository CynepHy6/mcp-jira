import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Try loading from parent directory of script
try {
    dotenv.config({ path: path.resolve(__dirname, "../.env") });
} catch (e) {
    console.error("Error loading .env file:", e);
    // Ignore errors
}

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Version2Client } from "jira.js/version2";
import { z } from "zod";

// Jira client configuration
interface JiraConfig {
    host: string;
    username: string;
    password: string;
    apiToken?: string;
}

// Initialize Jira client with environment variables
const jiraConfig: JiraConfig = {
    host: process.env.JIRA_HOST || "jira.corp.adobe.com",
    username: process.env.JIRA_USERNAME || "",
    password: process.env.JIRA_PASSWORD || "",
    apiToken: process.env.JIRA_API_TOKEN,
};

// Create Jira client instance with modern jira.js library
const createJiraClient = (): Version2Client => {
    const config = { ...jiraConfig };

    // Parse host to handle full URLs
    let host = config.host;
    if (host.includes("://")) {
        const url = new URL(host);
        host = url.href; // jira.js expects full URL
    } else {
        host = `https://${host}`; // Default to HTTPS
    }

    // Configure authentication for jira.js
    let authentication: any;

    if (config.apiToken) {
        if (host.includes("skyeng.link")) {
            // Jira Server/Data Center with Personal Access Token using Bearer
            console.error(
                `Using Personal Access Token with Bearer for Jira Server: ${config.username}`
            );
            authentication = {
                oauth2: {
                    accessToken: config.apiToken,
                },
            };
        } else {
            // Atlassian Cloud with API Token using Basic Auth
            console.error(
                `Using API Token with Basic Auth for Atlassian Cloud: ${config.username}`
            );
            authentication = {
                basic: {
                    email: config.username,
                    apiToken: config.apiToken,
                },
            };
        }
    } else if (config.password) {
        // Basic authentication with username/password for any Jira
        console.error(`Using password authentication for: ${config.username}`);
        authentication = {
            basic: {
                email: config.username,
                apiToken: config.password,
            },
        };
    } else {
        throw new Error(
            "No authentication method configured. Please set JIRA_PASSWORD or JIRA_API_TOKEN"
        );
    }

    return new Version2Client({
        host: host,
        authentication: authentication,
    });
};

const jira = createJiraClient();

// Helper function to validate Jira configuration
function validateJiraConfig(): string | null {
    if (!jiraConfig.host) return "JIRA_HOST environment variable is not set";
    if (!jiraConfig.username)
        return "JIRA_USERNAME environment variable is not set (should be your email)";

    // Check if either password or API token is provided
    if (!jiraConfig.password && !jiraConfig.apiToken) {
        return "Either JIRA_PASSWORD or JIRA_API_TOKEN environment variable must be set";
    }

    // For Atlassian Cloud: validate email format for username when using API token
    // For Jira Server/Data Center: username can be regular username
    if (
        jiraConfig.apiToken &&
        jiraConfig.username &&
        jiraConfig.host.includes("atlassian.net") &&
        !jiraConfig.username.includes("@")
    ) {
        return "JIRA_USERNAME should be your email address when using API token with Atlassian Cloud";
    }

    return null;
}

// Function to test Jira authentication
async function testJiraAuthentication(): Promise<string | null> {
    try {
        const authType = jiraConfig.apiToken ? "API Token/PAT" : "Password";
        console.error(`Testing Jira authentication using ${authType}...`);

        console.error("jira.js config", {
            host: jiraConfig.host,
            username: jiraConfig.username,
            hasPassword: !!jiraConfig.password,
            hasApiToken: !!jiraConfig.apiToken,
        });

        await jira.myself.getCurrentUser();
        return null;
    } catch (error) {
        return `Authentication failed: ${(error as Error).message}`;
    }
}

// Create server instance
const server = new McpServer({
    name: "jira",
    version: "1.0.0",
});

// Register Jira tools
server.tool(
    "read-description",
    "Get the description of a Jira issue",
    {
        issueKey: z.string().describe("The Jira issue key (e.g., PROJECT-123)"),
    },
    async ({ issueKey }) => {
        // Validate Jira configuration
        const configError = validateJiraConfig();
        if (configError) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Configuration error: ${configError}\n\nRequired environment variables:\n- JIRA_HOST: Your Jira instance host\n- JIRA_USERNAME: Your Jira username\n- JIRA_PASSWORD or JIRA_API_TOKEN: Your password or personal access token\n\nOptional variables:\n- JIRA_PROTOCOL: https (default) or http\n- JIRA_API_VERSION: 2 (default)\n- JIRA_STRICT_SSL: true (default) or false`,
                    },
                ],
            };
        }

        try {
            // Get issue data
            const issue = await jira.issues.getIssue({
                issueIdOrKey: issueKey,
            });

            if (!issue) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Issue ${issueKey} not found`,
                        },
                    ],
                };
            }

            // Format issue description
            const description =
                issue.fields.description || "No description available";
            const summary = issue.fields.summary || "No summary available";
            const status = issue.fields.status?.name || "Unknown status";
            const issueType = issue.fields.issuetype?.name || "Unknown type";

            const formattedDescription = [
                `Issue: ${issueKey}`,
                `Summary: ${summary}`,
                `Type: ${issueType}`,
                `Status: ${status}`,
                `\nDescription:\n${description}`,
            ].join("\n");

            return {
                content: [
                    {
                        type: "text",
                        text: formattedDescription,
                    },
                ],
            };
        } catch (error) {
            console.error("Error fetching Jira issue:", error);
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to retrieve issue ${issueKey}: ${
                            (error as Error).message
                        }`,
                    },
                ],
            };
        }
    }
);

server.tool(
    "read-comments",
    "Get the comments for a Jira issue",
    {
        issueKey: z.string().describe("The Jira issue key (e.g., PROJECT-123)"),
    },
    async ({ issueKey }) => {
        // Validate Jira configuration
        const configError = validateJiraConfig();
        if (configError) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Configuration error: ${configError}\n\nRequired environment variables:\n- JIRA_HOST: Your Jira instance host\n- JIRA_USERNAME: Your Jira username\n- JIRA_PASSWORD or JIRA_API_TOKEN: Your password or personal access token\n\nOptional variables:\n- JIRA_PROTOCOL: https (default) or http\n- JIRA_API_VERSION: 2 (default)\n- JIRA_STRICT_SSL: true (default) or false`,
                    },
                ],
            };
        }

        try {
            // Get issue comments
            const comments = await jira.issueComments.getComments({
                issueIdOrKey: issueKey,
            });

            if (
                !comments ||
                !comments.comments ||
                comments.comments.length === 0
            ) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `No comments found for issue ${issueKey}`,
                        },
                    ],
                };
            }

            // Format comments
            const formattedComments = comments.comments.map((comment: any) => {
                const author = comment.author?.displayName || "Unknown";
                const created = new Date(comment.created).toLocaleString();
                const body = comment.body || "No content";

                return [
                    `Author: ${author}`,
                    `Date: ${created}`,
                    `Comment:\n${body}`,
                    "---",
                ].join("\n");
            });

            const commentsText = `Comments for ${issueKey}:\n\n${formattedComments.join(
                "\n"
            )}`;

            return {
                content: [
                    {
                        type: "text",
                        text: commentsText,
                    },
                ],
            };
        } catch (error) {
            console.error("Error fetching Jira comments:", error);
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to retrieve comments for issue ${issueKey}: ${
                            (error as Error).message
                        }`,
                    },
                ],
            };
        }
    }
);

// Start the server
async function main() {
    try {
        // Check Jira configuration
        const configError = validateJiraConfig();
        if (configError) {
            console.error(`Jira configuration error: ${configError}`);
            console.error(
                "Please configure the required environment variables:"
            );
            console.error("- JIRA_HOST: Your Jira instance host");
            console.error("- JIRA_USERNAME: Your Jira username");
            console.error(
                "- JIRA_PASSWORD or JIRA_API_TOKEN: Your password or personal access token"
            );

            console.error(
                "Starting server in limited mode (tools will return configuration instructions)"
            );
        } else {
            const authType = jiraConfig.apiToken ? "API Token" : "Password";
            console.error(`Testing Jira authentication using ${authType}...`);
            const authError = await testJiraAuthentication();
            if (authError) {
                console.error(`Jira authentication error: ${authError}`);
                console.error("Please check your credentials.");

                console.error(
                    "Starting server in limited mode (tools will return authentication error messages)"
                );
            } else {
                console.error(
                    `Jira authentication successful using ${authType}!`
                );
            }
        }

        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Jira MCP Server running on stdio");
    } catch (error) {
        console.error("Error starting Jira MCP server:", error);
        process.exit(1);
    }
}

// Handle process signals
process.on("SIGINT", () => {
    console.error("Received SIGINT signal, shutting down...");
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.error("Received SIGTERM signal, shutting down...");
    process.exit(0);
});

process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
    process.exit(1);
});

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
