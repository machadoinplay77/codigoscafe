import { getStore } from "@netlify/blobs";

export default async (request, context) => {

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",

    // MUITO IMPORTANTE:
    // impede navegador/CDN de guardar uma resposta antiga
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  };

  // =========================
  // CORS
  // =========================

  if (request.method === "OPTIONS") {
    return new Response("", {
      status: 204,
      headers
    });
  }

  try {

    const url = new URL(request.url);

    // Exemplo:
    // /api/comanda/01
    //
    // pathname = /api/comanda/01
    // partes = ["api", "comanda", "01"]

    const partes = url.pathname
      .split("/")
      .filter(Boolean);

    const indiceComanda = partes.indexOf("comanda");

    if (indiceComanda === -1 || !partes[indiceComanda + 1]) {
      return new Response(
        JSON.stringify({
          sucesso: false,
          error: "ID da comanda nao informado"
        }),
        {
          status: 400,
          headers
        }
      );
    }

    // Normaliza:
    // 1  -> 01
    // 01 -> 01
    // 2  -> 02
    // 10 -> 10

    const numero = String(partes[indiceComanda + 1])
      .replace(/\D/g, "");

    if (!numero) {
      return new Response(
        JSON.stringify({
          sucesso: false,
          error: "ID da comanda invalido"
        }),
        {
          status: 400,
          headers
        }
      );
    }

    const comandaId = numero.padStart(2, "0");

    // Aceita somente 01 até 10
    const numeroComanda = Number(comandaId);

    if (
      numeroComanda < 1 ||
      numeroComanda > 10
    ) {
      return new Response(
        JSON.stringify({
          sucesso: false,
          error: "Comanda invalida"
        }),
        {
          status: 400,
          headers
        }
      );
    }

    // =========================
    // BANCO / BLOB
    // =========================

    const store = getStore({
      name: "comandas",
      consistency: "strong"
    });

    // Chave ÚNICA e padronizada
    //
    // Comanda 01:
    // comanda-01
    //
    // Comanda 02:
    // comanda-02

    const chave = `comanda-${comandaId}`;


    // ==========================================================
    // GET
    // ==========================================================

    if (request.method === "GET") {

      const dados =
        await store.get(chave, {
          type: "json"
        });

      const itens = Array.isArray(dados)
        ? dados.map(item => String(item))
        : [];

      return new Response(
        JSON.stringify(itens),
        {
          status: 200,
          headers
        }
      );
    }


    // ==========================================================
    // POST
    // ADICIONAR PRODUTO
    // ==========================================================

    if (request.method === "POST") {

      const body = await request.json();

      const barcode =
        body.barcode ??
        body.codigo ??
        body.code;

      const quantidade =
        Number(body.quantidade ?? 1);

      if (!barcode) {

        return new Response(
          JSON.stringify({
            sucesso: false,
            error: "Codigo de barras nao informado"
          }),
          {
            status: 400,
            headers
          }
        );
      }

      if (
        !Number.isFinite(quantidade) ||
        quantidade < 1
      ) {

        return new Response(
          JSON.stringify({
            sucesso: false,
            error: "Quantidade invalida"
          }),
          {
            status: 400,
            headers
          }
        );
      }


      // Lê o estado ATUAL da comanda

      const dadosExistentes =
        await store.get(chave, {
          type: "json"
        });

      const dados = Array.isArray(dadosExistentes)
        ? dadosExistentes.map(item => String(item))
        : [];


      // Adiciona cada ocorrência

      for (
        let i = 0;
        i < quantidade;
        i++
      ) {
        dados.push(String(barcode));
      }


      // Grava no MESMO Blob que o GET consulta

      await store.setJSON(
        chave,
        dados
      );


      // Retorna o estado efetivamente gravado

      return new Response(
        JSON.stringify({
          sucesso: true,
          comanda: comandaId,
          chave: chave,
          itens: dados
        }),
        {
          status: 200,
          headers
        }
      );
    }


    // ==========================================================
    // DELETE
    // ==========================================================

    if (request.method === "DELETE") {

      const codigo =
        url.searchParams.get("codigo");


      const dadosExistentes =
        await store.get(chave, {
          type: "json"
        });

      const dados = Array.isArray(dadosExistentes)
        ? dadosExistentes.map(item => String(item))
        : [];


      // ----------------------------------------------------------
      // DELETE COM CÓDIGO
      // Remove somente UMA ocorrência
      // ----------------------------------------------------------

      if (codigo) {

        const codigoNormalizado =
          String(codigo);

        const indice =
          dados.indexOf(codigoNormalizado);


        if (indice === -1) {

          return new Response(
            JSON.stringify({
              sucesso: false,
              error: "Item nao encontrado",
              comanda: comandaId,
              itens: dados
            }),
            {
              status: 404,
              headers
            }
          );
        }


        // Remove somente um item

        dados.splice(indice, 1);


        // Salva novamente

        await store.setJSON(
          chave,
          dados
        );


        return new Response(
          JSON.stringify({
            sucesso: true,
            comanda: comandaId,
            removido: codigoNormalizado,
            itens: dados
          }),
          {
            status: 200,
            headers
          }
        );
      }


      // ----------------------------------------------------------
      // DELETE SEM CÓDIGO
      // Limpa toda a comanda
      // ----------------------------------------------------------

      await store.setJSON(
        chave,
        []
      );


      return new Response(
        JSON.stringify({
          sucesso: true,
          comanda: comandaId,
          itens: []
        }),
        {
          status: 200,
          headers
        }
      );
    }


    // ==========================================================
    // MÉTODO NÃO PERMITIDO
    // ==========================================================

    return new Response(
      JSON.stringify({
        sucesso: false,
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
        sucesso: false,
        error: err?.message || "Erro interno"
      }),
      {
        status: 500,
        headers
      }
    );
  }
};
