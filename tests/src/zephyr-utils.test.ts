import {
    buildCreateTestCasePayload,
    buildTestCaseSearchQuery,
    buildZephyrTestCaseUrl,
    extractZephyrTestCaseKey,
    formatAxiosError,
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
});
