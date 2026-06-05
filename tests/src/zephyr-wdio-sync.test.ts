import {
    collectProjectInspection,
    formatPlainTextAsZephyrSteps,
    formatUpsertResult,
    mergeUpsertName,
    parseWdioItTitle,
    resolveUpsertSteps,
} from "../../src/utils/zephyr-wdio-sync.js";

describe("Zephyr wdio sync utils", () => {
    it("parses wdio it title with zephyr key suffix", () => {
        expect(
            parseWdioItTitle("Repeat payment shows banner #PROJ-T123"),
        ).toEqual({
            testCaseKey: "PROJ-T123",
            name: "Repeat payment shows banner",
        });
        expect(parseWdioItTitle("New test without key")).toEqual({
            name: "New test without key",
        });
    });

    it("merges name from wdio title", () => {
        expect(
            mergeUpsertName(undefined, "Banner visible #PROJ-T1"),
        ).toBe("Banner visible");
    });

    it("converts multiline plain text to zephyr steps", () => {
        const steps = formatPlainTextAsZephyrSteps(
            "Шаг 1: Open page\n\nОжидаемый результат: page loads",
        );
        expect(steps).toHaveLength(1);
        expect(steps[0].description).toContain("Шаг 1: Open page");
        expect(steps[0].description).toContain("<br />");
    });

    it("splits numbered steps from plain text", () => {
        const steps = formatPlainTextAsZephyrSteps(
            "Шаг 1: First\n\nШаг 2: Second",
        );
        expect(steps).toHaveLength(2);
    });

    it("prefers structured steps over plain text", () => {
        expect(
            resolveUpsertSteps({
                testScriptPlainText: "ignored",
                steps: [{ description: "Do action" }],
            }),
        ).toEqual([{ description: "Do action" }]);
    });

    it("collects custom field options from sample cases", () => {
        const inspection = collectProjectInspection("PROJ", [
            {
                key: "PROJ-T1",
                name: "One",
                customFields: {
                    Type: "Regression",
                    "Automation status": "automated",
                },
                folder: "/Smoke",
            },
            {
                key: "PROJ-T2",
                name: "Two",
                customFields: {
                    Type: "UAT",
                    "Automation status": "is-not-automated",
                },
                folder: "/Smoke/UAT",
            },
        ]);

        expect(inspection.customFieldOptions.Type).toEqual([
            "Regression",
            "UAT",
        ]);
        expect(inspection.folderExamples).toContain("/Smoke");
    });

    it("formats upsert create result with wdio next step", () => {
        const text = formatUpsertResult({
            action: "created",
            host: "https://jira.example.com",
            wdioItTitle: "Banner visible",
            testCase: {
                key: "PROJ-T999",
                name: "Banner visible",
                projectKey: "PROJ",
                testScript: {
                    type: "STEP_BY_STEP",
                    steps: [{ description: "Step 1" }],
                },
            },
        });

        expect(text).toContain("PROJ-T999");
        expect(text).toContain("it('Banner visible #PROJ-T999'");
    });
});
