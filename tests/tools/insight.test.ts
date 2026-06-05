import axios from "axios";
import nock from "nock";
import {
    getInsightAssetHandler,
} from "../../src/tools/insight/get-insight-asset.js";
import {
    searchInsightAssetsHandler,
} from "../../src/tools/insight/search-insight-assets.js";

describe("Insight Tools", () => {
    const mockConfig = {
        host: "https://jira.skyeng.link",
        username: "test@example.com",
        password: "",
        apiToken: "test-api-token",
    };

    let insightClient: ReturnType<typeof axios.create>;

    beforeEach(() => {
        insightClient = axios.create({
            baseURL: `${mockConfig.host}/rest/insight/1.0`,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: "Bearer test-api-token",
            },
            timeout: 15000,
        });

        nock.cleanAll();
    });

    afterEach(() => {
        nock.cleanAll();
        jest.clearAllMocks();
    });

    describe("getInsightAssetHandler", () => {
        it("fetches asset by object key via IQL and object endpoint", async () => {
            nock("https://jira.skyeng.link")
                .get("/rest/insight/1.0/iql/objects")
                .query({
                    iql: 'Key = "INFRA-1097573"',
                    resultPerPage: 1,
                })
                .reply(200, {
                    objectEntries: [
                        {
                            id: 1097573,
                            label: "Growth",
                            objectKey: "INFRA-1097573",
                        },
                    ],
                })
                .get("/rest/insight/1.0/object/1097573")
                .reply(200, {
                    id: 1097573,
                    label: "Growth",
                    objectKey: "INFRA-1097573",
                    objectType: { name: "Team" },
                    attributes: [
                        {
                            objectTypeAttribute: { name: "Status" },
                            objectAttributeValues: [
                                { displayValue: "Active" },
                            ],
                        },
                    ],
                });

            const handler = getInsightAssetHandler(insightClient, mockConfig);
            const result = await handler({
                objectKeyOrUrl: "INFRA-1097573",
            });

            expect(result.content[0].text).toContain("# Growth");
            expect(result.content[0].text).toContain("**Status:** Active");
        });

        it("fetches asset directly by numeric id", async () => {
            nock("https://jira.skyeng.link")
                .get("/rest/insight/1.0/object/1097573")
                .reply(200, {
                    id: 1097573,
                    label: "Growth",
                    objectKey: "INFRA-1097573",
                    objectType: { name: "Team" },
                    attributes: [],
                });

            const handler = getInsightAssetHandler(insightClient, mockConfig);
            const result = await handler({ objectKeyOrUrl: "1097573" });

            expect(result.content[0].text).toContain("INFRA-1097573");
        });

        it("returns not found message when key is missing", async () => {
            nock("https://jira.skyeng.link")
                .get("/rest/insight/1.0/iql/objects")
                .query({
                    iql: 'Key = "INFRA-9999999"',
                    resultPerPage: 1,
                })
                .reply(200, { objectEntries: [] });

            const handler = getInsightAssetHandler(insightClient, mockConfig);
            const result = await handler({
                objectKeyOrUrl: "INFRA-9999999",
            });

            expect(result.content[0].text).toContain("Insight asset not found");
        });
    });

    describe("searchInsightAssetsHandler", () => {
        it("searches assets by IQL", async () => {
            nock("https://jira.skyeng.link")
                .get("/rest/insight/1.0/iql/objects")
                .query({
                    iql: 'Name = "Growth"',
                    resultPerPage: 20,
                })
                .reply(200, {
                    objectEntries: [
                        {
                            id: 1097573,
                            label: "Growth",
                            objectKey: "INFRA-1097573",
                            objectType: { name: "Team" },
                        },
                    ],
                    totalFilterCount: 1,
                });

            const handler = searchInsightAssetsHandler(
                insightClient,
                mockConfig,
            );
            const result = await handler({
                iql: 'Name = "Growth"',
                maxResults: 20,
            });

            expect(result.content[0].text).toContain("Found 1 asset(s)");
            expect(result.content[0].text).toContain("**Growth** (INFRA-1097573)");
        });
    });
});
