#!/bin/zsh
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo 'Node.js 20 이상이 필요합니다. https://nodejs.org 에서 설치한 뒤 다시 실행하세요.'
  read -k 1
  exit 1
fi
node server.mjs --open
