import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPreviewServer } from '../scripts/serve.mjs';

test('local preview serves the website while refusing credentials, source and private folders', async () => {
  const root = await mkdtemp(join(tmpdir(), 'agrocanary-preview-'));
  await writeFile(join(root, 'index.html'), '<h1>Demo</h1>');
  await writeFile(join(root, '.env'), 'SYNTHETIC_LOCAL_VALUE=private');
  await writeFile(join(root, 'README.md'), 'Private source metadata');
  await mkdir(join(root, 'api'));
  await writeFile(join(root, 'api/contact.js'), '/* server source */');
  const server = createPreviewServer(root);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const page = await fetch(origin);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Demo/);
    for (const path of ['/.env', '/.git/config', '/README.md', '/api/contact.js', '/assets/../.env', '/assets/%2e%2e%2f.env']) {
      const response = await fetch(origin + path);
      assert.equal(response.status, 404, path);
      assert.doesNotMatch(await response.text(), /SYNTHETIC_LOCAL_VALUE/);
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});
