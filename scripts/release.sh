#!/bin/bash
# scripts/release.sh
# Production Release Automation Script
# Usage: ./release.sh [patch|minor|major]

set -e

BUMP_TYPE=$1

if [[ -z "$BUMP_TYPE" ]]; then
  echo "❌ Error: Please specify release type (patch, minor, major)"
  echo "Usage: ./release.sh patch"
  exit 1
fi

echo "🚀 Starting Production Release Process ($BUMP_TYPE)..."

# 1. Ensure working directory is clean
if [[ -n $(git status -s) ]]; then
  echo "❌ Error: Your Git working directory is not clean. Commit or stash changes before releasing."
  exit 1
fi

# 2. Ensure we are on the main branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" ]]; then
  echo "❌ Error: You must be on 'main' or 'master' branch to release."
  exit 1
fi

# 3. Pull latest changes
echo "⬇️ Pulling latest changes from remote..."
git pull origin $CURRENT_BRANCH

# 4. Bump npm version (updates package.json and package-lock.json without committing yet)
echo "📦 Bumping version via npm..."
npm version $BUMP_TYPE --no-git-tag-version

NEW_VERSION=$(node -p "require('./package.json').version")
echo "✅ Bumped to version v$NEW_VERSION"

# 5. Generate Changelog Entry
# In a fully automated enterprise environment, you'd use 'conventional-changelog'
# We are appending a standard header for the team to fill out or auto-populate from commits
echo "📝 Updating CHANGELOG.md..."
if [ ! -f CHANGELOG.md ]; then
  echo "# Changelog" > CHANGELOG.md
fi

TEMP_FILE=$(mktemp)
echo "## [$NEW_VERSION] - $(date +%Y-%m-%d)" > "$TEMP_FILE"
echo "" >> "$TEMP_FILE"
echo "### Added" >> "$TEMP_FILE"
echo "- (Add new features here)" >> "$TEMP_FILE"
echo "### Changed" >> "$TEMP_FILE"
echo "- " >> "$TEMP_FILE"
echo "### Fixed" >> "$TEMP_FILE"
echo "- " >> "$TEMP_FILE"
echo "" >> "$TEMP_FILE"

cat CHANGELOG.md >> "$TEMP_FILE"
mv "$TEMP_FILE" CHANGELOG.md

# 6. Git Commit and Tag
echo "💾 Committing source and creating Git Tag..."
git add package.json CHANGELOG.md
# Add package-lock.json or pnpm-lock.yaml if they exist and are modified
if [ -f package-lock.json ]; then git add package-lock.json; fi
if [ -f pnpm-lock.yaml ]; then git add pnpm-lock.yaml; fi

git commit -m "chore(release): v$NEW_VERSION [skip ci]"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

echo "============================================="
echo "🎉 Release v$NEW_VERSION staged successfully!"
echo "============================================="
echo "Next steps:"
echo "1. Review CHANGELOG.md and edit the placeholder bullet points."
echo "2. Run 'git commit --amend' if you changed the changelog."
echo "3. Run 'git push --follow-tags' to trigger the CI/CD deployment pipeline."
