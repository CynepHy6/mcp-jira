import axios, { AxiosInstance } from "axios";
import { getJiraConfig, JiraConfig } from "./jira-client.js";

const resolveHost = (host: string): string => {
    if (host.includes("://")) {
        return new URL(host).href.replace(/\/$/, "");
    }
    return `https://${host}`;
};

export const createZephyrClient = (config: JiraConfig): AxiosInstance => {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
    };

    if (config.apiToken) {
        headers.Authorization = `Bearer ${config.apiToken}`;
    } else if (config.password) {
        const authString = Buffer.from(
            `${config.username}:${config.password}`,
        ).toString("base64");
        headers.Authorization = `Basic ${authString}`;
    } else {
        throw new Error(
            "No authentication method configured for Zephyr. Please set JIRA_PASSWORD or JIRA_API_TOKEN",
        );
    }

    return axios.create({
        baseURL: `${resolveHost(config.host)}/rest/atm/1.0`,
        headers,
        timeout: 30000,
    });
};

export const createConfiguredZephyrClient = (): AxiosInstance =>
    createZephyrClient(getJiraConfig());
