import { AxiosInstance } from "axios";
import { z } from "zod";
import { JiraConfig } from "../../clients/jira-client.js";
import {
    extractZephyrTestCaseKey,
    formatAxiosError,
    formatZephyrTestCase,
    ZephyrTestCase,
} from "../../utils/zephyr-utils.js";
import { validateJiraConfig } from "../../utils/validation.js";

export const getZephyrTestCaseSchema = {
    testCaseKeyOrUrl: z
        .string()
        .describe(
            'Zephyr test case key (e.g. "PROJ-T123"), or full Tests.jspa URL with #/testCase/KEY',
        ),
};

export const getZephyrTestCaseHandler =
    (zephyr: AxiosInstance, jiraConfig: JiraConfig) =>
    async ({ testCaseKeyOrUrl }: { testCaseKeyOrUrl: string }) => {
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
            const testCaseKey = extractZephyrTestCaseKey(testCaseKeyOrUrl);
            const response = await zephyr.get<ZephyrTestCase>(
                `/testcase/${testCaseKey}`,
            );

            return {
                content: [
                    {
                        type: "text",
                        text: formatZephyrTestCase(response.data, jiraConfig.host),
                    },
                ],
            };
        } catch (error) {
            console.error("Error fetching Zephyr test case:", error);
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to fetch Zephyr test case: ${formatAxiosError(error)}`,
                    },
                ],
            };
        }
    };
