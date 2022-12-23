#!/usr/bin/env bash
set -euo pipefail

# only run if we're not in github actions and we're not setting the $SKIP_BUMP variable
if [ -z "${CI:-}" ] && [ -z "${SKIP_BUMP:-}" ]; then

  # If we're running on macOS, we need to use the GNU version of sed
  if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! command -v gsed &>/dev/null; then
      # check brew is installed
      if ! command -v brew &>/dev/null; then
        echo "brew is not installed, it's amazing you can even use macOS without it, please install it from https://brew.sh/"
        exit 1
      fi
      echo "Installing GNU sed (gsed)"
      brew install gnu-sed
    fi
    SED=gsed
  fi

  # Get the current version from the latest (non-beta) tag
  CURRENT_VERSION=$(git describe --abbrev=0 --tags | sed -E 's/^v//g')

  # Set NEW_VERSION to the current version + 1 (which will only be an approximate as tagging is done externally, but better than never updating).
  NEW_VERSION=$(echo "$CURRENT_VERSION" | awk -F. -v OFS=. '{$NF++; print}')

  # Align the package.json versions with the git tag version + .1
  $SED -i'' -E 's/("version": ")([^"]+)/\1'"${NEW_VERSION}"'/g' package.json

  # Update the package-lock.json with the new package version
  npm i --package-lock-only

  git add package.json package-lock.json

  echo "Updated the version in package.json, and package-lock.json from ${CURRENT_VERSION} to ${NEW_VERSION} and staged for commit."

fi
