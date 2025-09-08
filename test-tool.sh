#!/bin/bash

# Универсальный скрипт для тестирования MCP инструментов
# Использование: ./test-tool.sh <tool-name> '<json-arguments>'
# Пример: ./test-tool.sh read-description '{"issueKey": "VIM-27658"}'

if [ $# -ne 2 ]; then
    echo "Использование: $0 <tool-name> '<json-arguments>'"
    echo "Пример: $0 read-description '{\"issueKey\": \"VIM-27658\"}'"
    exit 1
fi

TOOL_NAME="$1"
ARGUMENTS="$2"

echo "🔨 Сборка проекта..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Ошибка сборки!"
    exit 1
fi

echo "🧪 Тестирование инструмента: $TOOL_NAME"
echo "📋 Аргументы: $ARGUMENTS"
echo "─────────────────────────────────────"

# Создаем JSON для MCP
JSON_REQUEST="{\"jsonrpc\": \"2.0\", \"id\": 1, \"method\": \"tools/call\", \"params\": {\"name\": \"$TOOL_NAME\", \"arguments\": $ARGUMENTS}}"

echo "$JSON_REQUEST" | node build/index.js
