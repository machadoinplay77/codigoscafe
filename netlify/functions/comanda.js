const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const partes = event.path.split("/");
  const comandaId = partes[partes.length - 1];

  if (!comandaId || comandaId === "comanda") {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "ID da comanda nao informado" })
    };
  }

  const store = getStore("comandas");
  const chave = "comanda-" + comandaId;

  try {
    if (event.httpMethod === "GET") {
      const dados = await store.get(chave, { type: "json" });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(dados || [])
      };
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const barcode = body.barcode;

      if (!barcode) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Codigo de barras nao informado" })
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
      body: JSON.stringify({ error: "Metodo nao permitido" })
    };

  } catch (err) {
    console.error("Erro na funcao comanda:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
