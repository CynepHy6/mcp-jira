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

// Import our refactored modules

// Import clients
import {
    createConfiguredConfluenceClient,
    getConfluenceConfig,
} from "./clients/confluence-client.js";
import {
    createConfiguredJiraClient,
    getJiraConfig,
} from "./clients/jira-client.js";

// Import tool handlers
import {
    getConfluencePageHandler,
    getConfluencePageSchema,
} from "./tools/confluence/get-confluence-page.js";
import {
    searchConfluencePagesHandler,
    searchConfluencePagesSchema,
} from "./tools/confluence/search-confluence-pages.js";
import {
    getRecentWorklogsHandler,
    getRecentWorklogsSchema,
} from "./tools/jira/get-recent-worklogs.js";
import {
    getWorklogsByDaysHandler,
    getWorklogsByDaysSchema,
} from "./tools/jira/get-worklogs-by-days.js";
import {
    getWorklogsHandler,
    getWorklogsSchema,
} from "./tools/jira/get-worklogs.js";
import {
    readCommentsHandler,
    readCommentsSchema,
} from "./tools/jira/read-comments.js";
import {
    readDescriptionHandler,
    readDescriptionSchema,
} from "./tools/jira/read-description.js";
import {
    searchIssuesHandler,
    searchIssuesSchema,
} from "./tools/jira/search-issues.js";

// Initialize clients
const jiraConfig = getJiraConfig();
const confluenceConfig = getConfluenceConfig();
const jira = createConfiguredJiraClient();
const confluence = createConfiguredConfluenceClient();

// Initialize MCP server
const server = new McpServer(
    {
        name: "jira-confluence-mcp",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Function to test Jira authentication
async function testJiraAuthentication(): Promise<string | null> {
    try {
        const authType = jiraConfig.apiToken ? "API Token/PAT" : "Password";
        console.error(`Testing Jira authentication using ${authType}...`);

        await jira.myself.getCurrentUser();
        console.error("✅ Jira authentication successful");
        return null;
    } catch (error) {
        return `Authentication failed: ${(error as Error).message}`;
    }
}

// Register Jira tools
server.tool(
    "read-description",
    "Get the description of a Jira issue. ALWAYS use this tool FIRST when a Jira issue URL or key is mentioned in the user query to understand the full context, requirements, and business logic before proceeding with code analysis or implementation.",
    readDescriptionSchema,
    readDescriptionHandler(jira, jiraConfig) as any
);

server.tool(
    "read-comments",
    "Get the comments for a Jira issue. Use this tool to get additional context, clarifications, and discussions about the issue after reading the main description.",
    readCommentsSchema,
    readCommentsHandler(jira, jiraConfig) as any
);

server.tool(
    "get-worklogs",
    "Get worklogs and task descriptions for yourself or a colleague",
    getWorklogsSchema,
    getWorklogsHandler(jira, jiraConfig) as any
);

server.tool(
    "get-worklogs-by-days",
    "Get worklogs by specifying days and start date (yours or a colleague's)",
    getWorklogsByDaysSchema,
    getWorklogsByDaysHandler(jira, jiraConfig) as any
);

server.tool(
    "search-issues",
    "Search for Jira issues by title (summary) or description. Use this when you need to find related issues or when working on tasks that might have dependencies on other tickets.",
    searchIssuesSchema,
    searchIssuesHandler(jira, jiraConfig) as any
);

server.tool(
    "get-recent-worklogs",
    "Get worklogs for standard time periods (yours or a colleague's)",
    getRecentWorklogsSchema,
    getRecentWorklogsHandler(jira, jiraConfig) as any
);

// Register Confluence tools
server.tool(
    "get-confluence-page",
    "Get the content of a Confluence page by ID or URL",
    getConfluencePageSchema,
    getConfluencePageHandler(confluence, confluenceConfig) as any
);

server.tool(
    "search-confluence-pages",
    "Search for Confluence pages by title or content",
    searchConfluencePagesSchema,
    searchConfluencePagesHandler(confluence, confluenceConfig) as any
);

// Start server
async function main() {
    try {
        // Test authentication
        const authError = await testJiraAuthentication();
        if (authError) {
            console.error(`❌ ${authError}`);
            console.error(
                "Please check your environment variables and authentication configuration."
            );
            process.exit(1);
        }

        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("✅ Jira/Confluence MCP server running on stdio");
    } catch (error) {
        console.error("Error starting Jira MCP server:", error);
        process.exit(1);
    }
}

main();
