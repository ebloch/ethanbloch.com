#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const RSS_URL = 'https://www.ethanbloch.com/feed';
const POSTS_DIR = './posts';

async function fetchRSS() {
  const response = await fetch(RSS_URL);
  if (!response.ok) throw new Error(`Failed to fetch RSS: ${response.status}`);
  return response.text();
}

function parseRSS(xml) {
  const posts = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    
    const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] 
                || item.match(/<title>(.*?)<\/title>/)?.[1] 
                || 'Untitled';
    
    const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
    const slugMatch = link.match(/\/p\/([^\/\?#]+)/);
    const slug = slugMatch ? slugMatch[1] : null;
    
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
    
    const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
                     || item.match(/<description>(.*?)<\/description>/)?.[1]
                     || '';
    
    const contentMatch = item.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/);
    const content = contentMatch ? contentMatch[1] : description;
    
    if (slug) {
      posts.push({ title, slug, link, pubDate, description, content });
    }
  }
  
  return posts;
}

function formatDate(dateStr, format = 'long') {
  const date = new Date(dateStr);
  if (format === 'short') {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function generatePostHTML(post) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${post.description.replace(/"/g, '&quot;').replace(/<[^>]*>/g, '').slice(0, 160)}">
    <meta name="author" content="Ethan Bloch">
    <meta name="robots" content="index, follow">

    <!-- Open Graph -->
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Ethan Bloch">
    <meta property="og:title" content="${post.title}">
    <meta property="og:description" content="${post.description.replace(/"/g, '&quot;').replace(/<[^>]*>/g, '').slice(0, 160)}">
    <meta property="og:url" content="https://ethanbloch.com/posts/${post.slug}">
    <meta property="og:locale" content="en_US">
    <meta property="article:published_time" content="${new Date(post.pubDate).toISOString()}">
    <meta property="article:author" content="Ethan Bloch">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary">
    <meta name="twitter:site" content="@ethanbloch">
    <meta name="twitter:title" content="${post.title}">
    <meta name="twitter:description" content="${post.description.replace(/"/g, '&quot;').replace(/<[^>]*>/g, '').slice(0, 160)}">

    <title>${post.title} - Ethan Bloch</title>
    <link rel="canonical" href="https://ethanbloch.com/posts/${post.slug}">
    <style>
        :root {
            --text: #1a1a1a;
            --text-secondary: #666;
            --text-muted: #999;
            --bg: #fff;
            --accent: #0066cc;
            --border: #eee;
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --text: #e5e5e5;
                --text-secondary: #a0a0a0;
                --text-muted: #666;
                --bg: #111;
                --accent: #6db3f2;
                --border: #333;
            }
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 18px;
            line-height: 1.7;
            color: var(--text);
            background: var(--bg);
            max-width: 680px;
            margin: 0 auto;
            padding: 3rem 1.5rem;
        }

        a { color: var(--accent); text-decoration: none; }
        a:hover { text-decoration: underline; }

        .back-link {
            display: inline-block;
            margin-bottom: 2rem;
            font-size: 0.9rem;
            color: var(--text-muted);
        }
        .back-link:hover { color: var(--accent); }

        .post-header { margin-bottom: 2.5rem; }

        h1 {
            font-size: 2rem;
            font-weight: 700;
            line-height: 1.3;
            margin-bottom: 0.75rem;
        }

        .post-meta {
            color: var(--text-muted);
            font-size: 0.9rem;
        }

        .post-content h1, .post-content h2, .post-content h3 {
            margin-top: 2rem;
            margin-bottom: 1rem;
            font-weight: 600;
        }
        .post-content h1 { font-size: 1.5rem; }
        .post-content h2 { font-size: 1.3rem; }
        .post-content h3 { font-size: 1.1rem; }

        .post-content p { margin-bottom: 1.25rem; }

        .post-content ul, .post-content ol {
            margin-bottom: 1.25rem;
            padding-left: 1.5rem;
        }
        .post-content li { margin-bottom: 0.5rem; }

        .post-content blockquote {
            border-left: 3px solid var(--accent);
            padding-left: 1.25rem;
            margin: 1.5rem 0;
            color: var(--text-secondary);
            font-style: italic;
        }

        .post-content img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            margin: 1.5rem 0;
        }

        .post-content .captioned-image-container,
        .post-content figure { margin: 1.5rem 0; }

        .post-content figcaption,
        .post-content .image-caption {
            font-size: 0.85rem;
            color: var(--text-muted);
            text-align: center;
            margin-top: 0.5rem;
        }

        .post-content hr {
            border: none;
            border-top: 1px solid var(--border);
            margin: 2rem 0;
        }

        .post-content .subscription-widget-wrap-editor,
        .post-content .subscribe-widget,
        .post-content .pencraft,
        .post-content .image-link-expand { display: none !important; }

        .post-content iframe {
            max-width: 100%;
            margin: 1.5rem 0;
        }

        footer {
            margin-top: 4rem;
            padding-top: 2rem;
            border-top: 1px solid var(--border);
            font-size: 0.85rem;
            color: var(--text-muted);
        }

        .subscribe-cta {
            background: var(--border);
            padding: 1.5rem;
            border-radius: 6px;
            margin-top: 3rem;
            text-align: center;
        }
        .subscribe-cta p {
            margin-bottom: 0.75rem;
            font-size: 0.95rem;
        }

        .subscribe-form {
            display: flex;
            gap: 0.5rem;
            justify-content: center;
            flex-wrap: wrap;
        }
        .subscribe-form input[type="email"] {
            padding: 0.6rem 1rem;
            border: 1px solid var(--border);
            border-radius: 4px;
            font-size: 0.9rem;
            background: var(--bg);
            color: var(--text);
            min-width: 200px;
        }
        .subscribe-form button {
            padding: 0.6rem 1.25rem;
            background: var(--text);
            color: var(--bg);
            border: none;
            border-radius: 4px;
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
        }
        .subscribe-form button:hover { opacity: 0.85; }
        .subscribe-form button:disabled { opacity: 0.5; cursor: not-allowed; }
        .subscribe-status {
            margin-top: 0.75rem;
            font-size: 0.85rem;
        }
        .subscribe-status.success { color: #22c55e; }
        .subscribe-status.error { color: #ef4444; }

        @media (max-width: 480px) {
            body { padding: 2rem 1rem; font-size: 17px; }
            h1 { font-size: 1.6rem; }
            .subscribe-form input[type="email"] { width: 100%; }
        }
    </style>
</head>
<body>
    <a href="/" class="back-link">← Back to home</a>
    
    <article>
        <header class="post-header">
            <h1>${post.title}</h1>
            <p class="post-meta">${formatDate(post.pubDate)}</p>
        </header>
        <div class="post-content">
            ${post.content}
        </div>
        <div class="subscribe-cta">
            <p>Enjoyed this? Get new posts in your inbox.</p>
            <form class="subscribe-form" onsubmit="handleSubscribe(event)">
                <input type="email" name="email" placeholder="your@email.com" required>
                <button type="submit">Subscribe</button>
            </form>
            <p class="subscribe-status"></p>
        </div>
    </article>

    <footer>
        <p>© 2026 Ethan Bloch</p>
    </footer>

    <script>
    async function handleSubscribe(e) {
        e.preventDefault();
        const form = e.target;
        const email = form.email.value;
        const btn = form.querySelector('button');
        const status = form.parentElement.querySelector('.subscribe-status');
        
        btn.disabled = true;
        btn.textContent = 'Subscribing...';
        status.textContent = '';
        status.className = 'subscribe-status';
        
        try {
            const res = await fetch('https://www.ethanbloch.com/api/v1/free', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, first_url: window.location.href })
            });
            if (res.ok) {
                status.textContent = 'Thanks! Check your inbox to confirm.';
                status.className = 'subscribe-status success';
                form.reset();
            } else {
                throw new Error('Subscribe failed');
            }
        } catch (err) {
            status.textContent = 'Something went wrong. Try again?';
            status.className = 'subscribe-status error';
        }
        btn.disabled = false;
        btn.textContent = 'Subscribe';
    }
    </script>
</body>
</html>`;
}

function generateIndexHTML(posts) {
  const postsListHTML = posts.map(post => `
                    <li class="post">
                        <span class="post-date">${formatDate(post.pubDate, 'short')}</span>
                        <a href="/posts/${post.slug}.html" class="post-title">${post.title}</a>
                    </li>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Notes on money, technology, and building a meaningful life.">
    <meta name="author" content="Ethan Bloch">
    <meta name="robots" content="index, follow">

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Ethan Bloch">
    <meta property="og:title" content="Ethan Bloch">
    <meta property="og:description" content="Notes on money, technology, and building a meaningful life.">
    <meta property="og:url" content="https://ethanbloch.com">
    <meta property="og:locale" content="en_US">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary">
    <meta name="twitter:site" content="@ethanbloch">
    <meta name="twitter:title" content="Ethan Bloch">
    <meta name="twitter:description" content="Notes on money, technology, and building a meaningful life.">

    <title>Ethan Bloch</title>
    <link rel="canonical" href="https://ethanbloch.com">
    <link rel="alternate" type="application/rss+xml" href="https://www.ethanbloch.com/feed" title="Ethan Bloch">
    <style>
        :root {
            --text: #1a1a1a;
            --text-secondary: #666;
            --text-muted: #999;
            --bg: #fff;
            --accent: #0066cc;
            --border: #eee;
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --text: #e5e5e5;
                --text-secondary: #a0a0a0;
                --text-muted: #666;
                --bg: #111;
                --accent: #6db3f2;
                --border: #333;
            }
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            color: var(--text);
            background: var(--bg);
            max-width: 640px;
            margin: 0 auto;
            padding: 4rem 1.5rem;
        }

        a { color: var(--accent); text-decoration: none; }
        a:hover { text-decoration: underline; }

        header { margin-bottom: 3rem; }

        h1 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }

        .tagline {
            color: var(--text-secondary);
            margin-bottom: 1rem;
        }

        .bio {
            color: var(--text-secondary);
            font-size: 0.95rem;
            margin-bottom: 1.5rem;
        }

        .links {
            display: flex;
            gap: 1.25rem;
            font-size: 0.9rem;
        }
        .links a { color: var(--text-muted); }
        .links a:hover { color: var(--accent); }

        .section-title {
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--text-muted);
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid var(--border);
        }

        .posts { list-style: none; }

        .post {
            margin-bottom: 1.25rem;
            display: flex;
            gap: 1rem;
            align-items: baseline;
        }

        .post-date {
            font-size: 0.85rem;
            color: var(--text-muted);
            white-space: nowrap;
            min-width: 5.5rem;
            font-variant-numeric: tabular-nums;
        }

        .post-title {
            color: var(--text);
            font-weight: 500;
        }
        .post-title:hover { color: var(--accent); }

        footer {
            margin-top: 4rem;
            padding-top: 2rem;
            border-top: 1px solid var(--border);
            font-size: 0.85rem;
            color: var(--text-muted);
        }

        .subscribe-box {
            background: var(--border);
            padding: 1.25rem;
            border-radius: 6px;
            margin-top: 2rem;
            margin-bottom: 3rem;
            text-align: center;
        }
        .subscribe-box p {
            margin-bottom: 0.75rem;
            font-size: 0.9rem;
        }

        .subscribe-form {
            display: flex;
            gap: 0.5rem;
            justify-content: center;
            flex-wrap: wrap;
        }
        .subscribe-form input[type="email"] {
            padding: 0.5rem 0.75rem;
            border: 1px solid var(--border);
            border-radius: 4px;
            font-size: 0.9rem;
            background: var(--bg);
            color: var(--text);
            min-width: 180px;
        }
        .subscribe-form button {
            padding: 0.5rem 1rem;
            background: var(--text);
            color: var(--bg);
            border: none;
            border-radius: 4px;
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
        }
        .subscribe-form button:hover { opacity: 0.85; }
        .subscribe-form button:disabled { opacity: 0.5; cursor: not-allowed; }
        .subscribe-status {
            margin-top: 0.5rem;
            font-size: 0.85rem;
        }
        .subscribe-status.success { color: #22c55e; }
        .subscribe-status.error { color: #ef4444; }

        @media (max-width: 480px) {
            body { padding: 2rem 1rem; }
            .post {
                flex-direction: column;
                gap: 0.25rem;
            }
            .post-date { font-size: 0.8rem; }
            .subscribe-form input[type="email"] { width: 100%; }
        }
    </style>
</head>
<body>
    <header>
        <h1>Ethan Bloch</h1>
        <p class="tagline">Notes on money, technology, and building a meaningful life.</p>
        <p class="bio">
            Fintech pioneer. Built <a href="/posts/digit.html">Digit</a> — helped millions save over $9B. 
            Now building <a href="https://hirofinance.com">Hiro</a>, an AI financial advisor.
        </p>
        <div class="links">
            <a href="https://twitter.com/ethanbloch">X</a>
            <a href="https://linkedin.com/in/ethanbloch">LinkedIn</a>
            <a href="https://hirofinance.com">Hiro</a>
        </div>
    </header>

    <main>
        <h2 class="section-title">Writing</h2>
        <ul class="posts">${postsListHTML}
        </ul>

        <div class="subscribe-box">
            <p>Get new posts delivered to your inbox.</p>
            <form class="subscribe-form" onsubmit="handleSubscribe(event)">
                <input type="email" name="email" placeholder="your@email.com" required>
                <button type="submit">Subscribe</button>
            </form>
            <p class="subscribe-status"></p>
        </div>
    </main>

    <footer>
        <p>© 2026 Ethan Bloch</p>
    </footer>

    <script>
    async function handleSubscribe(e) {
        e.preventDefault();
        const form = e.target;
        const email = form.email.value;
        const btn = form.querySelector('button');
        const status = form.parentElement.querySelector('.subscribe-status');
        
        btn.disabled = true;
        btn.textContent = 'Subscribing...';
        status.textContent = '';
        status.className = 'subscribe-status';
        
        try {
            const res = await fetch('https://www.ethanbloch.com/api/v1/free', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, first_url: window.location.href })
            });
            if (res.ok) {
                status.textContent = 'Thanks! Check your inbox to confirm.';
                status.className = 'subscribe-status success';
                form.reset();
            } else {
                throw new Error('Subscribe failed');
            }
        } catch (err) {
            status.textContent = 'Something went wrong. Try again?';
            status.className = 'subscribe-status error';
        }
        btn.disabled = false;
        btn.textContent = 'Subscribe';
    }
    </script>
</body>
</html>`;
}

async function build() {
  console.log('Fetching RSS feed...');
  const xml = await fetchRSS();
  
  console.log('Parsing posts...');
  const posts = parseRSS(xml);
  console.log(`Found ${posts.length} posts`);
  
  // Create posts directory
  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
  }
  
  // Generate individual post pages
  for (const post of posts) {
    const html = generatePostHTML(post);
    const filepath = path.join(POSTS_DIR, `${post.slug}.html`);
    fs.writeFileSync(filepath, html);
    console.log(`Generated: ${filepath}`);
  }
  
  // Generate index page
  const indexHTML = generateIndexHTML(posts);
  fs.writeFileSync('./index.html', indexHTML);
  console.log('Generated: index.html');
  
  console.log('Build complete!');
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
