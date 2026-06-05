import {
    buildInsightAssetUrl,
    extractInsightObjectKey,
    formatInsightObject,
    formatInsightSearchResults,
} from "../../src/utils/insight-utils.js";

describe("insight-utils", () => {
    describe("extractInsightObjectKey", () => {
        it("extracts key from Insight asset URL", () => {
            expect(
                extractInsightObjectKey(
                    "https://jira.skyeng.link/secure/insight/assets/INFRA-1097573",
                ),
            ).toEqual({ kind: "key", value: "INFRA-1097573" });
        });

        it("accepts object key directly", () => {
            expect(extractInsightObjectKey("infra-1097573")).toEqual({
                kind: "key",
                value: "INFRA-1097573",
            });
        });

        it("accepts numeric object id", () => {
            expect(extractInsightObjectKey("1097573")).toEqual({
                kind: "id",
                value: "1097573",
            });
        });

        it("throws for invalid identifier", () => {
            expect(() => extractInsightObjectKey("not-valid")).toThrow(
                "Invalid Insight asset identifier",
            );
        });
    });

    describe("buildInsightAssetUrl", () => {
        it("builds asset URL from host and key", () => {
            expect(
                buildInsightAssetUrl(
                    "https://jira.skyeng.link",
                    "INFRA-1097573",
                ),
            ).toBe(
                "https://jira.skyeng.link/secure/insight/assets/INFRA-1097573",
            );
        });
    });

    describe("formatInsightObject", () => {
        it("formats object with attributes and references", () => {
            const formatted = formatInsightObject(
                {
                    id: 1097573,
                    label: "Growth",
                    objectKey: "INFRA-1097573",
                    objectType: { name: "Team" },
                    created: "2025-01-17T12:53:49.460Z",
                    updated: "2026-04-30T14:35:09.781Z",
                    attributes: [
                        {
                            objectTypeAttribute: { name: "Status" },
                            objectAttributeValues: [
                                { displayValue: "Active" },
                            ],
                        },
                        {
                            objectTypeAttribute: { name: "Slack" },
                            objectAttributeValues: [
                                { displayValue: "#kf-dev" },
                            ],
                        },
                        {
                            objectTypeAttribute: { name: "Manager" },
                            objectAttributeValues: [
                                {
                                    referencedObject: {
                                        id: 15712,
                                        label: "m.samarkin",
                                        objectKey: "INFRA-15712",
                                    },
                                },
                            ],
                        },
                    ],
                },
                "https://jira.skyeng.link",
            );

            expect(formatted).toContain("# Growth");
            expect(formatted).toContain("**Key:** INFRA-1097573");
            expect(formatted).toContain("**Type:** Team");
            expect(formatted).toContain("**Status:** Active");
            expect(formatted).toContain("**Slack:** #kf-dev");
            expect(formatted).toContain(
                "**Manager:** m.samarkin (INFRA-15712)",
            );
        });
    });

    describe("formatInsightSearchResults", () => {
        it("returns empty-state message", () => {
            expect(
                formatInsightSearchResults(
                    { objectEntries: [] },
                    "https://jira.skyeng.link",
                    'IQL: Name = "Missing"',
                ),
            ).toBe('No Insight assets found for: IQL: Name = "Missing"');
        });

        it("formats search result list", () => {
            const formatted = formatInsightSearchResults(
                {
                    objectEntries: [
                        {
                            id: 1,
                            label: "Growth",
                            objectKey: "INFRA-1097573",
                            objectType: { name: "Team" },
                        },
                    ],
                    totalFilterCount: 1,
                },
                "https://jira.skyeng.link",
                'IQL: Key = "INFRA-1097573"',
            );

            expect(formatted).toContain("Found 1 asset(s)");
            expect(formatted).toContain("**Growth** (INFRA-1097573)");
            expect(formatted).toContain("Type: Team");
        });
    });
});
