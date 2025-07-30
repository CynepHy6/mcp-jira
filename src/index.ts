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

// Helper function to format duration from seconds
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

// Helper function to calculate date range from end date and days backward
function getDateRangeFromDays(
    days: number,
    endDate?: string
): { startDate: string; endDate: string } {
    const end = endDate ? new Date(endDate) : new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

    return {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
    };
}

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

server.tool(
    "get-worklogs",
    "Get worklogs and task descriptions for yourself or a colleague",
    {
        startDate: z.string().describe("Start date in YYYY-MM-DD format"),
        endDate: z.string().describe("End date in YYYY-MM-DD format"),
        username: z
            .string()
            .optional()
            .describe(
                "Username to get worklogs for. If not specified, gets your own worklogs"
            ),
        projectKeys: z
            .array(z.string())
            .optional()
            .describe("Filter by specific project keys (optional)"),
        includeSubtasks: z
            .boolean()
            .default(false)
            .describe("Include subtasks in results"),
        includeCommunication: z
            .boolean()
            .default(false)
            .describe(
                "Include communication tasks (COM-* issues). Default: false"
            ),
        communicationProjects: z
            .array(z.string())
            .default(["COM"])
            .describe("Project keys for communication tasks"),
    },
    async ({
        startDate,
        endDate,
        username,
        projectKeys,
        includeSubtasks,
        includeCommunication,
        communicationProjects,
    }) => {
        const configError = validateJiraConfig();
        if (configError) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Configuration error: ${configError}\n\nRequired environment variables:\n- JIRA_HOST: Your Jira instance host\n- JIRA_USERNAME: Your Jira username\n- JIRA_PASSWORD or JIRA_API_TOKEN: Your password or personal access token`,
                    },
                ],
            };
        }

        try {
            let targetUser;
            let jqlUserFilter;

            if (username) {
                try {
                    targetUser = await jira.users.getUser({
                        accountId: username,
                    });
                    jqlUserFilter = `worklogAuthor = "${username}"`;
                } catch (userError) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `User "${username}" not found or no permission to view their data`,
                            },
                        ],
                    };
                }
            } else {
                targetUser = await jira.myself.getCurrentUser();
                jqlUserFilter = `worklogAuthor = currentUser()`;
            }

            let jqlQuery = `${jqlUserFilter} AND worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"`;

            if (projectKeys && projectKeys.length > 0) {
                jqlQuery += ` AND project IN (${projectKeys
                    .map((k) => `"${k}"`)
                    .join(",")})`;
            }

            if (!includeCommunication && communicationProjects.length > 0) {
                jqlQuery += ` AND project NOT IN (${communicationProjects
                    .map((k) => `"${k}"`)
                    .join(",")})`;
            }

            if (!includeSubtasks) {
                jqlQuery += ` AND issuetype != Sub-task`;
            }

            // Исключаем коммуникационные подзадачи (обсуждения, код-ревью)
            jqlQuery += ` AND summary !~ "communications"`;

            const searchResults =
                await jira.issueSearch.searchForIssuesUsingJql({
                    jql: jqlQuery,
                    fields: [
                        "key",
                        "summary",
                        "description",
                        "issuetype",
                        "priority",
                        "status",
                        "assignee",
                        "creator",
                        "created",
                        "updated",
                        "project",
                    ],
                    maxResults: 1000,
                    startAt: 0,
                });

            const results: any[] = [];
            const communicationTasks: any[] = [];
            const processedIssues = new Set();

            if (!searchResults.issues) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "No issues found for the specified criteria",
                        },
                    ],
                };
            }

            for (const issue of searchResults.issues) {
                if (processedIssues.has(issue.key)) continue;
                processedIssues.add(issue.key);

                const worklogsResponse =
                    await jira.issueWorklogs.getIssueWorklog({
                        issueIdOrKey: issue.key,
                    });

                const targetUsername =
                    username ||
                    (targetUser as any)?.name ||
                    (targetUser as any)?.key ||
                    (targetUser as any)?.accountId;
                const userWorklogs =
                    worklogsResponse.worklogs?.filter((worklog: any) => {
                        const worklogDate = new Date(worklog.started);
                        const start = new Date(startDate);
                        const end = new Date(endDate);

                        return (
                            (worklog.author.name === targetUsername ||
                                worklog.author.key === targetUsername ||
                                worklog.author.accountId === targetUsername) &&
                            worklogDate >= start &&
                            worklogDate <= end
                        );
                    }) || [];

                if (userWorklogs.length > 0) {
                    const totalTimeSpent = userWorklogs.reduce(
                        (sum: number, wl: any) => sum + wl.timeSpentSeconds,
                        0
                    );

                    const taskData = {
                        issue: {
                            key: issue.key,
                            summary: issue.fields.summary,
                            description:
                                issue.fields.description ||
                                "No description available",
                            issueType: issue.fields.issuetype?.name,
                            priority: issue.fields.priority?.name,
                            status: issue.fields.status?.name,
                            assignee: issue.fields.assignee?.displayName,
                            creator: issue.fields.creator?.displayName,
                            project: issue.fields.project?.key,
                            created: issue.fields.created,
                            updated: issue.fields.updated,
                            url: `${jiraConfig.host}/browse/${issue.key}`,
                            isCommunication: communicationProjects.includes(
                                issue.fields.project?.key
                            ),
                        },
                        worklogs: userWorklogs.map((wl: any) => ({
                            id: wl.id,
                            timeSpent: wl.timeSpent,
                            timeSpentSeconds: wl.timeSpentSeconds,
                            started: wl.started,
                            comment: wl.comment || "",
                            created: wl.created,
                            updated: wl.updated,
                        })),
                        totalTimeSpent: {
                            seconds: totalTimeSpent,
                            formatted: formatDuration(totalTimeSpent),
                        },
                    };

                    if (
                        communicationProjects.includes(
                            issue.fields.project?.key
                        )
                    ) {
                        communicationTasks.push(taskData);
                    } else {
                        results.push(taskData);
                    }
                }
            }

            if (includeCommunication && communicationTasks.length > 0) {
                results.push(...communicationTasks);
            }

            results.sort(
                (a, b) => b.totalTimeSpent.seconds - a.totalTimeSpent.seconds
            );

            const projectTasks = results.filter(
                (r) => !r.issue.isCommunication
            );
            const commTasks = results.filter((r) => r.issue.isCommunication);

            const totalTime = results.reduce(
                (sum, r) => sum + r.totalTimeSpent.seconds,
                0
            );
            const projectTime = projectTasks.reduce(
                (sum, r) => sum + r.totalTimeSpent.seconds,
                0
            );
            const commTime = commTasks.reduce(
                (sum, r) => sum + r.totalTimeSpent.seconds,
                0
            );

            const userDisplayName =
                (targetUser as any)?.displayName ||
                (targetUser as any)?.name ||
                username ||
                "current user";

            const reportTitle = username
                ? `Worklog Report for ${userDisplayName} (${username})`
                : `Your Worklog Report`;

            const formattedResults = [
                reportTitle,
                `Period: ${startDate} to ${endDate}`,
                `Total tasks: ${results.length} (${projectTasks.length} project + ${commTasks.length} communication)`,
                `Total time: ${formatDuration(totalTime)}`,
                `  - Project work: ${formatDuration(projectTime)}`,
                `  - Communication: ${formatDuration(commTime)}`,
                `Projects: ${
                    [...new Set(projectTasks.map((r) => r.issue.project))].join(
                        ", "
                    ) || "None"
                }`,
                `Task types: ${
                    [...new Set(results.map((r) => r.issue.issueType))].join(
                        ", "
                    ) || "None"
                }`,
                "",
            ];

            if (!includeCommunication) {
                formattedResults.push(
                    `Note: Communication tasks (${communicationProjects.join(
                        ", "
                    )}) are excluded by default`
                );
                formattedResults.push(
                    `To include them, set includeCommunication to true`
                );
                formattedResults.push("");
            }

            formattedResults.push("PROJECT TASKS:", "=".repeat(50));

            projectTasks.forEach((result, index) => {
                formattedResults.push(
                    `\n${index + 1}. ${result.issue.key}: ${
                        result.issue.summary
                    }`,
                    `   Type: ${result.issue.issueType} | Priority: ${result.issue.priority} | Status: ${result.issue.status}`,
                    `   Project: ${result.issue.project} | Time spent: ${result.totalTimeSpent.formatted}`,
                    `   URL: ${result.issue.url}`,
                    `   Description: ${result.issue.description.substring(
                        0,
                        200
                    )}${result.issue.description.length > 200 ? "..." : ""}`,
                    `   Worklogs (${result.worklogs.length}):`
                );

                result.worklogs.forEach((wl: any) => {
                    const worklogDate = new Date(
                        wl.started
                    ).toLocaleDateString();
                    const comment = wl.comment
                        ? ` (${wl.comment.substring(0, 100)}${
                              wl.comment.length > 100 ? "..." : ""
                          })`
                        : "";
                    formattedResults.push(
                        `     - ${worklogDate}: ${wl.timeSpent}${comment}`
                    );
                });
            });

            if (includeCommunication && commTasks.length > 0) {
                formattedResults.push(
                    "\n\nCOMMUNICATION TASKS:",
                    "=".repeat(50)
                );

                commTasks.forEach((result, index) => {
                    formattedResults.push(
                        `\n${index + 1}. ${result.issue.key}: ${
                            result.issue.summary
                        }`,
                        `   Time spent: ${result.totalTimeSpent.formatted}`,
                        `   Worklogs (${result.worklogs.length}):`
                    );

                    result.worklogs.forEach((wl: any) => {
                        const worklogDate = new Date(
                            wl.started
                        ).toLocaleDateString();
                        const comment = wl.comment
                            ? ` (${wl.comment.substring(0, 150)}${
                                  wl.comment.length > 150 ? "..." : ""
                              })`
                            : "";
                        formattedResults.push(
                            `     - ${worklogDate}: ${wl.timeSpent}${comment}`
                        );
                    });
                });
            } else if (commTime > 0) {
                formattedResults.push(
                    `\nCommunication time logged: ${formatDuration(
                        commTime
                    )} (excluded from detailed report)`
                );
            }

            return {
                content: [
                    {
                        type: "text",
                        text: formattedResults.join("\n"),
                    },
                ],
            };
        } catch (error) {
            console.error("Error fetching worklogs:", error);
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to retrieve worklogs: ${
                            (error as Error).message
                        }`,
                    },
                ],
            };
        }
    }
);

server.tool(
    "get-worklogs-by-days",
    "Get worklogs by specifying days and start date (yours or a colleague's)",
    {
        days: z
            .number()
            .positive()
            .describe(
                "Number of days to look backward from end date (e.g. 180 for ~6 months, 30 for ~1 month)"
            ),
        endDate: z
            .string()
            .optional()
            .describe(
                "End date in YYYY-MM-DD format. If not specified, uses current date"
            ),
        username: z
            .string()
            .optional()
            .describe(
                "Username to get worklogs for. If not specified, gets your own worklogs"
            ),
        projectKeys: z
            .array(z.string())
            .optional()
            .describe("Filter by specific project keys (optional)"),
        includeSubtasks: z
            .boolean()
            .default(false)
            .describe("Include subtasks in results"),
        includeCommunication: z
            .boolean()
            .default(false)
            .describe(
                "Include communication tasks (COM-* issues). Default: false"
            ),
        communicationProjects: z
            .array(z.string())
            .default(["COM"])
            .describe("Project keys for communication tasks"),
    },
    async ({
        days,
        endDate,
        username,
        projectKeys,
        includeSubtasks,
        includeCommunication,
        communicationProjects,
    }) => {
        const { startDate: calculatedStartDate, endDate: calculatedEndDate } =
            getDateRangeFromDays(days, endDate);

        // Call the main get-worklogs function with calculated dates
        const configError = validateJiraConfig();
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
            let jqlUserFilter = username
                ? `worklogAuthor = "${username}"`
                : "worklogAuthor = currentUser()";

            let jqlProjectFilter = "";
            if (projectKeys && projectKeys.length > 0) {
                jqlProjectFilter = ` AND project in (${projectKeys
                    .map((key) => `"${key}"`)
                    .join(", ")})`;
            }

            let jqlCommunicationFilter = "";
            if (!includeCommunication && communicationProjects.length > 0) {
                jqlCommunicationFilter = ` AND project not in (${communicationProjects
                    .map((key) => `"${key}"`)
                    .join(", ")})`;
            }

            // Исключаем коммуникационные подзадачи (обсуждения, код-ревью)
            jqlCommunicationFilter += ` AND summary !~ "communications"`;

            const jqlQuery = `worklogDate >= "${calculatedStartDate}" AND worklogDate <= "${calculatedEndDate}" AND ${jqlUserFilter}${jqlProjectFilter}${jqlCommunicationFilter}`;

            const searchResults =
                await jira.issueSearch.searchForIssuesUsingJql({
                    jql: jqlQuery,
                    fields: [
                        "key",
                        "summary",
                        "description",
                        "issuetype",
                        "priority",
                        "status",
                        "assignee",
                        "creator",
                        "created",
                        "updated",
                        "project",
                    ],
                    maxResults: 1000,
                    startAt: 0,
                });

            const results: any[] = [];
            const communicationTasks: any[] = [];
            const processedIssues = new Set();

            for (const issue of searchResults.issues || []) {
                if (processedIssues.has(issue.key)) continue;
                processedIssues.add(issue.key);

                const worklogsResponse =
                    await jira.issueWorklogs.getIssueWorklog({
                        issueIdOrKey: issue.key,
                    });

                const targetUsername = username || "current user";
                const userWorklogs = worklogsResponse.worklogs?.filter(
                    (worklog: any) => {
                        const worklogDate = new Date(worklog.started);
                        const start = new Date(calculatedStartDate);
                        const end = new Date(calculatedEndDate);

                        return (
                            (worklog.author.name === username ||
                                worklog.author.accountId === username ||
                                !username) &&
                            worklogDate >= start &&
                            worklogDate <= end
                        );
                    }
                );

                if (userWorklogs && userWorklogs.length > 0) {
                    const totalTimeSpent = userWorklogs.reduce(
                        (sum: number, wl: any) => sum + wl.timeSpentSeconds,
                        0
                    );

                    const result = {
                        key: issue.key,
                        summary: issue.fields.summary,
                        description:
                            issue.fields.description?.substring(0, 500) ||
                            "No description",
                        url: `${jiraConfig.host}/browse/${issue.key}`,
                        type: issue.fields.issuetype?.name || "Unknown",
                        priority: issue.fields.priority?.name || "No Priority",
                        status: issue.fields.status?.name || "Unknown",
                        project: issue.fields.project?.key || "Unknown",
                        totalTimeSpent: formatDuration(totalTimeSpent),
                        worklogs: userWorklogs.map((wl: any) => ({
                            date: wl.started.split("T")[0],
                            timeSpent: formatDuration(wl.timeSpentSeconds),
                            comment: wl.comment || "No comment",
                        })),
                    };

                    const isCommTask = communicationProjects.some((proj) =>
                        issue.key.startsWith(`${proj}-`)
                    );
                    if (isCommTask) {
                        communicationTasks.push(result);
                    } else {
                        results.push(result);
                    }
                }
            }

            const totalProjectTime = results.reduce((sum, result) => {
                result.worklogs.forEach((wl: any) => {
                    const match = wl.timeSpent.match(/(\d+)d|(\d+)h|(\d+)m/g);
                    if (match) {
                        match.forEach((m: string) => {
                            if (m.includes("d")) sum += parseInt(m) * 8 * 3600;
                            else if (m.includes("h")) sum += parseInt(m) * 3600;
                            else if (m.includes("m")) sum += parseInt(m) * 60;
                        });
                    }
                });
                return sum;
            }, 0);

            const totalCommTime = communicationTasks.reduce((sum, result) => {
                result.worklogs.forEach((wl: any) => {
                    const match = wl.timeSpent.match(/(\d+)d|(\d+)h|(\d+)m/g);
                    if (match) {
                        match.forEach((m: string) => {
                            if (m.includes("d")) sum += parseInt(m) * 8 * 3600;
                            else if (m.includes("h")) sum += parseInt(m) * 3600;
                            else if (m.includes("m")) sum += parseInt(m) * 60;
                        });
                    }
                });
                return sum;
            }, 0);

            const userDisplayName = username || "your";
            const reportTitle = username
                ? `Worklog Report for ${username}`
                : `Your Worklog Report`;

            let report = `${reportTitle}\n`;
            report += `Period: ${calculatedStartDate} to ${calculatedEndDate} (${days} days)\n`;
            report += `Total tasks: ${
                results.length + communicationTasks.length
            } (${results.length} project`;
            if (communicationTasks.length > 0) {
                report += ` + ${communicationTasks.length} communication`;
            }
            report += `)\n`;
            report += `Total time: ${formatDuration(
                totalProjectTime + totalCommTime
            )}\n`;
            report += `  - Project work: ${formatDuration(totalProjectTime)}\n`;
            if (totalCommTime > 0) {
                report += `  - Communication: ${formatDuration(
                    totalCommTime
                )}\n`;
            }

            if (results.length > 0) {
                const projects = [...new Set(results.map((r) => r.project))];
                const taskTypes = [...new Set(results.map((r) => r.type))];
                report += `Projects: ${projects.join(", ")}\n`;
                report += `Task types: ${taskTypes.join(", ")}\n`;
            }

            if (!includeCommunication && communicationTasks.length > 0) {
                report += `\nNote: Communication tasks (${communicationProjects.join(
                    ", "
                )}) are excluded by default\n`;
                report += `To include them, set includeCommunication to true\n`;
            }

            if (results.length > 0) {
                report += `\nPROJECT TASKS:\n${"=".repeat(50)}\n\n`;

                results.forEach((result, index) => {
                    report += `${index + 1}. ${result.key}: ${
                        result.summary
                    }\n`;
                    report += `   Type: ${result.type} | Priority: ${result.priority} | Status: ${result.status}\n`;
                    report += `   Project: ${result.project} | Time spent: ${result.totalTimeSpent}\n`;
                    report += `   URL: ${result.url}\n`;
                    report += `   Description: ${result.description}\n`;
                    report += `   Worklogs (${result.worklogs.length}):\n`;

                    result.worklogs.forEach((wl: any) => {
                        report += `     - ${wl.date}: ${wl.timeSpent}`;
                        if (wl.comment && wl.comment !== "No comment") {
                            report += ` (${wl.comment})`;
                        }
                        report += `\n`;
                    });
                    report += `\n`;
                });
            }

            if (includeCommunication && communicationTasks.length > 0) {
                report += `\nCOMMUNICATION TASKS:\n${"=".repeat(50)}\n\n`;

                communicationTasks.forEach((result, index) => {
                    report += `${index + 1}. ${result.key}: ${
                        result.summary
                    }\n`;
                    report += `   Time spent: ${result.totalTimeSpent}\n`;
                    report += `   Worklogs (${result.worklogs.length}):\n`;

                    result.worklogs.forEach((wl: any) => {
                        report += `     - ${wl.date}: ${wl.timeSpent}`;
                        if (wl.comment && wl.comment !== "No comment") {
                            report += ` (${wl.comment})`;
                        }
                        report += `\n`;
                    });
                    report += `\n`;
                });
            }

            return {
                content: [
                    {
                        type: "text",
                        text: report,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to retrieve worklogs: ${
                            (error as Error).message
                        }`,
                    },
                ],
            };
        }
    }
);

server.tool(
    "get-recent-worklogs",
    "Get worklogs for standard time periods (yours or a colleague's)",
    {
        period: z
            .enum(["week", "month", "3months", "6months", "year"])
            .describe("Time period"),
        username: z
            .string()
            .optional()
            .describe(
                "Username to get worklogs for. If not specified, gets your own worklogs"
            ),
        projectKeys: z
            .array(z.string())
            .optional()
            .describe("Filter by specific projects"),
        includeCommunication: z
            .boolean()
            .default(false)
            .describe(
                "Include communication tasks (COM-* issues). Default: false"
            ),
    },
    async ({ period, username, projectKeys, includeCommunication }) => {
        const now = new Date();
        const endDate = now.toISOString().split("T")[0];
        let startDate: string;

        const periodDays = {
            week: 7,
            month: 30,
            "3months": 90,
            "6months": 180,
            year: 365,
        };

        startDate = new Date(
            now.getTime() - periodDays[period] * 24 * 60 * 60 * 1000
        )
            .toISOString()
            .split("T")[0];

        // Упрощенная версия для быстрого просмотра
        const configError = validateJiraConfig();
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
            let jqlUserFilter = username
                ? `worklogAuthor = "${username}"`
                : `worklogAuthor = currentUser()`;
            let jqlQuery = `${jqlUserFilter} AND worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"`;

            if (projectKeys && projectKeys.length > 0) {
                jqlQuery += ` AND project IN (${projectKeys
                    .map((k) => `"${k}"`)
                    .join(",")})`;
            }

            if (!includeCommunication) {
                jqlQuery += ` AND project NOT IN ("COM")`;
            }

            jqlQuery += ` AND issuetype != Sub-task`;

            // Исключаем коммуникационные подзадачи (обсуждения, код-ревью)
            jqlQuery += ` AND summary !~ "communications"`;

            const searchResults =
                await jira.issueSearch.searchForIssuesUsingJql({
                    jql: jqlQuery,
                    fields: ["key", "summary", "project"],
                    maxResults: 50,
                });

            const taskCount = searchResults.issues?.length || 0;
            const userDisplayName = username || "You";

            return {
                content: [
                    {
                        type: "text",
                        text: `${userDisplayName} worked on ${taskCount} tasks in the last ${period}:\n${
                            searchResults.issues
                                ?.map(
                                    (issue) =>
                                        `- ${issue.key}: ${issue.fields.summary}`
                                )
                                .join("\n") || "No tasks found"
                        }`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: ${(error as Error).message}`,
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
