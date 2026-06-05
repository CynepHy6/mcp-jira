import { AxiosInstance } from "axios";
import { z } from "zod";
import { JiraConfig } from "../../clients/jira-client.js";
import {
    buildZephyrTestCaseUrl,
    extractZephyrTestCaseKey,
    formatAxiosError,
    ZephyrTestCase,
} from "../../utils/zephyr-utils.js";
import { validateJiraConfig } from "../../utils/validation.js";

export const deleteZephyrTestCaseSchema = {
    testCaseKeyOrUrl: z
        .string()
        .describe(
            'Zephyr test case key or Tests.jspa URL to delete, e.g. "PROJ-T123".',
        ),
    confirm: z
        .literal(true)
        .describe(
            "Must be true. Destructive: permanently deletes the test case. Call get-zephyr-testcase first if unsure.",
        ),
};

export const deleteZephyrTestCaseHandler =
    (zephyr: AxiosInstance, jiraConfig: JiraConfig) =>
    async ({
        testCaseKeyOrUrl,
        confirm,
    }: {
        testCaseKeyOrUrl: string;
        confirm: true;
    }) => {
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
            const currentResponse = await zephyr.get<ZephyrTestCase>(
                `/testcase/${testCaseKey}`,
            );
            const current = currentResponse.data;

            await zephyr.delete(`/testcase/${testCaseKey}`);

            return {
                content: [
                    {
                        type: "text",
                        text: [
                            "Deleted Zephyr test case.",
                            `Key: ${testCaseKey}`,
                            `Name: ${current.name}`,
                            `Project: ${current.projectKey}`,
                            `Former URL: ${buildZephyrTestCaseUrl(jiraConfig.host, testCaseKey)}`,
                            "",
                            "Execution history for this key is no longer available in Zephyr.",
                        ].join("\n"),
                    },
                ],
            };
        } catch (error) {
            console.error("Error deleting Zephyr test case:", error);
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to delete Zephyr test case: ${formatAxiosError(error)}`,
                    },
                ],
            };
        }
    };
