import { Version2Client } from "jira.js/version2";
import { z } from "zod";
import { JiraConfig } from "../../clients/jira-client.js";
import { formatIssueDescription } from "../../utils/formatters.js";
import { validateJiraConfig } from "../../utils/validation.js";

export const readDescriptionSchema = {
    issueKey: z.string().describe("The Jira issue key (e.g., PROJECT-123)"),
};

export const readDescriptionHandler =
    (jira: Version2Client, jiraConfig: JiraConfig) =>
    async ({ issueKey }: { issueKey: string }) => {
        // Validate Jira configuration
        const configError = validateJiraConfig(jiraConfig);
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

            // Format issue description using the refactored function
            const formattedDescription = formatIssueDescription(issue as any);

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
    };
