import assert from 'node:assert/strict'
import { gzipSync } from 'node:zlib'
import {
  chmod,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import JSZip from 'jszip'
import tarStream from 'tar-stream'

import { NodearchiveError, pack, unpack } from '../../dist/index.js'
import { assertDirectoryPath } from '../../dist/.helpers/assertDirectoryPath/index.js'
import { normalizeBlobInput } from '../../dist/.helpers/normalizeBlobInput/index.js'
import { readArchive } from '../../dist/.helpers/readArchive/index.js'
import { toNodearchiveError } from '../../dist/.helpers/toNodearchiveError/index.js'
import { collectPathEntries } from '../../dist/pack/collectPathEntries/index.js'
import { readForeignArchive } from '../../dist/unpack/readForeignArchive/index.js'
import { readGzipArchive } from '../../dist/unpack/readGzipArchive/index.js'
import { readTarArchive } from '../../dist/unpack/readTarArchive/index.js'
import { readZipArchive } from '../../dist/unpack/readZipArchive/index.js'
import { gzipBytes } from '../../dist/pack/gzipBytes/index.js'
import { resolveOutputFormat } from '../../dist/pack/resolveOutputFormat/index.js'
import { writeArchive } from '../../dist/pack/writeArchive/index.js'
import { writeArchiveFile } from '../../dist/pack/writeArchiveFile/index.js'
import { writeOutputArchive } from '../../dist/pack/writeOutputArchive/index.js'
import { writeTarArchive } from '../../dist/pack/writeTarArchive/index.js'
import { materializeArchive } from '../../dist/unpack/materializeArchive/index.js'

test('public exports are available', () => {
  assert.equal(typeof pack, 'function')
  assert.equal(typeof unpack, 'function')
  const error = new NodearchiveError('ARCHIVE_INPUT_REQUIRED')
  assert.equal(error.name, 'NodearchiveError')
  assert.equal(error.code, 'ARCHIVE_INPUT_REQUIRED')
})

test('normalizeBlobInput normalizes supported inputs and rejects unsupported ones', async () => {
  assert.deepEqual(
    [...(await normalizeBlobInput('hello'))],
    [...Buffer.from('hello')]
  )
  assert.deepEqual(
    [...(await normalizeBlobInput(new Blob(['hello'])))],
    [...Buffer.from('hello')]
  )
  assert.deepEqual(
    [...(await normalizeBlobInput(new Uint8Array([1, 2, 3])))],
    [1, 2, 3]
  )
  assert.deepEqual(
    [...(await normalizeBlobInput(Uint8Array.from([4, 5]).buffer))],
    [4, 5]
  )

  if (typeof SharedArrayBuffer !== 'undefined') {
    const shared = new SharedArrayBuffer(2)
    const view = new Uint8Array(shared)
    view.set([6, 7])
    assert.deepEqual([...(await normalizeBlobInput(shared))], [6, 7])
  }

  await assert.rejects(
    () => normalizeBlobInput({}),
    (error) => {
      assert.equal(error.code, 'ARCHIVE_UNSUPPORTED_BLOB')
      return true
    }
  )
})

test('toNodearchiveError preserves explicit errors and wraps generic ones', () => {
  const explicit = new NodearchiveError('ARCHIVE_INVALID_FORMAT')
  assert.equal(toNodearchiveError(explicit, 'ARCHIVE_INPUT_REQUIRED'), explicit)

  const wrapped = toNodearchiveError(
    new Error('boom'),
    'ARCHIVE_SERIALIZATION_FAILED',
    'While testing'
  )

  assert.equal(wrapped.code, 'ARCHIVE_SERIALIZATION_FAILED')
  assert.match(wrapped.message, /While testing: boom/)
  assert.equal(wrapped.cause.message, 'boom')

  const fallback = toNodearchiveError(
    new Error('ignored'),
    'ARCHIVE_FILESYSTEM_READ_FAILED'
  )
  assert.equal(fallback.code, 'ARCHIVE_FILESYSTEM_READ_FAILED')

  const unknown = toNodearchiveError('boom', 'ARCHIVE_INVALID_FORMAT')
  assert.equal(unknown.code, 'ARCHIVE_INVALID_FORMAT')
})

test('assertDirectoryPath accepts missing paths and rejects blocked or invalid ones', async () => {
  const tempDir = await makeTempDir()

  try {
    await assertDirectoryPath(path.parse(tempDir).root)
    await assertDirectoryPath(path.join(tempDir, 'missing', 'nested'))

    await writeFile(path.join(tempDir, 'blocked'), 'x')

    await assert.rejects(
      () => assertDirectoryPath(path.join(tempDir, 'blocked', 'nested')),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_FILESYSTEM_WRITE_FAILED')
        assert.match(error.message, /blocked by a file/)
        return true
      }
    )

    await assert.rejects(
      () => assertDirectoryPath(path.join(tempDir, 'bad\u0000path')),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_FILESYSTEM_WRITE_FAILED')
        assert.match(error.message, /Failed to inspect path/)
        return true
      }
    )
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('writeArchiveFile validates dry runs and blocked destinations', async () => {
  const tempDir = await makeTempDir()
  const bytes = Uint8Array.from([1, 2, 3])

  try {
    const dryRunPath = path.join(tempDir, 'dry-run.nar')
    await writeArchiveFile(dryRunPath, bytes, false, true)
    await assert.rejects(() => readFile(dryRunPath))

    const existingPath = path.join(tempDir, 'existing.nar')
    await writeFile(existingPath, 'existing')
    await assert.rejects(
      () => writeArchiveFile(existingPath, bytes, false, true),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_DESTINATION_EXISTS')
        return true
      }
    )

    const blockedPath = path.join(tempDir, 'blocked.nar')
    await mkdir(blockedPath, { recursive: true })
    await assert.rejects(
      () => writeArchiveFile(blockedPath, bytes, true, true),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_FILESYSTEM_WRITE_FAILED')
        return true
      }
    )

    await assert.rejects(
      () =>
        writeArchiveFile(
          path.join(tempDir, 'bad\u0000path'),
          bytes,
          true,
          true
        ),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_FILESYSTEM_WRITE_FAILED')
        return true
      }
    )
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('writeArchive and readArchive round-trip manifests and validate payloads', async () => {
  const manifest = {
    entries: [
      {
        data: Buffer.from('hello').toString('base64'),
        kind: 'file',
        path: 'hello.txt',
      },
    ],
    format: '@nodearchive/nodearchive',
    version: 1,
  }

  const bytes = await writeArchive(manifest, 'NoCompression')
  const restored = await readArchive(bytes)
  assert.deepEqual(restored, manifest)

  const circular = {
    entries: [],
    format: '@nodearchive/nodearchive',
    version: 1,
  }
  circular.self = circular

  await assert.rejects(
    () => writeArchive(circular),
    (error) => {
      assert.equal(error.code, 'ARCHIVE_SERIALIZATION_FAILED')
      return true
    }
  )

  await assert.rejects(
    () => readArchive(Uint8Array.from([1, 2, 3])),
    (error) => {
      assert.equal(error.code, 'ARCHIVE_INVALID_FORMAT')
      return true
    }
  )

  const invalidHeader = gzipSync(
    Buffer.from(JSON.stringify({ format: 'bad', version: 1, entries: [] }))
  )
  await assert.rejects(
    () => readArchive(invalidHeader),
    (error) => {
      assert.equal(error.code, 'ARCHIVE_INVALID_FORMAT')
      return true
    }
  )

  const invalidEntry = gzipSync(
    Buffer.from(
      JSON.stringify({
        entries: [{ kind: 'file', path: 123 }],
        format: '@nodearchive/nodearchive',
        version: 1,
      })
    )
  )
  await assert.rejects(
    () => readArchive(invalidEntry),
    (error) => {
      assert.equal(error.code, 'ARCHIVE_INVALID_FORMAT')
      return true
    }
  )
})

test('resolveOutputFormat infers extensions, accepts aliases, and rejects invalid combinations', () => {
  assert.equal(resolveOutputFormat(), 'nar')
  assert.equal(resolveOutputFormat('bundle.zip'), 'zip')
  assert.equal(resolveOutputFormat('bundle.tgz'), 'tgz')
  assert.equal(resolveOutputFormat('bundle.tar.gz'), 'tar.gz')
  assert.equal(resolveOutputFormat(undefined, 'zip'), 'zip')
  assert.equal(resolveOutputFormat('bundle.tgz', 'tar.gz'), 'tar.gz')

  assert.throws(
    () => resolveOutputFormat('bundle.tar', 'zip'),
    (error) => {
      assert.equal(error.code, 'ARCHIVE_OUTPUT_FORMAT_INVALID')
      return true
    }
  )

  assert.throws(
    () => resolveOutputFormat(undefined, 'rar'),
    (error) => {
      assert.equal(error.code, 'ARCHIVE_OUTPUT_FORMAT_INVALID')
      return true
    }
  )
})

test('gzipBytes wraps compression failures', async (t) => {
  t.mock.method(Buffer, 'from', () => {
    throw new Error('boom')
  })

  await assert.rejects(
    () => gzipBytes(Uint8Array.from([1, 2, 3])),
    (error) => {
      assert.equal(error.code, 'ARCHIVE_SERIALIZATION_FAILED')
      assert.match(error.message, /Failed to encode gzip archive: boom/)
      return true
    }
  )
})

test('foreign archive readers normalize supported formats and reject unknown ones', async (t) => {
  t.mock.method(JSZip, 'loadAsync', async () => ({
    files: {
      root: {
        dir: true,
        name: '/',
        unixPermissions: null,
      },
      numeric: {
        async: async () => Uint8Array.from(Buffer.from('num')),
        dir: false,
        name: 'numeric.txt',
        unixPermissions: 0o100644,
      },
      string: {
        async: async () => Uint8Array.from(Buffer.from('str')),
        dir: false,
        name: 'string.txt',
        unixPermissions: '0644',
      },
    },
  }))

  const zipManifest = await readZipArchive(
    Uint8Array.from([0x50, 0x4b, 0x03, 0x04])
  )
  assert.deepEqual(
    zipManifest.entries.map((entry) => [entry.path, entry.mode]),
    [
      ['numeric.txt', 0o100644],
      ['string.txt', 0o644],
    ]
  )

  const tarManifest = await readTarArchive(
    await createTarArchive([
      { kind: 'directory', path: '' },
      { kind: 'file', path: 'pkg/readme.txt', data: 'tar' },
    ])
  )
  assert.deepEqual(
    tarManifest.entries.map((entry) => entry.path),
    ['pkg/readme.txt']
  )

  const gzipManifest = await readGzipArchive(
    gzipSync(Buffer.from('gzip data')),
    '.gz'
  )
  assert.equal(gzipManifest.entries[0].path, 'archive')

  await assert.rejects(
    () => readGzipArchive(Uint8Array.from([0x1f, 0x8b, 0x00])),
    (error) => {
      assert.equal(error.code, 'ARCHIVE_INVALID_FORMAT')
      return true
    }
  )

  await assert.rejects(
    () => readForeignArchive(Uint8Array.from([9, 8, 7])),
    (error) => {
      assert.equal(error.code, 'ARCHIVE_INVALID_FORMAT')
      return true
    }
  )

  await readForeignArchive(Uint8Array.from([0x50, 0x4b, 0x05, 0x06]))
  await readForeignArchive(Uint8Array.from([0x50, 0x4b, 0x07, 0x08]))
})

test('zip reader rejects symlink markers', async (t) => {
  t.mock.method(JSZip, 'loadAsync', async () => ({
    files: {
      link: {
        async: async () => Uint8Array.from([120]),
        dir: false,
        name: 'link.txt',
        unixPermissions: 0o120777,
      },
    },
  }))

  await assert.rejects(
    () => readZipArchive(Uint8Array.from([0x50, 0x4b, 0x03, 0x04])),
    (error) => {
      assert.equal(error.code, 'ARCHIVE_UNSUPPORTED_ENTRY')
      return true
    }
  )
})

test('collectPathEntries supports literal, glob, absolute, and invalid sources', async () => {
  const tempDir = await makeTempDir()
  const originalCwd = process.cwd()

  try {
    await mkdir(path.join(tempDir, 'src', 'empty'), { recursive: true })
    await writeFile(
      path.join(tempDir, 'src', 'index.js'),
      'export const ok = true\n'
    )
    await writeFile(path.join(tempDir, 'src', 'notes.txt'), 'notes\n')
    process.chdir(tempDir)

    const literalEntries = await collectPathEntries({ literalPath: ['src'] })
    assert.deepEqual(
      literalEntries.map((entry) => entry.path),
      ['src', 'src/empty', 'src/index.js', 'src/notes.txt']
    )

    const cwdEntries = await collectPathEntries({ literalPath: ['.'] })
    assert.equal(cwdEntries[0].path, path.basename(tempDir))

    const globEntries = await collectPathEntries({ path: ['src'] })
    assert.deepEqual(
      globEntries.map((entry) => entry.path),
      ['src', 'src/empty', 'src/index.js', 'src/notes.txt']
    )

    await assert.rejects(
      () => collectPathEntries({}),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_SOURCE_MISSING')
        return true
      }
    )

    const absoluteEntries = await collectPathEntries({
      literalPath: [path.join(tempDir, 'src', 'index.js')],
    })
    assert.deepEqual(
      absoluteEntries.map((entry) => entry.path),
      ['index.js']
    )

    const stringEntries = await collectPathEntries({
      literalPath: 'src/index.js',
    })
    assert.deepEqual(
      stringEntries.map((entry) => entry.path),
      ['src/index.js']
    )

    const duplicateEntries = await collectPathEntries({
      literalPath: ['src/index.js', 'src/index.js'],
    })
    assert.deepEqual(
      duplicateEntries.map((entry) => entry.path),
      ['src/index.js']
    )

    await assert.rejects(
      () => collectPathEntries({ path: ['missing/**/*'] }),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_SOURCE_MISSING')
        return true
      }
    )

    await assert.rejects(
      () => collectPathEntries({ literalPath: ['..'] }),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_SOURCE_OUTSIDE_CWD')
        return true
      }
    )

    const junctionTarget = path.join(tempDir, 'src')
    const junctionPath = path.join(tempDir, 'src-link')
    await symlink(junctionTarget, junctionPath, 'junction')
    await assert.rejects(
      () => collectPathEntries({ literalPath: [junctionPath] }),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_UNSUPPORTED_ENTRY')
        return true
      }
    )

    await assert.rejects(
      () => collectPathEntries({ literalPath: ['does-not-exist.txt'] }),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_SOURCE_MISSING')
        return true
      }
    )

    await assert.rejects(() =>
      collectPathEntries({ literalPath: ['bad\u0000path'] })
    )
  } finally {
    process.chdir(originalCwd)
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('materializeArchive writes directories, rejects unsafe paths, and reports collisions', async () => {
  const tempDir = await makeTempDir()

  try {
    const manifest = {
      entries: [
        { kind: 'directory', mode: 0o755, path: 'folder' },
        {
          data: Buffer.from('hello').toString('base64'),
          kind: 'file',
          mode: 0o644,
          path: 'folder/hello.txt',
        },
      ],
      format: '@nodearchive/nodearchive',
      version: 1,
    }

    await materializeArchive(manifest, tempDir)
    assert.equal(
      await readFile(path.join(tempDir, 'folder', 'hello.txt'), 'utf8'),
      'hello'
    )

    await assert.rejects(
      () => materializeArchive(manifest, tempDir),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_DESTINATION_EXISTS')
        return true
      }
    )

    await materializeArchive(manifest, tempDir, true)

    const dryRunPath = path.join(tempDir, 'dry-run')
    await materializeArchive(manifest, dryRunPath, false, true)
    await assert.rejects(() =>
      readFile(path.join(dryRunPath, 'folder', 'hello.txt'), 'utf8')
    )

    await assert.rejects(
      () => materializeArchive(manifest, tempDir, false, true),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_DESTINATION_EXISTS')
        return true
      }
    )

    await assert.rejects(
      () =>
        materializeArchive(
          {
            ...manifest,
            entries: [
              {
                kind: 'file',
                data: Buffer.from('x').toString('base64'),
                path: '../evil.txt',
              },
            ],
          },
          tempDir
        ),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_ENTRY_PATH_INVALID')
        return true
      }
    )

    await assert.rejects(
      () =>
        materializeArchive(
          {
            entries: [
              { kind: 'directory', path: 'folder' },
              {
                kind: 'file',
                data: Buffer.from('x').toString('base64'),
                path: 'folder',
              },
            ],
            format: '@nodearchive/nodearchive',
            version: 1,
          },
          path.join(tempDir, 'conflict'),
          true
        ),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_FILESYSTEM_WRITE_FAILED')
        return true
      }
    )

    await assert.rejects(
      () =>
        materializeArchive(
          {
            ...manifest,
            entries: [
              {
                data: Buffer.from('x').toString('base64'),
                kind: 'file',
                path: 'bad\u0000name.txt',
              },
            ],
          },
          tempDir,
          true,
          true
        ),
      (error) => {
        assert.equal(error.code, 'ERR_INVALID_ARG_VALUE')
        return true
      }
    )
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('materializeArchive wraps non-EEXIST write failures', async () => {
  const tempDir = await makeTempDir()

  try {
    const target = path.join(tempDir, 'file.txt')
    await writeFile(target, 'existing')
    await chmod(target, 0o444)

    await assert.rejects(
      () =>
        materializeArchive(
          {
            entries: [
              {
                data: Buffer.from('hello').toString('base64'),
                kind: 'file',
                mode: 0o644,
                path: 'file.txt',
              },
            ],
            format: '@nodearchive/nodearchive',
            version: 1,
          },
          tempDir,
          true
        ),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_FILESYSTEM_WRITE_FAILED')
        assert.match(error.message, /Failed to write file/)
        return true
      }
    )
  } finally {
    await chmod(path.join(tempDir, 'file.txt'), 0o644).catch(() => {})
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('pack and unpack support blob mode, filesystem mode, summaries, and updates', async () => {
  const tempDir = await makeTempDir()
  const originalCwd = process.cwd()

  try {
    process.chdir(tempDir)

    const blobBytes = await pack({ blob: 'hello from blob' })
    assert.equal(
      Buffer.from(await unpack({ blob: blobBytes })).toString('utf8'),
      'hello from blob'
    )

    const blobSummary = await pack({ blob: 'summary', passThru: true })
    assert.equal(blobSummary.mode, 'memory')

    await assert.rejects(
      () => pack({ confirm: true }),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_CONFIRM_UNSUPPORTED')
        return true
      }
    )

    await assert.rejects(
      () => pack({}),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_INPUT_REQUIRED')
        return true
      }
    )

    await assert.rejects(
      () => pack({ blob: 'x', literalPath: ['src'] }),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_INPUT_CONFLICT')
        return true
      }
    )

    await assert.rejects(
      () => pack({ blob: {} }),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_UNSUPPORTED_BLOB')
        return true
      }
    )

    await mkdir(path.join(tempDir, 'input', 'nested'), { recursive: true })
    await writeFile(path.join(tempDir, 'input', 'nested', 'a.txt'), 'one')
    await writeFile(path.join(tempDir, 'input', 'b.txt'), 'two')

    const archivePath = path.join(tempDir, 'bundle.nar')
    const writeSummary = await pack({
      destinationPath: archivePath,
      literalPath: ['input'],
      passThru: true,
    })
    assert.equal(writeSummary.mode, 'filesystem')
    assert.equal(writeSummary.updated, false)

    await assert.rejects(
      () => pack({ destinationPath: archivePath, literalPath: ['input'] }),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_DESTINATION_EXISTS')
        return true
      }
    )

    await assert.rejects(
      () =>
        pack({ destinationPath: tempDir, literalPath: ['input'], force: true }),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_FILESYSTEM_WRITE_FAILED')
        return true
      }
    )

    await assert.rejects(
      () =>
        pack({
          destinationPath: tempDir,
          literalPath: ['input'],
          update: true,
        }),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_FILESYSTEM_READ_FAILED')
        return true
      }
    )

    const dryRun = await pack({
      destinationPath: path.join(tempDir, 'dry-run.nar'),
      literalPath: ['input'],
      passThru: true,
      whatIf: true,
    })
    assert.equal(dryRun.dryRun, true)
    assert.equal(
      await pack({
        destinationPath: path.join(tempDir, 'dry-run-no-summary.nar'),
        literalPath: ['input'],
        whatIf: true,
      }),
      undefined
    )

    await assert.rejects(
      () =>
        pack({
          destinationPath: archivePath,
          literalPath: ['input'],
          whatIf: true,
        }),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_DESTINATION_EXISTS')
        return true
      }
    )

    const initialUpdate = await pack({
      destinationPath: path.join(tempDir, 'fresh-update.nar'),
      literalPath: ['input'],
      passThru: true,
      update: true,
    })
    assert.equal(initialUpdate.updated, false)

    await writeFile(path.join(tempDir, 'input', 'nested', 'a.txt'), 'three')
    await writeFile(path.join(tempDir, 'input', 'c.txt'), 'four')
    const updatedSummary = await pack({
      destinationPath: archivePath,
      literalPath: ['input'],
      passThru: true,
      update: true,
    })
    assert.equal(updatedSummary.updated, true)

    assert.equal(
      await pack({
        destinationPath: path.join(tempDir, 'silent-write.nar'),
        literalPath: ['input'],
      }),
      undefined
    )

    const unpackedArchive = await unpack({ path: archivePath })
    const files = new Map(
      unpackedArchive.entries
        .filter((entry) => entry.kind === 'file')
        .map((entry) => [entry.path, Buffer.from(entry.data).toString('utf8')])
    )
    assert.equal(files.get('input/nested/a.txt'), 'three')
    assert.equal(files.get('input/c.txt'), 'four')

    const extractSummary = await unpack({
      destinationPath: path.join(tempDir, 'out'),
      passThru: true,
      path: archivePath,
    })
    assert.equal(extractSummary.mode, 'filesystem')
    assert.equal(
      await readFile(
        path.join(tempDir, 'out', 'input', 'nested', 'a.txt'),
        'utf8'
      ),
      'three'
    )

    await assert.rejects(
      () =>
        unpack({
          destinationPath: path.join(tempDir, 'out'),
          path: archivePath,
        }),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_DESTINATION_EXISTS')
        return true
      }
    )

    await unpack({
      destinationPath: path.join(tempDir, 'out'),
      force: true,
      path: archivePath,
    })

    const unpackWhatIf = await unpack({
      destinationPath: path.join(tempDir, 'out-what-if'),
      passThru: true,
      path: archivePath,
      whatIf: true,
    })
    assert.equal(unpackWhatIf.dryRun, true)

    assert.equal(
      await unpack({
        destinationPath: path.join(tempDir, 'out-what-if-2'),
        path: archivePath,
        whatIf: true,
      }),
      undefined
    )

    await assert.rejects(
      () =>
        unpack({
          destinationPath: path.join(tempDir, 'out'),
          path: archivePath,
          whatIf: true,
        }),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_DESTINATION_EXISTS')
        return true
      }
    )

    await assert.rejects(
      () =>
        writeArchive({
          entries: [
            {
              kind: 'file',
              data: Buffer.from('x').toString('base64'),
              path: '../bad.txt',
            },
          ],
          format: '@nodearchive/nodearchive',
          version: 1,
        }).then((blob) =>
          unpack({
            blob,
            destinationPath: path.join(tempDir, 'unsafe'),
          })
        ),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_ENTRY_PATH_INVALID')
        return true
      }
    )

    await assert.rejects(
      () => unpack({ confirm: true }),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_CONFIRM_UNSUPPORTED')
        return true
      }
    )

    await assert.rejects(
      () => unpack({ blob: Uint8Array.from([1]), path: archivePath }),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_INPUT_CONFLICT')
        return true
      }
    )

    await assert.rejects(
      () => unpack({}),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_INPUT_REQUIRED')
        return true
      }
    )

    await assert.rejects(
      () => unpack({ path: path.join(tempDir, 'missing.nar') }),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_SOURCE_MISSING')
        return true
      }
    )

    await assert.rejects(
      () => unpack({ path: tempDir }),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_FILESYSTEM_READ_FAILED')
        return true
      }
    )
  } finally {
    process.chdir(originalCwd)
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('pack supports alternate output formats and validates output constraints', async () => {
  const tempDir = await makeTempDir()
  const originalCwd = process.cwd()

  try {
    process.chdir(tempDir)
    await mkdir(path.join(tempDir, 'input', 'nested'), { recursive: true })
    await writeFile(path.join(tempDir, 'input', 'nested', 'a.txt'), 'one')
    await writeFile(path.join(tempDir, 'input', 'b.txt'), 'two')

    const zipArchive = await unpack({
      blob: await pack({
        literalPath: ['input'],
        outFormat: 'zip',
        compressionLevel: 'NoCompression',
      }),
    })
    assert.deepEqual(
      zipArchive.entries.map((entry) => entry.path),
      ['input', 'input/b.txt', 'input/nested', 'input/nested/a.txt']
    )

    const tarArchive = await unpack({
      blob: await pack({ literalPath: ['input'], outFormat: 'tar' }),
    })
    assert.deepEqual(
      tarArchive.entries.map((entry) => entry.path),
      ['input', 'input/b.txt', 'input/nested', 'input/nested/a.txt']
    )

    const fastZipArchive = await unpack({
      blob: await pack({
        literalPath: ['input'],
        outFormat: 'zip',
        compressionLevel: 'Fastest',
      }),
    })
    assert.deepEqual(
      fastZipArchive.entries.map((entry) => entry.path),
      ['input', 'input/b.txt', 'input/nested', 'input/nested/a.txt']
    )

    const tgzArchive = await unpack({
      blob: await pack({ literalPath: ['input'], outFormat: 'tgz' }),
    })
    assert.deepEqual(
      tgzArchive.entries.map((entry) => entry.path),
      ['input', 'input/b.txt', 'input/nested', 'input/nested/a.txt']
    )

    const tarGzArchive = await unpack({
      blob: await pack({ literalPath: ['input'], outFormat: 'tar.gz' }),
    })
    assert.deepEqual(
      tarGzArchive.entries.map((entry) => entry.path),
      ['input', 'input/b.txt', 'input/nested', 'input/nested/a.txt']
    )

    const gzipBytes = await pack({
      literalPath: ['input/b.txt'],
      outFormat: 'gz',
    })
    assert.equal(
      Buffer.from(await unpack({ blob: gzipBytes })).toString('utf8'),
      'two'
    )

    const inferredSummary = await pack({
      destinationPath: path.join(tempDir, 'bundle.zip'),
      literalPath: ['input'],
      passThru: true,
    })
    assert.equal(inferredSummary.format, 'zip')

    await assert.rejects(
      () => pack({ literalPath: ['input'], outFormat: 'rar' }),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_OUTPUT_FORMAT_INVALID')
        return true
      }
    )

    await assert.rejects(
      () =>
        pack({
          destinationPath: path.join(tempDir, 'bundle.tar'),
          literalPath: ['input'],
          outFormat: 'zip',
        }),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_OUTPUT_FORMAT_INVALID')
        return true
      }
    )

    await assert.rejects(
      () =>
        pack({
          destinationPath: path.join(tempDir, 'bundle.zip'),
          literalPath: ['input'],
          outFormat: 'zip',
          update: true,
        }),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_OUTPUT_FORMAT_INVALID')
        return true
      }
    )

    await assert.rejects(
      () => pack({ literalPath: ['input'], outFormat: 'gz' }),
      (error) => {
        assert.equal(error.code, 'ARCHIVE_OUTPUT_FORMAT_INVALID')
        return true
      }
    )
  } finally {
    process.chdir(originalCwd)
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('writeOutputArchive rejects incomplete manifests for foreign formats', async () => {
  const invalidManifest = {
    entries: [{ kind: 'file', path: 'broken.txt' }],
    format: '@nodearchive/nodearchive',
    version: 1,
  }

  await assert.rejects(() => writeOutputArchive(invalidManifest, 'zip'))
  await assert.rejects(() => writeOutputArchive(invalidManifest, 'tar'))
})

test('writeTarArchive wraps tar entry callback failures', async (t) => {
  t.mock.method(tarStream, 'pack', () => ({
    entry(_header, bodyOrCallback, callback) {
      const onComplete =
        typeof bodyOrCallback === 'function' ? bodyOrCallback : callback
      onComplete(new Error('tar write failed'))
    },
    finalize() {},
    on() {},
  }))

  await assert.rejects(
    () =>
      writeTarArchive({
        entries: [{ kind: 'directory', path: 'folder' }],
        format: '@nodearchive/nodearchive',
        version: 1,
      }),
    (error) => {
      assert.equal(error.code, 'ARCHIVE_SERIALIZATION_FAILED')
      assert.match(
        error.message,
        /Failed to encode tar archive: tar write failed/
      )
      return true
    }
  )
})

test('writeTarArchive applies default file modes when none are provided', async () => {
  const bytes = await writeTarArchive({
    entries: [
      {
        data: Buffer.from('blob').toString('base64'),
        kind: 'file',
        path: 'blob.txt',
      },
    ],
    format: '@nodearchive/nodearchive',
    version: 1,
  })

  const archive = await readTarArchive(bytes)
  assert.equal(archive.entries[0].path, 'blob.txt')
  assert.equal(
    Buffer.from(archive.entries[0].data, 'base64').toString('utf8'),
    'blob'
  )
})

test('unpack reads zip, tar, tar.gz, and gzip archives', async () => {
  const zip = new JSZip()
  zip.folder('nested')
  zip.folder('empty')
  zip.file('nested/hello.txt', 'zip hello')

  const zipResult = await unpack({
    blob: await zip.generateAsync({ type: 'uint8array' }),
  })
  assert.deepEqual(
    zipResult.entries.map((entry) => entry.path),
    ['empty', 'nested', 'nested/hello.txt']
  )
  assert.equal(
    Buffer.from(zipResult.entries[2].data).toString('utf8'),
    'zip hello'
  )

  const tarBytes = await createTarArchive([
    { kind: 'directory', path: 'pkg' },
    { data: 'tar hello', kind: 'file', path: 'pkg/readme.txt' },
  ])
  const tarResult = await unpack({ blob: tarBytes })
  assert.deepEqual(
    tarResult.entries.map((entry) => entry.path),
    ['pkg', 'pkg/readme.txt']
  )

  const tgzResult = await unpack({ blob: gzipSync(Buffer.from(tarBytes)) })
  assert.deepEqual(
    tgzResult.entries.map((entry) => entry.path),
    ['pkg', 'pkg/readme.txt']
  )

  assert.equal(
    Buffer.from(
      await unpack({ blob: gzipSync(Buffer.from('gzip hello')) })
    ).toString('utf8'),
    'gzip hello'
  )

  const tempDir = await makeTempDir()

  try {
    const archivePath = path.join(tempDir, 'message.txt.gz')
    const destinationPath = path.join(tempDir, 'out')
    await writeFile(archivePath, gzipSync(Buffer.from('named gzip')))

    await unpack({
      destinationPath,
      force: true,
      path: archivePath,
    })

    assert.equal(
      await readFile(path.join(destinationPath, 'message.txt'), 'utf8'),
      'named gzip'
    )
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('unpack rejects unsupported foreign archive entries and invalid foreign payloads', async () => {
  const symlinkArchive = await createTarArchive([
    { kind: 'symlink', linkname: 'target.txt', path: 'link.txt' },
  ])

  await assert.rejects(
    () => unpack({ blob: symlinkArchive }),
    (error) => {
      assert.equal(error.code, 'ARCHIVE_UNSUPPORTED_ENTRY')
      return true
    }
  )

  await assert.rejects(
    () => unpack({ blob: Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x00]) }),
    (error) => {
      assert.equal(error.code, 'ARCHIVE_INVALID_FORMAT')
      return true
    }
  )
})

async function makeTempDir() {
  return mkdtemp(path.join(os.tmpdir(), 'nodearchive-'))
}

async function createTarArchive(entries) {
  const pack = tarStream.pack()
  const chunks = []
  const output = new Promise((resolve, reject) => {
    pack.on('data', (chunk) => {
      chunks.push(Buffer.from(chunk))
    })
    pack.on('error', reject)
    pack.on('end', () => {
      resolve(Uint8Array.from(Buffer.concat(chunks)))
    })
  })

  for (const entry of entries) {
    await new Promise((resolve, reject) => {
      const header =
        entry.kind === 'directory'
          ? {
              mode: 0o755,
              name: `${entry.path}/`,
              type: 'directory',
            }
          : entry.kind === 'symlink'
            ? {
                linkname: entry.linkname,
                name: entry.path,
                type: 'symlink',
              }
            : {
                mode: 0o644,
                name: entry.path,
                type: 'file',
              }

      if (entry.kind === 'file') {
        pack.entry(header, entry.data, (error) => {
          if (error) {
            reject(error)
            return
          }

          resolve()
        })
        return
      }

      pack.entry(header, (error) => {
        if (error) {
          reject(error)
          return
        }

        resolve()
      })
    })
  }

  pack.finalize()
  return output
}
