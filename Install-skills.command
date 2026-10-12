#!/bin/zsh
cd "$(dirname "$0")"
node scripts/install-skills.mjs
read -k 1
