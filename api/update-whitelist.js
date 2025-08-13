// api/update-whitelist.js
// Node serverless for Vercel
export default async function handler(req, res) {
  // Allow only POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // simple CORS allow (Vercel site same origin). Adjust if needed.
  res.setHeader('Access-Control-Allow-Origin', '*');

  const body = req.body || {};
  const password = body.password;
  const whitelist = body.whitelist;

  const ADMIN_PASS = process.env.ADMIN_PASS;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

  if (!ADMIN_PASS || !GITHUB_TOKEN) {
    return res.status(500).json({ error: 'Server not configured. Set ADMIN_PASS and GITHUB_TOKEN in environment.' });
  }

  if (password !== ADMIN_PASS) {
    return res.status(401).json({ error: 'Unauthorized: wrong password.' });
  }

  if (!Array.isArray(whitelist)) {
    return res.status(400).json({ error: 'Bad request: whitelist must be an array.' });
  }

  // Repo info (hard-coded per request by user)
  const OWNER = 'RexzyOfficial';
  const REPO = 'webwraptest';
  const PATH = 'whitelist.json';
  const BRANCH = 'main';

  const apiBase = 'https://api.github.com';

  try {
    // 1) fetch current file to obtain sha
    const getResp = await fetch(`${apiBase}/repos/${OWNER}/${REPO}/contents/${PATH}?ref=${BRANCH}`, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'User-Agent': 'webwraptest'
      }
    });

    if (getResp.status === 404) {
      // file not found — create new file (sha not needed)
      // continue to create
    } else if (!getResp.ok) {
      const txt = await getResp.text();
      return res.status(500).json({ error: 'Failed to fetch file info: ' + txt });
    }

    const getJson = getResp.status === 404 ? null : await getResp.json();
    const sha = getJson ? getJson.sha : undefined;

    // prepare new content
    const contentStr = JSON.stringify(whitelist, null, 2);
    const contentBase64 = Buffer.from(contentStr, 'utf8').toString('base64');

    // PUT to create or update file
    const putBody = {
      message: `Update whitelist via web UI`,
      content: contentBase64,
      branch: BRANCH
    };
    if (sha) putBody.sha = sha;

    const putResp = await fetch(`${apiBase}/repos/${OWNER}/${REPO}/contents/${PATH}`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'User-Agent': 'webwraptest',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(putBody)
    });

    const putJson = await putResp.json();

    if (!putResp.ok) {
      return res.status(500).json({ error: 'Failed to update file', details: putJson });
    }

    return res.status(200).json({ ok: true, result: putJson });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error', details: String(err) });
  }
}
