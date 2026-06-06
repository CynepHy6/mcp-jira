import { JiraConfig } from "../clients/jira-client.js";

export interface ZephyrTestStep {
    description: string;
    testData?: string;
    expectedResult?: string;
}

export interface ZephyrTestScript {
    type: "STEP_BY_STEP" | "PLAIN_TEXT";
    steps?: ZephyrTestStep[];
    text?: string;
}

export interface ZephyrTestCase {
    key?: string;
    name: string;
    projectKey: string;
    objective?: string;
    precondition?: string;
    priority?: string;
    status?: string;
    folder?: string;
    customFields?: Record<string, string>;
    testScript?: ZephyrTestScript;
    createdOn?: string;
    updatedOn?: string;
    createdBy?: string;
    updatedBy?: string;
}

export interface ZephyrTestCaseSummary {
    key: string;
    name?: string;
    projectKey?: string;
    status?: string;
    folder?: string;
    customFields?: Record<string, string>;
}

export interface ZephyrTestRun {
    key: string;
    name?: string;
    projectKey?: string;
    description?: string;
}

export interface ZephyrTestResultPayload {
    status: "Pass" | "Fail" | "Blocked" | "Not Executed";
    comment?: string;
    executionTime?: number;
}

export interface ZephyrProjectSummary {
    id: string | number;
    key: string;
    name?: string;
}

export interface ZephyrFolderNode {
    id: number;
    projectId?: number;
    parentId?: number | null;
    index?: number;
    name: string;
    itemsCount?: number;
    children?: ZephyrFolderNode[];
}

export interface ZephyrFolderTreeRoot {
    projectId: number;
    itemsCount?: number;
    children?: ZephyrFolderNode[];
}

export const resolveJiraHost = (host: string): string =>
    host.includes("://") ? host.replace(/\/$/, "") : `https://${host}`;

export const buildZephyrTestCaseUrl = (
    host: string,
    testCaseKey: string,
): string =>
    `${resolveJiraHost(host)}/secure/Tests.jspa#/testCase/${testCaseKey}`;

export const buildZephyrProjectUrl = (
    host: string,
    projectId: string | number,
): string =>
    `${resolveJiraHost(host)}/secure/Tests.jspa#/v2/testCases?projectId=${projectId}`;

export const extractZephyrTestCaseKey = (value: string): string => {
    const trimmed = value.trim();
    const hashMatch = trimmed.match(/#\/testCase\/([A-Z][A-Z0-9]+-T\d+)/i);
    if (hashMatch) {
        return hashMatch[1].toUpperCase();
    }

    const pathMatch = trimmed.match(/\/testCase\/([A-Z][A-Z0-9]+-T\d+)/i);
    if (pathMatch) {
        return pathMatch[1].toUpperCase();
    }

    const keyMatch = trimmed.match(/^([A-Z][A-Z0-9]+-T\d+)$/i);
    if (keyMatch) {
        return keyMatch[1].toUpperCase();
    }

    return trimmed;
};

export const buildTestCaseSearchQuery = ({
    projectKey,
    projectId,
    text,
}: {
    projectKey?: string;
    projectId?: number;
    text?: string;
}): string => {
    const parts: string[] = [];
    if (projectKey) {
        parts.push(`projectKey = "${projectKey}"`);
    }
    if (text && text.trim().length > 0) {
        parts.push(`text ~ "${text.trim()}"`);
    }
    if (parts.length === 0 && projectId !== undefined) {
        throw new Error(
            "projectId alone is not supported by Zephyr search. Resolve project key first or pass projectKey.",
        );
    }
    return parts.join(" AND ");
};

export const formatZephyrTestCase = (
    testCase: ZephyrTestCase,
    host: string,
): string => {
    const lines = [
        `# ${testCase.name}`,
        "",
        `**Key:** ${testCase.key ?? "n/a"}`,
        `**Project:** ${testCase.projectKey}`,
        `**Status:** ${testCase.status ?? "n/a"}`,
        `**Priority:** ${testCase.priority ?? "n/a"}`,
        `**Folder:** ${testCase.folder ?? "n/a"}`,
        `**URL:** ${testCase.key ? buildZephyrTestCaseUrl(host, testCase.key) : "n/a"}`,
    ];

    if (testCase.objective) {
        lines.push("", "## Objective", testCase.objective);
    }
    if (testCase.precondition) {
        lines.push("", "## Precondition", testCase.precondition);
    }
    if (testCase.customFields && Object.keys(testCase.customFields).length > 0) {
        lines.push("", "## Custom fields");
        for (const [name, value] of Object.entries(testCase.customFields)) {
            lines.push(`- **${name}:** ${value}`);
        }
    }
    if (testCase.testScript?.steps && testCase.testScript.steps.length > 0) {
        lines.push("", "## Steps");
        testCase.testScript.steps.forEach((step, index) => {
            lines.push(`${index + 1}. ${step.description}`);
            if (step.testData) {
                lines.push(`   - Test data: ${step.testData}`);
            }
            if (step.expectedResult) {
                lines.push(`   - Expected: ${step.expectedResult}`);
            }
        });
    } else if (testCase.testScript?.text) {
        lines.push("", "## Test script", testCase.testScript.text);
    }

    if (testCase.createdBy || testCase.updatedBy) {
        lines.push(
            "",
            `**Created by:** ${testCase.createdBy ?? "n/a"} | **Updated by:** ${testCase.updatedBy ?? "n/a"}`,
        );
    }

    return lines.join("\n");
};

export const formatZephyrTestCaseList = (
    items: ZephyrTestCaseSummary[],
    host: string,
    queryLabel: string,
): string => {
    if (items.length === 0) {
        return `No Zephyr test cases found for: ${queryLabel}`;
    }

    const lines = [
        `Found ${items.length} Zephyr test case(s) for: ${queryLabel}`,
        "",
    ];

    items.forEach((item, index) => {
        lines.push(
            `${index + 1}. ${item.key}: ${item.name ?? "Untitled"}`,
            `   Project: ${item.projectKey ?? "n/a"} | Status: ${item.status ?? "n/a"}`,
            `   URL: ${buildZephyrTestCaseUrl(host, item.key)}`,
        );
        if (item.customFields && Object.keys(item.customFields).length > 0) {
            const custom = Object.entries(item.customFields)
                .map(([name, value]) => `${name}=${value}`)
                .join(", ");
            lines.push(`   Custom fields: ${custom}`);
        }
        lines.push("");
    });

    return lines.join("\n").trimEnd();
};

export const formatFolderTree = (
    root: ZephyrFolderTreeRoot,
    projectLabel: string,
): string => {
    const lines: string[] = [
        `Zephyr folder tree for ${projectLabel} (projectId ${root.projectId}).`,
        `Total test cases in project: ${root.itemsCount ?? "n/a"}.`,
        "",
        "folderId | items | path",
        "(use the path for the testcase `folder` field; use folderId for delete-zephyr-folder)",
        "",
    ];

    const walk = (nodes: ZephyrFolderNode[], parentPath: string): void => {
        const sorted = [...nodes].sort(
            (a, b) => (a.index ?? 0) - (b.index ?? 0),
        );
        for (const node of sorted) {
            const path = `${parentPath}/${node.name}`;
            lines.push(`${node.id} | ${node.itemsCount ?? 0} | ${path}`);
            if (node.children && node.children.length > 0) {
                walk(node.children, path);
            }
        }
    };

    if (root.children && root.children.length > 0) {
        walk(root.children, "");
    } else {
        lines.push("(no folders in this project)");
    }

    return lines.join("\n");
};

export const formatAxiosError = (error: unknown): string => {
    if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: unknown; status?: number } })
            .response === "object"
    ) {
        const response = (
            error as {
                response?: { data?: unknown; status?: number };
            }
        ).response;
        const status = response?.status;
        const data = response?.data;
        if (typeof data === "object" && data !== null) {
            const messages = (data as { errorMessages?: string[] }).errorMessages;
            if (messages && messages.length > 0) {
                return `HTTP ${status ?? "error"}: ${messages.join("; ")}`;
            }
            const message = (data as { message?: string }).message;
            if (message) {
                return `HTTP ${status ?? "error"}: ${message}`;
            }
        }
        if (typeof data === "string" && data.length > 0) {
            return `HTTP ${status ?? "error"}: ${data.slice(0, 500)}`;
        }
    }

    return (error as Error).message;
};

export const buildCreateTestCasePayload = ({
    projectKey,
    name,
    objective,
    precondition,
    priority,
    status,
    folder,
    customFields,
    steps,
    testScriptText,
}: {
    projectKey: string;
    name: string;
    objective?: string;
    precondition?: string;
    priority?: string;
    status?: string;
    folder?: string;
    customFields?: Record<string, string>;
    steps?: ZephyrTestStep[];
    testScriptText?: string;
}): ZephyrTestCase => {
    const payload: ZephyrTestCase = {
        projectKey,
        name,
    };

    if (objective) payload.objective = objective;
    if (precondition) payload.precondition = precondition;
    if (priority) payload.priority = priority;
    if (status) payload.status = status;
    if (folder) payload.folder = folder;
    if (customFields && Object.keys(customFields).length > 0) {
        payload.customFields = customFields;
    }

    if (steps && steps.length > 0) {
        payload.testScript = {
            type: "STEP_BY_STEP",
            steps,
        };
    } else if (testScriptText) {
        payload.testScript = {
            type: "PLAIN_TEXT",
            text: testScriptText,
        };
    }

    return payload;
};
