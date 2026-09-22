const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  // CORS - permite chamadas do mesmo site
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  // Pega o ID da comanda dos query params
  const params = event.queryStringParameters || {};
  const comandaId = params.id;

  if (!comandaId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "ID da comanda não informado" })
    };
  }

  const store = getStore("comandas");
  const chave = `comanda-${comandaId}`;

  try {
    // ============================================
    // GET - Retorna a lista de códigos de barras
    // ============================================
    if (event.httpMethod === "GET") {
      const dados = await store.get(chave, { type: "json" });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(dados || [])
      };
    }

    // ============================================
    // POST - Adiciona um código de barras
    // ============================================
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const barcode = body.barcode;

      if (!barcode) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Código de barras não informado" })
        };
      }

      const dados = (await store.get(chave, { type: "json" })) || [];
      dados.push(barcode);
      await store.setJSON(chave, dados);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ sucesso: true, itens: dados })
      };
    }

    // ============================================
    // DELETE - Limpa a comanda
    // ============================================
    if (event.httpMethod === "DELETE") {
      await store.setJSON(chave, []);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ sucesso: true, itens: [] })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Método não permitido" })
    };

  } catch (err) {
    console.error("Erro na função comanda:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};