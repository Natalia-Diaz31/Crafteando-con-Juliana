"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const crearServicioPlanillas = require("../api_/services/planillas");

const ORIGEN = {
    id: 15,
    empleado_id: "empleado-1",
    plantilla_id: "plantilla-2",
    periodo_pago: "mensual",
    ingresos_adicionales: 50
};

// Simulador compartido para HU-25 y HU-27.
function simularSupabase({
    filas = [],
    total = filas.length,
    error = null,
    planilla = ORIGEN,
    ingresos = [],
    descuentos = [],
    errores = {}
} = {}) {
    const llamadas = [];

    return {
        llamadas,
        from(tabla) {
            llamadas.push(["from", tabla]);

            const respuesta = {
                data: tabla === "planillas" ? planilla :
                    tabla === "planilla_ingresos" ? ingresos : descuentos,
                error: errores[tabla] ?? null
            };

            return {
                select(campos, opciones = {}) {
                    llamadas.push(["select", campos]);
                    if (opciones.count) {
                        llamadas.push(["count", opciones.count]);
                    }
                    return this;
                },

                eq(campo, valor) {
                    llamadas.push(["eq", campo, valor]);
                    return this;
                },
                
                or(filtro) {
                    llamadas.push(["or", filtro]);
                    return this;
                },
                limit(cantidad) {
                    llamadas.push(["limit", cantidad]);
                    return this;
                },

                order(campo, { ascending }) {
                    llamadas.push(["order", campo, ascending]);
                    return this;
                },
                range(desde, hasta) {
                    llamadas.push(["range", desde, hasta]);
                    return Promise.resolve({
                        data: filas,
                        count: total,
                        error
                    });
                },
                maybeSingle() {
                    return Promise.resolve(respuesta);
                },
                then(resolve, reject) {
                    return Promise.resolve(respuesta).then(resolve, reject);
                }
            };
        }
    };
}

// ==========================================
// HU-25: HISTORIAL DE PLANILLAS
// ==========================================

test("HU-25: filtra por empleado y cuenta registros", async () => {
    const db = simularSupabase({
        filas: [{ empleado_id: "EMP001" }],
        total: 23
    });

    const resultado = await crearServicioPlanillas(db)
        .consultarHistorial({ empleadoId: "EMP001" });

    assert.ok(db.llamadas.some(c =>
        c[0] === "from" && c[1] === "planillas"
    ));

    assert.ok(db.llamadas.some(c =>
        c[0] === "count" && c[1] === "exact"
    ));

    assert.ok(db.llamadas.some(c =>
        c[0] === "eq" &&
        c[1] === "empleado_id" &&
        c[2] === "EMP001"
    ));

    assert.equal(resultado.totalRegistros, 23);
    assert.equal(resultado.totalPaginas, 3);
    assert.equal(resultado.tamanoPagina, 10);
});

test("HU-25: segunda página consulta registros 11 al 20", async () => {
    const db = simularSupabase({ total: 23 });

    const resultado = await crearServicioPlanillas(db)
        .consultarHistorial({ pagina: 2 });

    assert.deepEqual(db.llamadas.at(-1), ["range", 10, 19]);
    assert.equal(resultado.pagina, 2);
});

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

test("HU-25: orden descendente y consulta general", async () => {
    const db = simularSupabase();

    await crearServicioPlanillas(db).consultarHistorial();

    assert.deepEqual(
        db.llamadas.filter(c => c[0] === "order"),
        [
            ["order", "anio", false],
            ["order", "mes", false],
            ["order", "fecha_guardado", false],
            ["order", "id", false]
        ]
    );

    assert.equal(
        db.llamadas.some(c => c[0] === "eq"),
        false
    );

    assert.deepEqual(db.llamadas.at(-1), ["range", 0, 9]);
});

test("HU-25: historial vacío", async () => {
    const resultado = await crearServicioPlanillas(
        simularSupabase()
    ).consultarHistorial();

    assert.deepEqual(resultado.planillas, []);
    assert.equal(resultado.totalRegistros, 0);
    assert.equal(resultado.totalPaginas, 0);
});

test("HU-25: propaga errores de Supabase", async () => {
    const error = new Error("Consulta fallida");

    await assert.rejects(
        crearServicioPlanillas(
            simularSupabase({ error })
        ).consultarHistorial(),
        error
    );
});

// ==========================================
// HU-27: DUPLICACIÓN DE PLANILLAS
// ==========================================

test("HU-27: recupera origen, ingresos y descuentos", async () => {
    const ingresos = [
        {
            tipo: "bono",
            concepto: "Bono",
            importe: 50,
            origen: "Manual"
        }
    ];

    const descuentos = [
        {
            concepto: "Anticipo",
            importe: 10,
            origen: "Manual"
        }
    ];

    const db = simularSupabase({ ingresos, descuentos });

    const resultado = await crearServicioPlanillas(db)
        .consultarOrigenDuplicacion(15);

    assert.deepEqual(resultado, {
        ...ORIGEN,
        ingresos_detalle: ingresos,
        descuentos
    });

    assert.deepEqual(
        db.llamadas.filter(c => c[0] === "from").map(c => c[1]),
        ["planillas", "planilla_ingresos", "planilla_descuentos"]
    );

    assert.deepEqual(
        db.llamadas.filter(c => c[0] === "eq"),
        [
            ["eq", "id", 15],
            ["eq", "planilla_id", 15],
            ["eq", "planilla_id", 15]
        ]
    );
});

test("HU-27: devuelve lista vacía sin ingresos", async () => {
    const resultado = await crearServicioPlanillas(
        simularSupabase({
            planilla: {
                ...ORIGEN,
                ingresos_adicionales: 0
            }
        })
    ).consultarOrigenDuplicacion(15);

    assert.deepEqual(resultado.ingresos_detalle, []);
    assert.deepEqual(resultado.descuentos, []);
});

test("HU-27: identifica ingresos sin desglose", async () => {
    const resultado = await crearServicioPlanillas(
        simularSupabase()
    ).consultarOrigenDuplicacion(15);

    assert.equal(resultado.ingresos_detalle, null);
});

test("HU-27: identifica importe desconocido", async () => {
    const resultado = await crearServicioPlanillas(
        simularSupabase({
            planilla: {
                ...ORIGEN,
                ingresos_adicionales: null
            }
        })
    ).consultarOrigenDuplicacion(15);

    assert.equal(resultado.ingresos_detalle, null);
});

test("HU-27: planilla inexistente", async () => {
    const db = simularSupabase({ planilla: null });

    const resultado = await crearServicioPlanillas(db)
        .consultarOrigenDuplicacion(99);

    assert.equal(resultado, null);

    assert.equal(
        db.llamadas.filter(c => c[0] === "from").length,
        1
    );
});

for (const tabla of [
    "planillas",
    "planilla_ingresos",
    "planilla_descuentos"
]) {
    test(`HU-27: propaga errores de ${tabla}`, async () => {
        const error = new Error("Consulta fallida");

        await assert.rejects(
            crearServicioPlanillas(
                simularSupabase({
                    errores: { [tabla]: error }
                })
            ).consultarOrigenDuplicacion(15),
            error
        );
    });
}


test("HU-27: excluye deducciones legales al duplicar", async () => {
    const descuentos = [
        { concepto: "ISSS", importe: 10, origen: "Manual" },
        { concepto: " afp ", importe: 20, origen: "Manual" },
        { concepto: "Renta", importe: 30, origen: "Manual" },
        { concepto: "Préstamo", importe: 40, origen: "Manual" },
        { concepto: "Cuota sindical", importe: 50, origen: "Manual" }
    ];

    const resultado = await crearServicioPlanillas(
        simularSupabase({ descuentos })
    ).consultarOrigenDuplicacion(15);

    assert.deepEqual(resultado.descuentos, descuentos.slice(3));
});


// HU-28: Comparación con planilla mensual anterior

test("HU-28: filtra mismo empleado y período anterior", async () => {
    const anterior = {
        id: 31,
        empleado_id: "EMP002",
        anio: 2026,
        mes: 9,
        periodo_pago: "mensual",
        salario_base: 1000,
        ingresos_adicionales: 50,
        deducciones_legales: 100,
        descuentos_totales: 120,
        total_pagar: 930
    };

    const db = simularSupabase({ planilla: anterior });

    const resultado = await crearServicioPlanillas(db)
        .consultarPlanillaAnterior({
            empleadoId: "EMP002",
            anio: 2026,
            mes: 11
        });

    assert.deepEqual(resultado, anterior);

    assert.deepEqual(
        db.llamadas.filter(c => ["eq", "or"].includes(c[0])),
        [
            ["eq", "empleado_id", "EMP002"],
            ["eq", "periodo_pago", "mensual"],
            ["or", "anio.lt.2026,and(anio.eq.2026,mes.lt.11)"]
        ]
    );
});

test("HU-28: permite consultar años anteriores", async () => {
    const db = simularSupabase();

    await crearServicioPlanillas(db)
        .consultarPlanillaAnterior({
            empleadoId: "EMP001",
            anio: 2026,
            mes: 1
        });

    assert.deepEqual(
        db.llamadas.find(c => c[0] === "or"),
        ["or", "anio.lt.2026,and(anio.eq.2026,mes.lt.1)"]
    );
});

test("HU-28: ordena y recupera subtotales guardados", async () => {
    const db = simularSupabase();

    await crearServicioPlanillas(db)
        .consultarPlanillaAnterior({
            empleadoId: "EMP002",
            anio: 2026,
            mes: 11
        });

    assert.deepEqual(
        db.llamadas.filter(c => c[0] === "order"),
        [
            ["order", "anio", false],
            ["order", "mes", false],
            ["order", "fecha_guardado", false],
            ["order", "id", false]
        ]
    );

    assert.deepEqual(
        db.llamadas.find(c => c[0] === "limit"),
        ["limit", 1]
    );

    const campos = db.llamadas.find(c => c[0] === "select")[1];

    for (const campo of [
        "salario_base",
        "ingresos_adicionales",
        "deducciones_legales",
        "descuentos_totales",
        "total_pagar"
    ]) {
        assert.ok(campos.split(", ").includes(campo));
    }
});

test("HU-28: sin planilla anterior devuelve null", async () => {
    const db = simularSupabase({ planilla: null });

    const resultado = await crearServicioPlanillas(db)
        .consultarPlanillaAnterior({
            empleadoId: "EMP001",
            anio: 2026,
            mes: 10
        });

    assert.equal(resultado, null);
});

test("HU-28: propaga errores de Supabase", async () => {
    const error = new Error("Consulta fallida");

    const db = simularSupabase({
        errores: { planillas: error }
    });

    await assert.rejects(
        crearServicioPlanillas(db)
            .consultarPlanillaAnterior({
                empleadoId: "EMP001",
                anio: 2026,
                mes: 10
            }),
        error
    );
});
