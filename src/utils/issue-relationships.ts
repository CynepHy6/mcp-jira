import { Version2Client } from "jira.js/version2";

export interface RelatedIssue {
    key: string;
    summary: string;
    status: string;
    type: string;
    url: string;
    priority?: string;
}

export interface IssueStructure {
    current: RelatedIssue;
    parent?: RelatedIssue;
    epic?: RelatedIssue;
    subtasks: RelatedIssue[];
    siblings: RelatedIssue[];
}

/**
 * Создает URL для тикета Jira
 */
function createJiraUrl(host: string, issueKey: string): string {
    // Убираем протокол если есть, добавляем https
    const cleanHost = host.replace(/^https?:\/\//, "");
    return `https://${cleanHost}/browse/${issueKey}`;
}

/**
 * Конвертирует Jira issue в RelatedIssue
 */
function convertToRelatedIssue(issue: any, host: string): RelatedIssue {
    return {
        key: issue.key,
        summary: issue.fields?.summary || "Без названия",
        status: issue.fields?.status?.name || "Неизвестно",
        type: issue.fields?.issuetype?.name || "Неизвестно",
        url: createJiraUrl(host, issue.key),
        priority: issue.fields?.priority?.name,
    };
}

/**
 * Получает полную структуру связанных задач для тикета
 */
export async function getIssueStructure(
    jira: Version2Client,
    issueKey: string,
    host: string
): Promise<IssueStructure> {
    // Получаем основной тикет с расширенными полями
    const issue = await jira.issues.getIssue({
        issueIdOrKey: issueKey,
        expand: ["parent", "subtasks", "issuelinks"],
        fields: ["*all"],
    });

    const current = convertToRelatedIssue(issue, host);
    const structure: IssueStructure = {
        current,
        subtasks: [],
        siblings: [],
    };

    // Родительская задача
    if (issue.fields?.parent) {
        structure.parent = convertToRelatedIssue(issue.fields.parent, host);
    }

    // Подзадачи
    if (issue.fields?.subtasks && Array.isArray(issue.fields.subtasks)) {
        structure.subtasks = issue.fields.subtasks.map((subtask: any) =>
            convertToRelatedIssue(subtask, host)
        );
    }

    // Поиск эпика и других связанных задач через поля
    // Epic Link может быть в customfield_10014 или других полях
    const epicField = findEpicField(issue.fields);
    if (epicField) {
        try {
            if (typeof epicField === "string") {
                // Epic key как строка
                const epicIssue = await jira.issues.getIssue({
                    issueIdOrKey: epicField,
                    fields: ["summary", "status", "issuetype", "priority"],
                });
                structure.epic = convertToRelatedIssue(epicIssue, host);
            } else if (epicField.key) {
                // Epic как объект
                structure.epic = convertToRelatedIssue(epicField, host);
            }
        } catch (error) {
            console.error("Error fetching epic:", error);
        }
    }

    // Если есть родительская задача, получим её подзадачи (сиблинги)
    if (structure.parent) {
        try {
            const parentIssue = await jira.issues.getIssue({
                issueIdOrKey: structure.parent.key,
                expand: ["subtasks"],
                fields: ["subtasks"],
            });

            if (
                parentIssue.fields?.subtasks &&
                Array.isArray(parentIssue.fields.subtasks)
            ) {
                structure.siblings = parentIssue.fields.subtasks
                    .filter((subtask: any) => subtask.key !== issueKey) // Исключаем текущую задачу
                    .map((subtask: any) =>
                        convertToRelatedIssue(subtask, host)
                    );
            }
        } catch (error) {
            console.error("Error fetching parent subtasks:", error);
        }
    }

    return structure;
}

/**
 * Ищет поле Epic Link в различных вариантах
 */
function findEpicField(fields: any): any {
    // Обычные варианты Epic Link полей
    const epicFields = [
        "customfield_10014", // Стандартное поле Epic Link
        "customfield_10006", // Альтернативный вариант
        "epic",
        "epicLink",
        "customfield_10200", // Еще один вариант
    ];

    for (const fieldName of epicFields) {
        if (fields[fieldName]) {
            return fields[fieldName];
        }
    }

    return null;
}

/**
 * Форматирует структуру связанных задач в читаемый вид
 */
export function formatIssueStructure(structure: IssueStructure): string {
    let result = `## 📋 Структура связанных задач\n\n`;

    // Эпик
    if (structure.epic) {
        result += `### 🎯 **ЭПИК**\n`;
        result += `**[${structure.epic.key}: ${structure.epic.summary}](${structure.epic.url})**\n`;
        result += `- **Тип:** ${structure.epic.type}\n`;
        result += `- **Статус:** ${structure.epic.status}\n`;
        if (structure.epic.priority) {
            result += `- **Приоритет:** ${structure.epic.priority}\n`;
        }
        result += `\n---\n\n`;
    }

    // Родительская задача
    if (structure.parent) {
        result += `### 📚 **РОДИТЕЛЬСКАЯ ЗАДАЧА**\n`;
        result += `**[${structure.parent.key}: ${structure.parent.summary}](${structure.parent.url})**\n`;
        result += `- **Тип:** ${structure.parent.type}\n`;
        result += `- **Статус:** ${structure.parent.status}\n`;
        if (structure.parent.priority) {
            result += `- **Приоритет:** ${structure.parent.priority}\n`;
        }
        result += `\n---\n\n`;
    }

    // Текущая задача
    result += `### 🎯 **ТЕКУЩАЯ ЗАДАЧА**\n`;
    result += `**[${structure.current.key}: ${structure.current.summary}](${structure.current.url})**\n`;
    result += `- **Тип:** ${structure.current.type}\n`;
    result += `- **Статус:** ${structure.current.status}\n`;
    if (structure.current.priority) {
        result += `- **Приоритет:** ${structure.current.priority}\n`;
    }

    // Сиблинги (другие подзадачи родительской задачи)
    if (structure.siblings.length > 0) {
        result += `\n### 🔗 **СВЯЗАННЫЕ ПОДЗАДАЧИ** (${structure.siblings.length})\n`;
        structure.siblings.forEach((sibling, index) => {
            const statusIcon = getStatusIcon(sibling.status);
            result += `${index + 1}. **[${sibling.key}: ${sibling.summary}](${
                sibling.url
            })**\n`;
            result += `   - **Статус:** ${statusIcon} ${sibling.status} | **Тип:** ${sibling.type}\n`;
        });
        result += `\n`;
    }

    // Подзадачи текущей задачи
    if (structure.subtasks.length > 0) {
        result += `### 🔧 **ПОДЗАДАЧИ** (${structure.subtasks.length})\n`;
        structure.subtasks.forEach((subtask, index) => {
            const statusIcon = getStatusIcon(subtask.status);
            result += `${index + 1}. **[${subtask.key}: ${subtask.summary}](${
                subtask.url
            })**\n`;
            result += `   - **Статус:** ${statusIcon} ${subtask.status} | **Тип:** ${subtask.type}\n`;
        });
    }

    return result;
}

/**
 * Возвращает иконку статуса
 */
function getStatusIcon(status: string): string {
    const lowerStatus = status.toLowerCase();

    if (
        lowerStatus.includes("готово") ||
        lowerStatus.includes("закрыт") ||
        lowerStatus.includes("done") ||
        lowerStatus.includes("closed")
    ) {
        return "✅";
    }
    if (
        lowerStatus.includes("работе") ||
        lowerStatus.includes("progress") ||
        lowerStatus.includes("разработ")
    ) {
        return "🔄";
    }
    if (lowerStatus.includes("review") || lowerStatus.includes("ревью")) {
        return "👁️";
    }
    if (lowerStatus.includes("release") || lowerStatus.includes("релиз")) {
        return "🚀";
    }
    if (lowerStatus.includes("test") || lowerStatus.includes("тест")) {
        return "🧪";
    }

    return "📋"; // По умолчанию
}
