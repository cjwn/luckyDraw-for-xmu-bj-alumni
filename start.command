#!/bin/zsh

cd "/Users/jiaweichen/Documents/CodexPlayground/抽奖" || exit 1

PORT=8000

python3 -m http.server "$PORT"
