exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { question, sessionId } = JSON.parse(event.body);

  // 1. Obtener access token de Salesforce
  const tokenRes = await fetch('https://login.salesforce.com/services/oauth2/token', {
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

  const instanceUrl  = tokenData.instance_url;
  const accessToken  = tokenData.access_token;

  // 2. Llamar al agente de Salesforce
  const agentRes = await fetch(
    `${instanceUrl}/services/data/v60.0/agentforce/agents/0XxgL000001J5eXSAS/invoke`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: { text: question },
        sessionId: sessionId || undefined
      })
    }
  );
  const agentData = await agentRes.json();

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(agentData)
  };
};