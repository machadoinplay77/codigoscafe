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
  const partes = url.pathname.split("/").filter(Boolean);

  // A URL chega como: /.netlify/functions/comanda-item/{id}?codigo=XXXX
  // Extrai o ID da comanda (último segmento)
  const comandaId = partes[partes.length - 1];
  const codigo = url.searchParams.get("codigo");

  if (!comandaId || !codigo) {
    return new Response(JSON.stringify({ error: "Parametros invalidos" }), {
      status: 400,
      headers,
    });
  }

  const store = getStore({ name: "comandas", consistency: "strong" });
  const chave = "comanda-" + comandaId;

  try {
    const dados = (await store.get(chave, { type: "json" })) || [];

    // Remove a PRIMEIRA ocorrência do código
    const idx = dados.indexOf(codigo);
    if (idx === -1) {
      return new Response(JSON.stringify({ error: "Item nao encontrado", itens: dados }), {
        status: 404,
        headers,
      });
    }

    dados.splice(idx, 1);
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
