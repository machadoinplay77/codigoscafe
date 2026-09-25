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
  const partes = url.pathname.split("/").filter(Boolean);
  const comandaId = partes[partes.length - 1];

  if (!comandaId || comandaId === "comanda") {
    return new Response(
      JSON.stringify({ error: "ID da comanda nao informado" }),
      {
        status: 400,
        headers,
      }
    );
  }

  const store = getStore({
    name: "comandas",
    consistency: "strong"
  });

  const chave = "comanda-" + comandaId;

  try {

    // =========================
    // LER COMANDA
    // =========================
    if (request.method === "GET") {

      const dados = await store.get(chave, {
        type: "json"
      });

      return new Response(
        JSON.stringify(dados || []),
        {
          status: 200,
          headers
        }
      );
    }


    // =========================
    // ADICIONAR ITEM
    // =========================
    if (request.method === "POST") {

      const body = await request.json();

      const barcode = body.barcode;
      const quantidade = body.quantidade || 1;

      if (!barcode) {

        return new Response(
          JSON.stringify({
            error: "Codigo de barras nao informado"
          }),
          {
            status: 400,
            headers
          }
        );
      }

      const dados =
        (await store.get(chave, {
          type: "json"
        })) || [];

      for (let i = 0; i < quantidade; i++) {
        dados.push(String(barcode));
      }

      await store.setJSON(chave, dados);

      return new Response(
        JSON.stringify({
          sucesso: true,
          itens: dados
        }),
        {
          status: 200,
          headers
        }
      );
    }


    // =========================
    // DELETE
    // =========================
    if (request.method === "DELETE") {

      const codigo = url.searchParams.get("codigo");

      const dados =
        (await store.get(chave, {
          type: "json"
        })) || [];


      // ---------------------------------
      // SE TIVER CODIGO:
      // REMOVE SOMENTE 1 ITEM
      // ---------------------------------
      if (codigo) {

        const indice = dados.indexOf(String(codigo));

        if (indice === -1) {

          return new Response(
            JSON.stringify({
              sucesso: false,
              error: "Item nao encontrado",
              itens: dados
            }),
            {
              status: 404,
              headers
            }
          );
        }

        // Remove SOMENTE uma ocorrência
        dados.splice(indice, 1);

        await store.setJSON(chave, dados);

        return new Response(
          JSON.stringify({
            sucesso: true,
            removido: codigo,
            itens: dados
          }),
          {
            status: 200,
            headers
          }
        );
      }


      // ---------------------------------
      // SEM CODIGO:
      // LIMPA A COMANDA INTEIRA
      // ---------------------------------
      await store.setJSON(chave, []);

      return new Response(
        JSON.stringify({
          sucesso: true,
          itens: []
        }),
        {
          status: 200,
          headers
        }
      );
    }


    // =========================
    // MÉTODO NÃO PERMITIDO
    // =========================

    return new Response(
      JSON.stringify({
        error: "Metodo nao permitido"
      }),
      {
        status: 405,
        headers
      }
    );

  } catch (err) {

    console.error(
      "Erro na funcao comanda:",
      err
    );

    return new Response(
      JSON.stringify({
        error: err.message
      }),
      {
        status: 500,
        headers
      }
    );
  }
};
