const fs = require('fs');
const http = require('http');

const options = JSON.parse(fs.readFileSync('/data/options.json', 'utf8'));
const apiKey = options.api_key || '';
const session = options.session_name || 'default';
const autoStart = options.auto_start !== false;
const applyExisting = options.apply_storage_to_existing !== false;

if (!/^[A-Za-z0-9_-]+$/.test(session)) {
  console.error('Invalid session_name; use only letters, numbers, _ or -.');
  process.exit(0);
}

const storage = {
  messages: options.storage_messages === true,
  groups: options.storage_groups === true,
  chats: options.storage_chats === true,
  labels: options.storage_labels === true,
  contacts: options.storage_contacts === true,
  messageSecrets: options.storage_message_secrets === true,
};

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request({
      host: '127.0.0.1',
      port: 3000,
      path,
      method,
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = data;
        try { parsed = data ? JSON.parse(data) : null; } catch (_) {}
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error('request timeout')));
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  if (!apiKey) {
    console.error('WAHA onboarding skipped: API key is not configured.');
    return;
  }

  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      const health = await request('GET', '/health');
      if (health.status >= 200 && health.status < 300) break;
    } catch (_) {}
    if (attempt === 60) throw new Error('WAHA health endpoint did not become ready');
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  const config = { gows: { storage } };
  let current = await request('GET', `/api/sessions/${encodeURIComponent(session)}`);

  if (current.status === 404) {
    const created = await request('POST', '/api/sessions', {
      name: session,
      start: false,
      config,
    });
    if (created.status < 200 || created.status >= 300) {
      throw new Error(`could not create session ${session} (HTTP ${created.status})`);
    }
    current = created;
    console.log(`WAHA session ${session} created with storage settings.`);
  } else if (current.status >= 200 && current.status < 300 && applyExisting) {
    const existing = current.body?.config?.gows?.storage || {};
    const differs = Object.keys(storage).some((key) => existing[key] !== storage[key]);
    if (differs) {
      const updated = await request('PUT', `/api/sessions/${encodeURIComponent(session)}`, { config });
      if (updated.status < 200 || updated.status >= 300) {
        throw new Error(`could not update storage settings for ${session} (HTTP ${updated.status})`);
      }
      current = updated;
      console.log(`WAHA session ${session} storage settings updated.`);
    }
  } else if (current.status >= 400) {
    throw new Error(`could not inspect session ${session} (HTTP ${current.status})`);
  }

  const status = current.body?.status;
  if (autoStart && status !== 'WORKING' && status !== 'STARTING') {
    const started = await request('POST', `/api/sessions/${encodeURIComponent(session)}/start`);
    if (started.status < 200 || started.status >= 300) {
      throw new Error(`could not start session ${session} (HTTP ${started.status})`);
    }
    console.log(`WAHA session ${session} start requested.`);
  }
}

main().catch((error) => {
  console.error(`WAHA onboarding warning: ${error.message}`);
});
