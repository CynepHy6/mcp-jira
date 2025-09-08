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
    epicStories: RelatedIssue[]; // Все истории эпика
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
 * Ищет все истории (Stories) эпика через JQL поиск
 */
async function searchEpicStories(
    jira: Version2Client,
    epicKey: string,
    host: string
): Promise<RelatedIssue[]> {
    try {
        // Пробуем разные варианты поиска по Epic Link
        const jqlQueries = [
            `"Epic Link" = ${epicKey}`,
            `cf[10014] = ${epicKey}`, // customfield_10014
            `cf[10006] = ${epicKey}`, // customfield_10006
            `project = ${epicKey.split("-")[0]} AND text ~ "${epicKey}"`, // Поиск по тексту в проекте
        ];

        for (const jql of jqlQueries) {
            try {
                const searchResults =
                    await jira.issueSearch.searchForIssuesUsingJql({
                        jql: jql,
                        fields: [
                            "key",
                            "summary",
                            "status",
                            "issuetype",
                            "priority",
                        ],
                        maxResults: 50,
                        startAt: 0,
                    });

                if (searchResults.issues && searchResults.issues.length > 0) {
                    return searchResults.issues.map((issue: any) =>
                        convertToRelatedIssue(issue, host)
                    );
                }
            } catch (error) {
                console.error(`JQL query failed: ${jql}`, error);
                continue; // Пробуем следующий запрос
            }
        }

        return [];
    } catch (error) {
        console.error("Error searching epic stories:", error);
        return [];
    }
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
        epicStories: [],
    };

    // Родительская задача (получаем с подзадачами сразу)
    let parentIssueWithSubtasks: any = null;
    if (issue.fields?.parent) {
        structure.parent = convertToRelatedIssue(issue.fields.parent, host);

        // Получаем полную информацию о родительской задаче с подзадачами
        try {
            parentIssueWithSubtasks = await jira.issues.getIssue({
                issueIdOrKey: structure.parent.key,
                expand: ["subtasks"],
                fields: ["subtasks", "*all"],
            });
        } catch (error) {
            console.error("Error fetching parent with subtasks:", error);
        }
    }

    // Подзадачи
    if (issue.fields?.subtasks && Array.isArray(issue.fields.subtasks)) {
        structure.subtasks = issue.fields.subtasks.map((subtask: any) =>
            convertToRelatedIssue(subtask, host)
        );
    }

    // Поиск эпика через поля текущей задачи или родительской
    let epicField = findEpicField(issue.fields);

    // Если эпик не найден в текущей задаче, ищем в родительской
    if (!epicField && parentIssueWithSubtasks) {
        epicField = findEpicField(parentIssueWithSubtasks.fields);
    }

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
            } else if (epicField.epicName) {
                // Найдено название эпика, ищем по названию через JQL
                const projectKey =
                    issue.fields?.project?.key || issueKey.split("-")[0];
                const searchResults =
                    await jira.issueSearch.searchForIssuesUsingJql({
                        jql: `project = "${projectKey}" AND issuetype = Epic AND summary ~ "${epicField.epicName}"`,
                        fields: [
                            "key",
                            "summary",
                            "status",
                            "issuetype",
                            "priority",
                        ],
                        maxResults: 1,
                        startAt: 0,
                    });

                if (searchResults.issues && searchResults.issues.length > 0) {
                    structure.epic = convertToRelatedIssue(
                        searchResults.issues[0],
                        host
                    );
                }
            }
        } catch (error) {
            console.error("Error fetching epic:", error);
        }
    }

    // Эпик не найден - это нормально для задач без эпика

    // Если найден эпик, получаем все его истории
    if (structure.epic) {
        try {
            const epicStories = await searchEpicStories(
                jira,
                structure.epic.key,
                host
            );
            // Показываем все истории эпика, исключая только текущую задачу
            structure.epicStories = epicStories.filter(
                (story) => story.key !== structure.current.key
            );
        } catch (error) {
            console.error("Error fetching epic stories:", error);
        }
    }

    // Получаем подзадачи родительской задачи (сиблинги) из уже загруженных данных
    if (
        parentIssueWithSubtasks?.fields?.subtasks &&
        Array.isArray(parentIssueWithSubtasks.fields.subtasks)
    ) {
        structure.siblings = parentIssueWithSubtasks.fields.subtasks
            .filter((subtask: any) => subtask.key !== issueKey) // Исключаем текущую задачу
            .map((subtask: any) => convertToRelatedIssue(subtask, host));
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
        "customfield_10007", // Epic Name
        "epic",
        "epicLink",
    ];

    for (const fieldName of epicFields) {
        const fieldValue = fields[fieldName];
        if (fieldValue) {
            // Найдено поле эпика

            // Если это Epic Name, нужно найти соответствующий эпик
            if (
                fieldName === "customfield_10007" &&
                typeof fieldValue === "string"
            ) {
                // Возвращаем название эпика для дальнейшего поиска
                return { epicName: fieldValue };
            }

            return fieldValue;
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

        // Показываем все истории эпика
        if (structure.epicStories.length > 0) {
            result += `\n#### 📚 **Истории эпика** (${structure.epicStories.length})\n`;
            structure.epicStories.forEach((story, index) => {
                const statusIcon = getStatusIcon(story.status);
                result += `${index + 1}. **[${story.key}: ${story.summary}](${
                    story.url
                })**\n`;
                result += `   - **Статус:** ${statusIcon} ${story.status} | **Тип:** ${story.type}\n`;
            });
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
