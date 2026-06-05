import {
    withZephyrNotes,
    ZEPHYR_PROJECT_KEY_NOTE,
    ZEPHYR_REST_ONLY_NOTE,
} from "../../src/utils/zephyr-tool-notes.js";

describe("zephyr-tool-notes", () => {
    it("includes REST-only guidance in composed descriptions", () => {
        const description = withZephyrNotes(
            "Find cases.",
            ZEPHYR_REST_ONLY_NOTE,
            ZEPHYR_PROJECT_KEY_NOTE,
        );

        expect(description).toContain("Do not WebFetch or curl Tests.jspa URLs");
        expect(description).toContain("projectId=… is UI navigation only");
        expect(description.startsWith("Find cases.")).toBe(true);
    });
});
