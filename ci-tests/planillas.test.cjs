"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const crearServicioPlanillas = require("../api_/services/planillas");

function simularSupabase({ filas = [], total = filas.length, error = null } = {}) {
    const llamadas = [];

    return {
        llamadas,
        from(tabla) {
            llamadas.push(["from", tabla]);

            return {
                select(_, { count }) {
                    llamadas.push(["count", count]);
                    return this;
                },
                eq(campo, valor) {
                    llamadas.push(["eq", campo, valor]);
                    return this;
                },
                order(campo, { ascending }) {
                    llamadas.push(["order", campo, ascending]);
                    return this;
                },
                range(desde, hasta) {
                    llamadas.push(["range", desde, hasta]);
                    return Promise.resolve({ data: filas, count: total, error });
                }
            };
        }
    };
}

// HU-25: Filtrar por empleado
test("HU-25: filtra por empleado y cuenta registros", async () => {
    const db = simularSupabase({ filas: [{ empleado_id: "EMP001" }], total: 23 });
    const resultado = await crearServicioPlanillas(db)
        .consultarHistorial({ empleadoId: "EMP001" });

    assert.ok(db.llamadas.some(c => c[0] === "from" && c[1] === "planillas"));
    assert.ok(db.llamadas.some(c => c[0] === "count" && c[1] === "exact"));
    assert.ok(db.llamadas.some(c =>
        c[0] === "eq" && c[1] === "empleado_id" && c[2] === "EMP001"
    ));

    assert.equal(resultado.totalRegistros, 23);
    assert.equal(resultado.totalPaginas, 3);
    assert.equal(resultado.tamanoPagina, 10);
});

// HU-25: Segunda página
test("HU-25: segunda página consulta registros 11 al 20", async () => {
    const db = simularSupabase({ total: 23 });
    const resultado = await crearServicioPlanillas(db)
        .consultarHistorial({ pagina: 2 });

    assert.deepEqual(db.llamadas.at(-1), ["range", 10, 19]);
    assert.equal(resultado.pagina, 2);
});

// HU-25: Tercera página
test("HU-25: tercera página consulta registros 21 al 30", async () => {
    const db = simularSupabase({
        filas: [{ id: 21 }, { id: 22 }, { id: 23 }],
        total: 23
    });

    const resultado = await crearServicioPlanillas(db)
        .consultarHistorial({ pagina: 3 });

    assert.deepEqual(db.llamadas.at(-1), ["range", 20, 29]);
    assert.equal(resultado.planillas.length, 3);
});

// HU-25: Ordenamiento
test("HU-25: orden descendente y consulta general", async () => {
    const db = simularSupabase();
    await crearServicioPlanillas(db).consultarHistorial();

    assert.deepEqual(db.llamadas.filter(c => c[0] === "order"), [
        ["order", "anio", false],
        ["order", "mes", false],
        ["order", "fecha_guardado", false],
        ["order", "id", false]
    ]);

    assert.equal(db.llamadas.some(c => c[0] === "eq"), false);
    assert.deepEqual(db.llamadas.at(-1), ["range", 0, 9]);
});

// HU-25: Sin registros
test("HU-25: historial vacío", async () => {
    const resultado = await crearServicioPlanillas(
        simularSupabase()
    ).consultarHistorial();

    assert.deepEqual(resultado.planillas, []);
    assert.equal(resultado.totalRegistros, 0);
    assert.equal(resultado.totalPaginas, 0);
});

// HU-25: Error de Supabase
test("HU-25: propaga errores de Supabase", async () => {
    const error = new Error("Consulta fallida");

    await assert.rejects(
        crearServicioPlanillas(
            simularSupabase({ error })
        ).consultarHistorial(),
        error
    );
});

