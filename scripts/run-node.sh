#!/bin/sh
# Bundle a Node script with esbuild before running it: several Strudel
# dependencies only resolve correctly through their "module" field.
set -e
script="$1"; shift
out="node_modules/.cache/run-node/$(basename "$script" .mjs).bundle.mjs"
mkdir -p "$(dirname "$out")"
npx esbuild "$script" --bundle --platform=node --format=esm --main-fields=module,main \
  --outfile="$out" --log-level=warning \
  --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
node "$out" "$@"
