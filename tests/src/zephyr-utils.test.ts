import {
    buildCreateTestCasePayload,
    buildTestCaseSearchQuery,
    buildZephyrTestCaseUrl,
    extractZephyrTestCaseKey,
    formatAxiosError,
    formatFolderTree,
    formatZephyrTestCase,
} from "../../src/utils/zephyr-utils.js";

describe("Zephyr utils", () => {
    it("extracts test case key from URL hash", () => {
        expect(
            extractZephyrTestCaseKey(
                "https://jira.example.com/secure/Tests.jspa#/testCase/PROJ-T123",
            ),
        ).toBe("PROJ-T123");
    });

    it("builds project search query", () => {
        expect(
            buildTestCaseSearchQuery({
                projectKey: "PROJ",
                text: "login",
            }),
        ).toBe('projectKey = "PROJ" AND text ~ "login"');
    });

    it("builds create payload without step index", () => {
        const payload = buildCreateTestCasePayload({
            projectKey: "PROJ",
            name: "Probe",
            customFields: {
                Type: "Regression",
                "Automation status": "is-not-automated",
            },
            steps: [{ description: "Step 1" }],
        });

        expect(payload.testScript?.steps).toEqual([{ description: "Step 1" }]);
        expect(payload.testScript?.steps?.[0]).not.toHaveProperty("index");
    });

    it("formats testcase and urls", () => {
        const text = formatZephyrTestCase(
            {
                key: "PROJ-T123",
                name: "Probe",
                projectKey: "PROJ",
                status: "Draft",
                testScript: {
                    type: "STEP_BY_STEP",
                    steps: [{ description: "Do thing" }],
                },
            },
            "https://jira.example.com",
        );

        expect(text).toContain("# Probe");
        expect(text).toContain("PROJ-T123");
        expect(buildZephyrTestCaseUrl("jira.example.com", "PROJ-T123")).toContain(
            "#/testCase/PROJ-T123",
        );
    });

    it("formats axios error messages", () => {
        expect(
            formatAxiosError({
                response: {
                    status: 400,
                    data: {
                        errorMessages: ["Required custom fields were not provided"],
                    },
                },
            }),
        ).toContain("Required custom fields were not provided");
    });

    it("formats folder tree with full paths, nesting and index order", () => {
        const text = formatFolderTree(
            {
                projectId: 17801,
                itemsCount: 334,
                children: [
                    {
                        id: 20,
                        index: 1,
                        name: "C1",
                        itemsCount: 5,
                        children: [],
                    },
                    {
                        id: 10,
                        index: 0,
                        name: "C0",
                        itemsCount: 183,
                        children: [
                            {
                                id: 11,
                                index: 0,
                                name: "Авторизация",
                                itemsCount: 2,
                            },
                        ],
                    },
                ],
            },
            "GRW",
        );

        expect(text).toContain("Zephyr folder tree for GRW (projectId 17801)");
        // sorted by index: C0 (0) before C1 (1)
        expect(text.indexOf("/C0")).toBeLessThan(text.indexOf("/C1"));
        // nested child carries the full parent path and its own id/items
        expect(text).toContain("11 | 2 | /C0/Авторизация");
        expect(text).toContain("10 | 183 | /C0");
    });

    it("reports an empty folder tree", () => {
        const text = formatFolderTree(
            { projectId: 1, itemsCount: 0, children: [] },
            "EMPTY",
        );
        expect(text).toContain("(no folders in this project)");
    });
});
