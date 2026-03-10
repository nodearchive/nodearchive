[![npm version](https://img.shields.io/npm/v/@nodearchive/nodearchive)](https://www.npmjs.com/package/@nodearchive/nodearchive)
[![CI](https://github.com/nodearchive/nodearchive/actions/workflows/ci.yaml/badge.svg?branch=master)](https://github.com/nodearchive/nodearchive/actions/workflows/ci.yaml)
[![codecov](https://codecov.io/gh/nodearchive/nodearchive/branch/master/graph/badge.svg)](https://codecov.io/gh/nodearchive/nodearchive)
[![license](https://img.shields.io/npm/l/@nodearchive/nodearchive)](LICENSE)

# nodearchive

`nodearchive` packs and unpacks `.nar`, `.zip`, `.tar`, `.tgz`, `.tar.gz`, and
`.gz` from one ESM API and the `nar` CLI. Use it when a JavaScript build,
release, or vendor-import flow needs one archive surface instead of a stack of
one-format tools.

## Install

```sh
npm install @nodearchive/nodearchive
pnpm add @nodearchive/nodearchive
yarn add @nodearchive/nodearchive
bun add @nodearchive/nodearchive
```

Global CLI:

```sh
npm install --global @nodearchive/nodearchive
# or
bun add --global @nodearchive/nodearchive
```

Run once without a global install:

```sh
npx @nodearchive/nodearchive pack --help
bunx @nodearchive/nodearchive unpack --help
```

## Quick start

CLI:

```sh
npm i -g @nodearchive/nodearchive
nar --help

nar pack ./src ./app.nar
nar unpack ./incoming.zip ./vendor
```

Code:

```js
import { pack, unpack } from '@nodearchive/nodearchive'

await pack({ literalPath: ['src'], destinationPath: './app.nar' })
await unpack({ path: './incoming.zip', destinationPath: './vendor' })
```

## Formats and runtime support

- Writes: `.nar`, `.zip`, `.tar`, `.tgz`, `.tar.gz`, and `.gz`
- Reads: `.nar`, `.zip`, `.tar`, `.tgz`, `.tar.gz`, and `.gz`
- Runtimes: Node >= 18 and Bun
- Module format: ESM-only package, `nar` CLI
- Inputs: glob paths, exact paths, and in-memory bytes
- Outputs: filesystem writes or memory return values

## Examples

### Filesystem output

```js
import { pack, unpack } from '@nodearchive/nodearchive'

await pack({
  literalPath: ['src', 'package.json'],
  destinationPath: './dist/app.nar',
  force: true,
})

await unpack({
  path: './dist/app.nar',
  destinationPath: './out',
  force: true,
})
```

### In-memory bytes

```js
import { pack, unpack } from '@nodearchive/nodearchive'

const archive = await pack({ blob: 'hello world' })
const restored = await unpack({ blob: archive })

console.log(Buffer.from(restored).toString('utf8'))
```

### Alternative output formats

```js
import { pack } from '@nodearchive/nodearchive'

await pack({
  literalPath: ['src'],
  destinationPath: './dist/app.zip',
  outFormat: 'zip',
})

await pack({
  literalPath: ['src'],
  destinationPath: './dist/app.tgz',
})
```

### Incoming zip or tarball

```js
import { unpack } from '@nodearchive/nodearchive'

await unpack({
  path: './vendor/release.tar.gz',
  destinationPath: './vendor/release',
  force: true,
})
```

### CLI

```sh
nar pack ./src ./dist/app.nar --passThru
nar pack ./src ./dist/app.zip --outFormat zip --passThru
nar unpack ./dist/app.nar ./out --force --passThru
nar unpack ./incoming.zip ./out --force
nar pack --help
npx @nodearchive/nodearchive pack --help
bunx @nodearchive/nodearchive unpack --help
```

## Behavior

- `pack()` writes `.nar`, `.zip`, `.tar`, `.tgz`, `.tar.gz`, and `.gz`.
- `unpack()` reads `.nar`, `.zip`, `.tar`, `.tgz`, `.tar.gz`, and `.gz`.
- `outFormat` selects the output archive type. `destinationPath` also infers the format from supported extensions.
- `.gz` output is limited to a single input. `update` is limited to native `.nar` output.
- In-memory mode accepts strings, blobs, typed arrays, `ArrayBuffer`, and `SharedArrayBuffer`.
- `path` uses glob expansion through `fast-glob`; `literalPath` stays exact.
- Validation failures throw `NodearchiveError` codes such as
  `ARCHIVE_INPUT_REQUIRED`, `ARCHIVE_INVALID_FORMAT`,
  `ARCHIVE_DESTINATION_EXISTS`, and `ARCHIVE_ENTRY_PATH_INVALID`.
- Unsafe extraction paths and unsupported entry types are rejected instead of being silently rewritten.

## Reference

- Landing page: <https://nodearchive.github.io/nodearchive/>
- In-depth guide: <https://nodearchive.github.io/nodearchive/in-depth/>
- Coverage report: <https://nodearchive.github.io/nodearchive/coverage/>

## Quality signals

- Suite: unit + integration (Node), E2E (Playwright), Bun smoke
- Matrix: Node 18 / 20 / 22; Chromium / Firefox / WebKit plus mobile emulation
- Coverage: c8 at 100% statements, branches, functions, and lines
- Reports: `coverage/lcov.info` and `coverage/index.html`

## Benchmarks

Command: `npm run bench`
Environment: Node `v22.14.0` on `win32 x64`

| Benchmark        | Result                       |
| ---------------- | ---------------------------- |
| `pack blob`      | `3,170.28 ops/s (126.17 ms)` |
| `unpack blob`    | `3,306.20 ops/s (120.98 ms)` |
| `pack directory` | `309.35 ops/s (387.91 ms)`   |
| `unpack archive` | `4,109.76 ops/s (29.20 ms)`  |

Results vary by machine.

## License

Apache-2.0
