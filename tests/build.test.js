const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build } = require('../build');

const feed = `<rss><channel><item>
<title><![CDATA[Latest article]]></title>
<link>https://ethanbloch.substack.com/p/latest-article</link>
<pubDate>Fri, 04 Sep 2026 18:21:30 GMT</pubDate>
<description><![CDATA[An article summary.]]></description>
<content:encoded><![CDATA[<p>The complete article.</p>]]></content:encoded>
</item></channel></rss>`;

test('feed errors preserve the last good site and fail the build', async () => {
  const originalDir = process.cwd();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'site-build-test-'));
  process.chdir(dir);
  try {
    fs.writeFileSync('index.html', 'Existing homepage');
    fs.mkdirSync('posts');
    const archive = '<meta property="article:published_time" content="2012-12-01T00:00:00Z"><h1>Archived article</h1>';
    fs.writeFileSync('posts/older.html', archive);
    await assert.rejects(build(async () => { throw new Error('403 Forbidden'); }), /403/);
    for (const invalid of ['<html>Blocked</html>', '<rss><channel></channel></rss>', feed.replace('Fri, 04 Sep 2026 18:21:30 GMT', 'invalid')]) {
      await assert.rejects(build(async () => invalid));
      assert.equal(fs.readFileSync('index.html', 'utf8'), 'Existing homepage');
      assert.deepEqual(fs.readdirSync('posts'), ['older.html']);
    }
    await build(async () => feed);
    assert.match(fs.readFileSync('index.html', 'utf8'), /href="\/posts\/latest-article.html"/);
    assert.match(fs.readFileSync('posts/latest-article.html', 'utf8'), /<p>The complete article.<\/p>/);
    assert.equal(fs.readFileSync('posts/older.html', 'utf8'), archive);
    assert.match(fs.readFileSync('index.html', 'utf8'), /href="\/posts\/older.html"/);
  } finally {
    process.chdir(originalDir);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
