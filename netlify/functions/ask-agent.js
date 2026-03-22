exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { question, sessionId } = JSON.parse(event.body);

  // 1. Obtener access token
  const tokenRes = await fetch('https://orgfarm-ac1c4d605a-dev-ed.develop.my.salesforce.com/services/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id:     process.env.SF_CLIENT_ID,
      client_secret: process.env.SF_CLIENT_SECRET,
    })
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Auth failed', detail: tokenData }) };
  }
  const accessToken = tokenData.access_token;

  // 2. Crear sesión si no existe
  let activeSessionId = sessionId;
  if (!activeSessionId) {
    const sessionRes = await fetch('https://api.salesforce.com/einstein/ai-agent/v1/agents/0XxgL000001J5eXSAS/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        externalSessionKey: `session_${Date.now()}`,
        instanceConfig: { endpoint: 'https://orgfarm-ac1c4d605a-dev-ed.develop.my.salesforce.com' }
      })
    });
    const sessionData = await sessionRes.json();
    activeSessionId = sessionData.sessionId;
    if (!activeSessionId) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Session creation failed', detail: sessionData }) };
    }
  }

  // 3. Enviar mensaje al agente
  const msgRes = await fetch(`https://api.salesforce.com/einstein/ai-agent/v1/sessions/${activeSessionId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        sequenceId: Date.now(),
        type: 'Text',
        text: question
      }
    })
  });
  const msgData = await msgRes.json();

  // Extraer texto de respuesta
  const reply = msgData.messages?.[0]?.message || 'No response from agent';

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ reply, sessionId: activeSessionId })
  };
};