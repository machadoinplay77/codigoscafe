const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const partes = event.path.split("/");
  let index = parseInt(partes[partes.length - 1], 10);
  let comandaId = partes[partes.length - 2];

  // Remove possíveis query strings
  if (comandaId && comandaId.includes("?")) {
    comandaId = comandaId.split("?")[0];
  }
  if (!isNaN(index) && partes[partes.length - 1].includes("?")) {
    index = parseInt(partes[partes.length - 1].split("?")[0], 10);
  }

  if (!comandaId || isNaN(index)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Parametros invalidos", path: event.path })
    };
  }

  try {
    const store = getStore({ name: "comandas", consistency: "strong" });
    const chave = "comanda-" + comandaId;
    const dados = (await store.get(chave, { type: "json" })) || [];

    if (index < 0 || index >= dados.length) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Item nao encontrado" })
      };
    }

    dados.splice(index, 1);
    await store.setJSON(chave, dados);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ sucesso: true, itens: dados })
    };

  } catch (err) {
    console.error("Erro ao remover item:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};