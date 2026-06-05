import { AxiosInstance } from "axios";
import { z } from "zod";
import { JiraConfig } from "../../clients/jira-client.js";
import {
    extractZephyrTestCaseKey,
    formatAxiosError,
} from "../../utils/zephyr-utils.js";
import { validateJiraConfig } from "../../utils/validation.js";

export const sendZephyrTestResultSchema = {
    testRunKey: z
        .string()
        .describe('Test run key, e.g. "PROJ-C42"'),
    testCaseKeyOrUrl: z
        .string()
        .describe('Test case key or URL, e.g. "PROJ-T123"'),
    status: z
        .enum(["Pass", "Fail", "Blocked", "Not Executed"])
        .describe("Execution status"),
    comment: z
        .string()
        .optional()
        .describe("Execution comment; HTML is supported"),
    executionTime: z
        .number()
        .optional()
        .describe("Execution time in milliseconds"),
};

export const sendZephyrTestResultHandler =
    (zephyr: AxiosInstance, jiraConfig: JiraConfig) =>
    async ({
        testRunKey,
        testCaseKeyOrUrl,
        status,
        comment,
        executionTime,
    }: {
        testRunKey: string;
        testCaseKeyOrUrl: string;
        status: "Pass" | "Fail" | "Blocked" | "Not Executed";
        comment?: string;
        executionTime?: number;
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
            const response = await zephyr.post<{ id?: string }>(
                `/testrun/${testRunKey}/testcase/${testCaseKey}/testresult`,
                {
                    status,
                    comment,
                    executionTime,
                },
            );

            return {
                content: [
                    {
                        type: "text",
                        text: [
                            "Recorded Zephyr test result.",
                            `Test run: ${testRunKey}`,
                            `Test case: ${testCaseKey}`,
                            `Status: ${status}`,
                            `Result id: ${response.data.id ?? "n/a"}`,
                        ].join("\n"),
                    },
                ],
            };
        } catch (error) {
            console.error("Error sending Zephyr test result:", error);
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to send Zephyr test result: ${formatAxiosError(error)}`,
                    },
                ],
            };
        }
    };
