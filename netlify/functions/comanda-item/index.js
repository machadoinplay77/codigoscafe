import { getStore } from "@netlify/blobs";

export default async (request, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") {
    return new Response("", { status: 200, headers });
  }

  const url = new URL(request.url);
  const partes = url.pathname.split("/");
  const index = parseInt(partes[partes.length - 1], 10);
  const comandaId = partes[partes.length - 2];

  if (!comandaId || isNaN(index)) {
    return new Response(JSON.stringify({ error: "Parametros invalidos" }), {
      status: 400,
      headers,
    });
  }

  const store = getStore("comandas");
  const chave = "comanda-" + comandaId;

  try {
    const dados = (await store.get(chave, { type: "json" })) || [];

    if (index < 0 || index >= dados.length) {
      return new Response(JSON.stringify({ error: "Item nao encontrado" }), {
        status: 404,
        headers,
      });
    }

    dados.splice(index, 1);
    await store.setJSON(chave, dados);

    return new Response(JSON.stringify({ sucesso: true, itens: dados }), {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error("Erro ao remover item:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers,
    });
  }
};
