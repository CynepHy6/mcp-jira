/** Appended to every Zephyr MCP tool description (visible to the agent in tool schema). */
export const ZEPHYR_REST_ONLY_NOTE = "Do not WebFetch or curl Tests.jspa URLs: Zephyr UI requires an authenticated Jira browser session (anonymous HTTP returns 503). Use Zephyr REST tools in this MCP server instead.";
/** For tools that accept projectKey or resolve projects. */
export const ZEPHYR_PROJECT_KEY_NOTE = "Tests.jspa#/v2/testCases?projectId=… is UI navigation only; pass projectKey (e.g. test-wdio --qaseProject), not numeric projectId alone.";
export const withZephyrNotes = (base, ...notes) => `${base} ${notes.join(" ")}`.trim();
