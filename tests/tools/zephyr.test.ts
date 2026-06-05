import axios from "axios";
import nock from "nock";
import { createZephyrTestCaseHandler } from "../../src/tools/zephyr/create-zephyr-testcase.js";
import { deleteZephyrTestCaseHandler } from "../../src/tools/zephyr/delete-zephyr-testcase.js";
import { getZephyrTestCaseHandler } from "../../src/tools/zephyr/get-zephyr-testcase.js";
import { inspectZephyrProjectHandler } from "../../src/tools/zephyr/inspect-zephyr-project.js";
import { sendZephyrTestResultHandler } from "../../src/tools/zephyr/send-zephyr-test-result.js";
import { upsertZephyrTestCaseHandler } from "../../src/tools/zephyr/upsert-zephyr-testcase.js";

describe("Zephyr Tools", () => {
    const mockConfig = {
        host: "https://jira.example.com",
        username: "test@example.com",
        password: "",
        apiToken: "test-api-token",
    };

    let zephyrClient: ReturnType<typeof axios.create>;

    beforeEach(() => {
        zephyrClient = axios.create({
            baseURL: `${mockConfig.host}/rest/atm/1.0`,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: "Bearer test-api-token",
            },
            timeout: 30000,
        });

        nock.cleanAll();
    });

    afterEach(() => {
        nock.cleanAll();
        jest.clearAllMocks();
    });

    it("gets testcase by key", async () => {
        nock("https://jira.example.com")
            .get("/rest/atm/1.0/testcase/PROJ-T123")
            .reply(200, {
                key: "PROJ-T123",
                name: "Probe",
                projectKey: "PROJ",
                status: "Draft",
                customFields: {
                    Type: "Regression",
                    "Automation status": "is-not-automated",
                },
                testScript: {
                    type: "STEP_BY_STEP",
                    steps: [{ description: "Step 1" }],
                },
            });

        const handler = getZephyrTestCaseHandler(zephyrClient, mockConfig);
        const result = await handler({
            testCaseKeyOrUrl: "PROJ-T123",
        });

        expect(result.content[0].text).toContain("# Probe");
        expect(result.content[0].text).toContain("PROJ-T123");
    });

    it("creates testcase", async () => {
        nock("https://jira.example.com")
            .post("/rest/atm/1.0/testcase", (body) => {
                expect(body.projectKey).toBe("PROJ");
                expect(body.customFields["Automation status"]).toBe(
                    "is-not-automated",
                );
                expect(body.testScript.steps[0].description).toBe("Step 1");
                expect(body.testScript.steps[0].index).toBeUndefined();
                return true;
            })
            .reply(201, {
                key: "PROJ-T2000",
                projectKey: "PROJ",
            });

        const handler = createZephyrTestCaseHandler(zephyrClient, mockConfig);
        const result = await handler({
            projectKey: "PROJ",
            name: "Probe",
            customFields: {
                Type: "Regression",
                "Automation status": "is-not-automated",
            },
            steps: [{ description: "Step 1" }],
        });

        expect(result.content[0].text).toContain("PROJ-T2000");
    });

    it("sends test result to test run", async () => {
        nock("https://jira.example.com")
            .post("/rest/atm/1.0/testrun/PROJ-C42/testcase/PROJ-T123/testresult")
            .reply(201, { id: "40500" });

        const handler = sendZephyrTestResultHandler(zephyrClient, mockConfig);
        const result = await handler({
            testRunKey: "PROJ-C42",
            testCaseKeyOrUrl: "PROJ-T123",
            status: "Pass",
            comment: "ok",
            executionTime: 1000,
        });

        expect(result.content[0].text).toContain("40500");
        expect(result.content[0].text).toContain("Pass");
    });

    it("inspects project custom fields", async () => {
        nock("https://jira.example.com")
            .post("/rest/atm/1.0/testcase/search")
            .reply(200, [
                {
                    key: "PROJ-T1",
                    name: "Sample",
                    projectKey: "PROJ",
                    customFields: {
                        Type: "Regression",
                        "Automation status": "automated",
                    },
                    folder: "/Smoke",
                },
            ]);

        const handler = inspectZephyrProjectHandler(zephyrClient, mockConfig);
        const result = await handler({
            projectKey: "PROJ",
            sampleSize: 20,
        });

        expect(result.content[0].text).toContain("Automation status");
        expect(result.content[0].text).toContain("test-wdio sync checklist");
    });

    it("upserts existing case from wdio title suffix", async () => {
        nock("https://jira.example.com")
            .get("/rest/atm/1.0/testcase/PROJ-T123")
            .reply(200, {
                key: "PROJ-T123",
                name: "Old name",
                projectKey: "PROJ",
                customFields: { Type: "Regression" },
                testScript: {
                    type: "STEP_BY_STEP",
                    steps: [{ description: "Old step" }],
                },
            })
            .put("/rest/atm/1.0/testcase/PROJ-T123")
            .reply(200)
            .get("/rest/atm/1.0/testcase/PROJ-T123")
            .reply(200, {
                key: "PROJ-T123",
                name: "Updated banner",
                projectKey: "PROJ",
                testScript: {
                    type: "STEP_BY_STEP",
                    steps: [{ description: "New step" }],
                },
            });

        const handler = upsertZephyrTestCaseHandler(zephyrClient, mockConfig);
        const result = await handler({
            wdioItTitle: "Updated banner #PROJ-T123",
            testScriptPlainText: "Шаг 1: New step",
        });

        expect(result.content[0].text).toContain("Updated Zephyr test case");
        expect(result.content[0].text).toContain("PROJ-T123");
    });

    it("creates new case when wdio title has no suffix", async () => {
        nock("https://jira.example.com")
            .post("/rest/atm/1.0/testcase/search")
            .reply(200, [
                {
                    key: "PROJ-T1",
                    customFields: {
                        Type: "Regression",
                        "Automation status": "is-not-automated",
                    },
                },
            ])
            .post("/rest/atm/1.0/testcase")
            .reply(201, { key: "PROJ-T999", projectKey: "PROJ" })
            .get("/rest/atm/1.0/testcase/PROJ-T999")
            .reply(200, {
                key: "PROJ-T999",
                name: "New banner test",
                projectKey: "PROJ",
                testScript: {
                    type: "STEP_BY_STEP",
                    steps: [{ description: "Step 1" }],
                },
            });

        const handler = upsertZephyrTestCaseHandler(zephyrClient, mockConfig);
        const result = await handler({
            projectKey: "PROJ",
            wdioItTitle: "New banner test",
            testScriptPlainText: "Шаг 1: Step 1",
            automationStatus: "is-not-automated",
        });

        expect(result.content[0].text).toContain("Created Zephyr test case");
        expect(result.content[0].text).toContain("it('New banner test #PROJ-T999'");
    });

    it("deletes testcase when confirm is true", async () => {
        nock("https://jira.example.com")
            .get("/rest/atm/1.0/testcase/PROJ-T123")
            .reply(200, {
                key: "PROJ-T123",
                name: "Obsolete case",
                projectKey: "PROJ",
            })
            .delete("/rest/atm/1.0/testcase/PROJ-T123")
            .reply(204);

        const handler = deleteZephyrTestCaseHandler(zephyrClient, mockConfig);
        const result = await handler({
            testCaseKeyOrUrl: "PROJ-T123",
            confirm: true,
        });

        expect(result.content[0].text).toContain("Deleted Zephyr test case");
        expect(result.content[0].text).toContain("Obsolete case");
    });

    it("reports delete failure when case is missing", async () => {
        nock("https://jira.example.com")
            .get("/rest/atm/1.0/testcase/PROJ-T404")
            .reply(404, { errorMessages: ["Test case not found"] });

        const handler = deleteZephyrTestCaseHandler(zephyrClient, mockConfig);
        const result = await handler({
            testCaseKeyOrUrl: "PROJ-T404",
            confirm: true,
        });

        expect(result.content[0].text).toContain("Failed to delete Zephyr test case");
    });
});
