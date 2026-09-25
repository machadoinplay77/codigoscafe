import { getStore } from "@netlify/blobs";

export default async (request, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") {
    return new Response("", { status: 200, headers });
  }

  const url = new URL(request.url);
  const partes = url.pathname.split("/");
  const comandaId = partes[partes.length - 1];

  if (!comandaId || comandaId === "comanda") {
    return new Response(JSON.stringify({ error: "ID da comanda nao informado" }), {
      status: 400,
      headers,
    });
  }

  // "strong" evita que duas leituras/escritas seguidas (ex.: dois códigos
  // escaneados em sequência rápida) peguem uma versão desatualizada da
  // comanda e acabem sobrescrevendo itens já salvos.
  const store = getStore({ name: "comandas", consistency: "strong" });
  const chave = "comanda-" + comandaId;

  try {
    if (request.method === "GET") {
      const dados = await store.get(chave, { type: "json" });
      return new Response(JSON.stringify(dados || []), { status: 200, headers });
    }

    if (request.method === "POST") {
      const body = await request.json();
      const barcode = body.barcode;

      if (!barcode) {
        return new Response(JSON.stringify({ error: "Codigo de barras nao informado" }), {
          status: 400,
          headers,
        });
      }

      const dados = (await store.get(chave, { type: "json" })) || [];
      dados.push(barcode);
      await store.setJSON(chave, dados);

      return new Response(JSON.stringify({ sucesso: true, itens: dados }), {
        status: 200,
        headers,
      });
    }

    if (request.method === "DELETE") {
      await store.setJSON(chave, []);
      return new Response(JSON.stringify({ sucesso: true, itens: [] }), {
        status: 200,
        headers,
      });
    }

    return new Response(JSON.stringify({ error: "Metodo nao permitido" }), {
      status: 405,
      headers,
    });
  } catch (err) {
    console.error("Erro na funcao comanda:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers,
    });
  }
};
