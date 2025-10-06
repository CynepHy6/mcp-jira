// Тесты реальных функций работы с датами из src/date-utils.ts

import {
    daysAgo,
    formatDate,
    formatDuration,
    getDateRange,
    getDateRangeByDays,
} from "../../src/utils/date-utils.js";

describe("Date Utilities", () => {
    describe("formatDate", () => {
        it("should format date in YYYY-MM-DD format", () => {
            const date = new Date("2025-01-15T10:30:00Z");
            expect(formatDate(date)).toBe("2025-01-15");
        });

        it("should handle different time zones consistently", () => {
            const date = new Date("2025-12-31T23:59:59Z");
            expect(formatDate(date)).toBe("2025-12-31");
        });
    });

    describe("daysAgo", () => {
        it("should calculate date N days ago", () => {
            const today = new Date();
            const weekAgo = daysAgo(7);

            const diffTime = Math.abs(today.getTime() - weekAgo.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            expect(diffDays).toBe(7);
        });

        it("should handle zero days", () => {
            const today = new Date();
            const sameDay = daysAgo(0);

            expect(formatDate(today)).toBe(formatDate(sameDay));
        });
    });

    describe("getDateRange", () => {
        it("should calculate week date range", () => {
            const { startDate, endDate } = getDateRange("week");
            const start = new Date(startDate);
            const end = new Date(endDate);

            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            expect(diffDays).toBe(7);
        });

        it("should calculate month date range", () => {
            const { startDate, endDate } = getDateRange("month");
            const start = new Date(startDate);
            const end = new Date(endDate);

            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            expect(diffDays).toBe(30);
        });

        it("should calculate 3months date range", () => {
            const { startDate, endDate } = getDateRange("3months");
            const start = new Date(startDate);
            const end = new Date(endDate);

            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            expect(diffDays).toBe(90);
        });

        it("should handle unknown period", () => {
            const { startDate, endDate } = getDateRange("unknown");
            expect(startDate).toBe(endDate);
        });

        it("should format dates correctly", () => {
            const { startDate, endDate } = getDateRange("week");

            expect(startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    describe("formatDuration", () => {
        it("should format hours correctly", () => {
            expect(formatDuration(7200)).toBe("2h"); // 2 hours
            expect(formatDuration(3600)).toBe("1h"); // 1 hour
        });

        it("should format minutes correctly", () => {
            expect(formatDuration(1800)).toBe("30m"); // 30 minutes
            expect(formatDuration(600)).toBe("10m"); // 10 minutes
        });

        it("should format days correctly", () => {
            expect(formatDuration(28800)).toBe("1d"); // 8 hours = 1 day
            expect(formatDuration(57600)).toBe("2d"); // 16 hours = 2 days
        });

        it("should format combined durations", () => {
            expect(formatDuration(32400)).toBe("1d 1h"); // 9 hours = 1 day 1 hour
            expect(formatDuration(30600)).toBe("1d 30m"); // 8.5 hours = 1 day 30 minutes
        });

        it("should handle zero duration", () => {
            expect(formatDuration(0)).toBe("0m");
        });

        it("should handle complex durations", () => {
            expect(formatDuration(34200)).toBe("1d 1h 30m"); // 9.5 hours
        });
    });

    describe("getDateRangeByDays", () => {
        it("should calculate range by days from today", () => {
            const { startDate, endDate } = getDateRangeByDays(7);
            const start = new Date(startDate);
            const end = new Date(endDate);

            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            expect(diffDays).toBe(7);
        });

        it("should calculate range from specific end date", () => {
            const { startDate, endDate } = getDateRangeByDays(30, "2025-01-31");

            expect(endDate).toBe("2025-01-31");
            expect(startDate).toBe("2025-01-01");
        });

        it("should handle single day", () => {
            const { startDate, endDate } = getDateRangeByDays(0, "2025-01-15");

            expect(startDate).toBe("2025-01-15");
            expect(endDate).toBe("2025-01-15");
        });
    });
});
