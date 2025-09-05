import { Version2Client } from "jira.js/version2";
import { z } from "zod";
import { JiraConfig } from "../../clients/jira-client.js";
import { formatComments } from "../../utils/formatters.js";
import { validateJiraConfig } from "../../utils/validation.js";

export const readCommentsSchema = {
    issueKey: z.string().describe("The Jira issue key (e.g., PROJECT-123)"),
};

export const readCommentsHandler =
    (jira: Version2Client, jiraConfig: JiraConfig) =>
    async ({ issueKey }: { issueKey: string }) => {
        const configError = validateJiraConfig(jiraConfig);
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

            // Format comments using the refactored function
            const commentsText = formatComments(
                issueKey,
                comments.comments as any
            );

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
                        text: `Failed to retrieve comments for ${issueKey}: ${
                            (error as Error).message
                        }`,
                    },
                ],
            };
        }
    };
