import http from 'node:http';

const UMAY_API_URL = 'https://umayzeka.com/v1/chat/completions';
const UMAY_MODELS_URL = 'https://umayzeka.com/v1/models';
const PORT = process.env.PORT || 4000;

function cleanJsonText(raw) {
  if (!raw) return '{}';
  let text = raw.trim();
  // Strip markdown code fences
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '');
    text = text.replace(/\s*```$/, '');
  }
  text = text.trim();
  // Find outermost { ... } or [ ... ]
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');

  if (firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    text = text.substring(firstBrace, lastBrace + 1);
  } else if (firstBracket !== -1 && lastBracket !== -1) {
    text = text.substring(firstBracket, lastBracket + 1);
  }
  return text;
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Handle /v1/models or /models
  if (req.url?.includes('/models')) {
    try {
      const umayRes = await fetch(UMAY_MODELS_URL, {
        headers: {
          'Authorization': req.headers['authorization'] || ''
        }
      });
      const data = await umayRes.text();
      res.writeHead(umayRes.status, { 'Content-Type': 'application/json' });
      res.end(data);
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  // Handle /v1/chat/completions or /chat/completions
  if (req.url?.includes('/chat/completions')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const isStreaming = Boolean(payload.stream);

        // Always ensure an Umay-supported model
        let model = payload.model || 'umay-akilli';
        if (!model.startsWith('umay-')) {
          model = 'umay-akilli';
        }

        const hasTools = Array.isArray(payload.tools) && payload.tools.length > 0;
        const jsonTool = hasTools ? payload.tools.find(t => t.function?.name === 'json') : null;
        const jsonSchema = payload.response_format?.json_schema?.schema || jsonTool?.function?.parameters;
        const wantsJson = Boolean(jsonSchema || payload.response_format?.type === 'json_object' || payload.response_format?.type === 'json_schema');

        console.log(`[Adapter] Model: ${model}, wantsJson: ${wantsJson}, hasTools: ${hasTools}, isStreaming: ${isStreaming}`);

        let messages = payload.messages || [];

        if (wantsJson) {
          const schemaStr = jsonSchema ? JSON.stringify(jsonSchema) : '';
          const instruction = `CRITICAL SYSTEM INSTRUCTION: Output ONLY a valid JSON object matching the requested schema. Do NOT wrap in markdown backticks, do NOT provide introductory or explanatory text. Begin directly with { and end with }.\n${schemaStr ? `JSON_SCHEMA: ${schemaStr}` : ''}`;
          messages = [
            ...messages,
            { role: 'user', content: instruction }
          ];
        }

        const umayBody = {
          model,
          messages,
          stream: isStreaming,
          temperature: payload.temperature ?? 0.1
        };

        if (wantsJson) {
          umayBody.response_format = { type: 'json_object' };
        }

        const umayRes = await fetch(UMAY_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers['authorization'] || ''
          },
          body: JSON.stringify(umayBody)
        });

        if (!umayRes.ok) {
          const errText = await umayRes.text();
          console.error('[Adapter] Upstream Umay error:', umayRes.status, errText);
          res.writeHead(umayRes.status, { 'Content-Type': 'application/json' });
          res.end(errText);
          return;
        }

        if (isStreaming) {
          res.writeHead(umayRes.status, {
            'Content-Type': umayRes.headers.get('content-type') || 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          });
          const reader = umayRes.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
          return;
        }

        const umayData = await umayRes.json();
        const firstChoice = umayData.choices?.[0];
        let content = firstChoice?.message?.content || '';

        if (wantsJson) {
          content = cleanJsonText(content);
          firstChoice.message.content = content;

          if (jsonTool || (hasTools && !firstChoice.message.tool_calls)) {
            const toolName = jsonTool?.function?.name || 'json';
            firstChoice.message.tool_calls = [
              {
                id: 'call_' + Math.random().toString(36).substring(2, 10),
                type: 'function',
                function: {
                  name: toolName,
                  arguments: content
                }
              }
            ];
          }
        }

        // OpenRouter telemetry & billing compatibility
        if (!umayData.usage) {
          umayData.usage = { prompt_tokens: 150, completion_tokens: 100, total_tokens: 250 };
        }
        umayData.usage.cost = 0;
        umayData.providerMetadata = {
          openrouter: {
            usage: {
              cost: 0
            }
          }
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(umayData));
      } catch (err) {
        console.error('[Adapter] Handler error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Health
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', service: 'umay-adapter' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[UmayAdapter] Listening on port ${PORT}`);
});
