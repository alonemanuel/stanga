// /api/webhook.js  (single-file version: AI parser + fallback + 3-teams only)

export default async function handler(req, res) {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

  // --- Webhook verification (GET) ---
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'] ?? '';
    if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge !== '') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(challenge);
    }
    return res.status(403).send('forbidden');
  }

  // --- Incoming message (POST) ---
  if (req.method === 'POST') {
    try {
      // Parse JSON body (works consistently on Vercel)
      const chunks = [];
      for await (const ch of req) chunks.push(ch);
      const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');

      const change = body?.entry?.[0]?.changes?.[0]?.value;
      const message = change?.messages?.[0];
      if (!message || message.type !== 'text') return res.status(200).end();

      const from = message.from;
      const text = (message.text?.body || '').trim();

      // 1) Try LLM parse first (free-form messages in EN/HE ok)
      let names = await tryLLMExtractNames(text);

      // 2) Fallback: accept "teams: name1, name2, ...", commas/newlines/semicolons
      if ((!names || names.length === 0)) {
        const m = text.match(/^teams?\s*[:\-]\s*([\s\S]+)$/i);
        if (m) {
          names = m[1].split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
        }
      }

      // Clean & check count
      names = Array.from(new Set((names || []).map(n => n.trim()).filter(Boolean)));

      if (names.length !== 21) {
        await sendText(WHATSAPP_TOKEN, PHONE_NUMBER_ID, from,
          `I found ${names.length} unique names.\n` +
          `Please send exactly 21 names (any format is fine). Example:\n` +
          `• teams: yoni, amit, … (21 total)\n\n` +
          (names.length > 0 ? `Detected so far:\n${names.join(', ')}` : '')
        );
        return res.status(200).end();
      }

      // Shuffle + split to A/B/C
      const { A, B, C } = makeTeams(names);

      const body = [
        'רביעי 20:20',
        '',
        '🔴🔴🔴',
        ...A,
        '',
        '⚫️⚫️⚫️',
        ...B,
        '',
        '⚪️⚪️⚪️',
        ...C,
        '',
        'רביעי שמח!'
      ].join('\n');

      await sendText(WHATSAPP_TOKEN, PHONE_NUMBER_ID, from, body);

      return res.status(200).end();
    } catch (e) {
      console.error(e);
      return res.status(200).end(); // avoid retries
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}

// ---------- Helpers ----------

function makeTeams(names) {
  const a = [...names];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  const A = [], B = [], C = [];
  a.forEach((n, i) => (i % 3 === 0 ? A : i % 3 === 1 ? B : C).push(n));
  return { A, B, C };
}

async function sendText(token, phoneNumberId, to, body) {
  await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, text: { body } })
  });
}

async function tryLLMExtractNames(userText) {
  const apiUrl = (process.env.LLM_API_URL || '').replace(/\/$/, '');
  const apiKey = process.env.LLM_API_KEY;
  const model  = process.env.LLM_MODEL || 'gpt-4o-mini';
  if (!apiUrl || !apiKey) return null;

  const system = `
You are Stanga's name extractor.
Task: From a free-form message, extract a list of player NAMES to form 3 football teams (7x7x7).
- The message may be messy, any language (English/Hebrew).
- Return ONLY JSON: {"names": ["name1","name2",...]}
- "names" must be an array of strings, in the order they appear.
- Do not include numbers, emojis, or extra words.
- If no names, return {"names": []}.
`;

  const payload = {
    model,
    temperature: 0.1,
    response_format: { type: "json_object" }, // OpenAI-style; many providers support this
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `Message:\n"""${userText}"""\nReturn JSON with "names".` }
    ]
  };

  try {
    const r = await fetch(`${apiUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!r.ok) throw new Error(`LLM ${r.status}`);
    const data = await r.json();
    const txt = data.choices?.[0]?.message?.content ?? '{}';
    const j = JSON.parse(txt);
    const arr = Array.isArray(j.names) ? j.names : [];
    return arr;
  } catch (e) {
    console.error('LLM parse failed', e);
    return null;
  }
}

