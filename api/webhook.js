// /api/webhook.js
export default async function handler(req, res) {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;      // you choose
  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;            // from Meta
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID; // from Meta

  if (req.method === 'GET') {
    // Meta webhook verification
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).end();
  }

  if (req.method === 'POST') {
    try {
      const change = req.body?.entry?.[0]?.changes?.[0]?.value;
      const message = change?.messages?.[0];
      if (!message || message.type !== 'text') return res.status(200).end();

      const from = message.from;               // sender phone
      const text = (message.text?.body || '').trim();

      // Expect: "teams: name1, name2, ... name21"
      // Also accept newlines or semicolons; Hebrew/Latin ok
      const m = text.match(/^teams?\s*[:\-]\s*([\s\S]+)$/i);
      if (!m) {
        await sendText(WHATSAPP_TOKEN, PHONE_NUMBER_ID, from,
          "👋 I’m Stanga. Send:\n\nteams: name1, name2, ... name21"
        );
        return res.status(200).end();
      }

      // Split by comma/newline/semicolon
      const raw = m[1]
        .split(/[,;\n]/)
        .map(s => s.trim())
        .filter(Boolean);

      // De-dup and enforce exact 21
      const names = Array.from(new Set(raw)); // avoid dup names
      if (names.length !== 21) {
        await sendText(WHATSAPP_TOKEN, PHONE_NUMBER_ID, from,
          `❌ Need exactly 21 unique names. Got ${names.length}.\nTip: "teams: yoni, amit, ..."`
        );
        return res.status(200).end();
      }

      // Shuffle + round-robin: A,B,C,A,B,C...
      for (let i = names.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [names[i], names[j]] = [names[j], names[i]];
      }
      const A = [], B = [], C = [];
      names.forEach((n, i) => (i % 3 === 0 ? A : i % 3 === 1 ? B : C).push(n));

      await sendText(WHATSAPP_TOKEN, PHONE_NUMBER_ID, from,
        `✅ Teams generated:\n\nA: ${A.join(", ")}\nB: ${B.join(", ")}\nC: ${C.join(", ")}`
      );

      return res.status(200).end();
    } catch (e) {
      console.error(e);
      return res.status(200).end();
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}

async function sendText(token, phoneNumberId, to, body) {
  await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      text: { body }
    })
  });
}
