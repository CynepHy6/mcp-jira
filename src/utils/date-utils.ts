// Утилиты для работы с датами и временем

export function formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
}

export function daysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
}

export function getDateRange(period: string): {
    startDate: string;
    endDate: string;
} {
    const today = new Date();
    const endDate = formatDate(today);

    let startDate: string;
    switch (period) {
        case "week":
            startDate = formatDate(daysAgo(7));
            break;
        case "month":
            startDate = formatDate(daysAgo(30));
            break;
        case "3months":
            startDate = formatDate(daysAgo(90));
            break;
        case "6months":
            startDate = formatDate(daysAgo(180));
            break;
        case "year":
            startDate = formatDate(daysAgo(365));
            break;
        default:
            startDate = endDate;
    }

    return { startDate, endDate };
}

export function formatDuration(seconds: number): string {
    const days = Math.floor(seconds / (8 * 3600)); // 8-час рабочий день
    const hours = Math.floor((seconds % (8 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.join(" ") || "0m";
}

export function getDateRangeByDays(
    days: number,
    endDate?: string
): { startDate: string; endDate: string } {
    const end = endDate ? new Date(endDate) : new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

    return {
        startDate: formatDate(start),
        endDate: formatDate(end),
    };
}
