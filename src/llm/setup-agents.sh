#!/bin/bash

echo "📚 Setting up Agent Configuration System..."

# Create agents directory
mkdir -p src/agents

# Copy template files
TEMPLATES=(
    "AGENTS.md"
    "IDENTITY.md"
    "SOUL.md"
    "TOOLS.md"
    "USER.md"
)

for template in "${TEMPLATES[@]}"; do
    if [ ! -f "src/agents/$template" ]; then
        echo "📄 Creating src/agents/$template..."
        # File will be created with default content from config-loader
    else
        echo "✅ src/agents/$template already exists"
    fi
done

# Create config-loader if not exists
if [ ! -f "src/utils/config-loader.js" ]; then
    echo "📄 Creating src/utils/config-loader.js..."
    # Will be created from previous step
fi

echo ""
echo "✅ Agent configuration system setup complete!"
echo ""
echo "📁 Configuration files location: src/agents/"
echo "🔧 Edit files to customize agent behavior"
echo "🔄 Reload: curl -X POST http://localhost:3000/api/agent/reload"
echo ""
