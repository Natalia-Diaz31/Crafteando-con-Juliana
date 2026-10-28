
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const crearServicioPlanillas = require(
    "../api_/services/planillas"
);

const EMPLEADO_A = "11111111-1111-4111-8111-111111111111";
const EMPLEADO_B = "22222222-2222-4222-8222-222222222222";

const PLANILLAS = Array.from({ length: 25 }, (_, i) => ({
    id: String(i + 1).padStart(3, "0"),
    empleado_id: i < 23 ? EMPLEADO_A : EMPLEADO_B,
    anio: i % 2 ? 2025 : 2026,
    mes: (i % 12) + 1,
    fecha_guardado: `2026-10-${String((i % 28) + 1).padStart(2, "0")}`,
    total_pagar: 100 + i
}));

// Simulador de Supabase para las pruebas unitarias
function simularSupabase(filas = PLANILLAS, fallo = null) {
    const registro = {
        tabla: null,
        filtros: [],
        ordenes: [],
        rango: null,
        conteo: null
    };

    const consulta = {
        select(columnas, opciones) {
            registro.conteo = opciones.count;
            return consulta;
        },

        eq(campo, valor) {
            registro.filtros.push([campo, valor]);
            return consulta;
        },

        order(campo, opciones) {
            registro.ordenes.push([campo, opciones.ascending]);
            return consulta;
        },

        range(desde, hasta) {
            registro.rango = [desde, hasta];
            return consulta;
        },

        then(resolver, rechazar) {
            let datos = [...filas];

            for (const [campo, valor] of registro.filtros) {
                datos = datos.filter(
                    fila => fila[campo] === valor
                );
            }

            const total = datos.length;

            datos.sort((a, b) => {
                for (const [campo, asc] of registro.ordenes) {
                    const comparacion =
                        a[campo] < b[campo] ? -1 :
                        a[campo] > b[campo] ? 1 : 0;

                    if (comparacion !== 0) {
                        return asc ? comparacion : -comparacion;
                    }
                }
                return 0;
            });

            if (registro.rango) {
                datos = datos.slice(
                    registro.rango[0],
                    registro.rango[1] + 1
                );
            }

            return Promise.resolve({
                data: fallo ? null : datos,
                count: fallo ? null : total,
                error: fallo
            }).then(resolver, rechazar);
        }
    };

    return {
        registro,
        from(tabla) {
            registro.tabla = tabla;
            return consulta;
        }
    };
}

// PRUEBA 1: Filtrado por empleado
test("HU-25: filtrar por empleado", async () => {
    const db = simularSupabase();

    const resultado = await crearServicioPlanillas(db)
        .consultarHistorial({ empleadoId: EMPLEADO_A });

    assert.equal(db.registro.tabla, "planillas");
    assert.equal(db.registro.conteo, "exact");
    assert.equal(resultado.totalRegistros, 23);
    assert.equal(resultado.totalPaginas, 3);
    assert.equal(resultado.planillas.length, 10);

    assert.ok(resultado.planillas.every(
        p => p.empleado_id === EMPLEADO_A
    ));
});

// PRUEBA 2: Paginación
test("HU-25: paginar diez registros", async () => {
    const db = simularSupabase();
    const servicio = crearServicioPlanillas(db);

    const segunda = await servicio.consultarHistorial({
        empleadoId: EMPLEADO_A,
        pagina: 2
    });

    assert.deepEqual(db.registro.rango, [10, 19]);
    assert.equal(segunda.planillas.length, 10);

    const tercera = await servicio.consultarHistorial({
        empleadoId: EMPLEADO_A,
        pagina: 3
    });

    assert.deepEqual(db.registro.rango, [20, 29]);
    assert.equal(tercera.planillas.length, 3);
});

// PRUEBA 3: Ordenamiento por período
test("HU-25: ordenar por periodo", async () => {
    const db = simularSupabase();

    const resultado = await crearServicioPlanillas(db)
        .consultarHistorial();

    assert.deepEqual(db.registro.ordenes, [
        ["anio", false],
        ["mes", false],
        ["fecha_guardado", false],
        ["id", false]
    ]);

    assert.equal(resultado.totalRegistros, 25);

    for (let i = 1; i < resultado.planillas.length; i++) {
        const anterior = resultado.planillas[i - 1];
        const actual = resultado.planillas[i];

        assert.ok(
            anterior.anio > actual.anio ||
            (
                anterior.anio === actual.anio &&
                anterior.mes >= actual.mes
            )
        );
    }
});

// PRUEBA 4: Ordenamiento por fecha
test("HU-25: ordenar por fecha de guardado", async () => {
    const filas = [
        {
            id: "1",
            anio: 2026,
            mes: 10,
            fecha_guardado: "2026-10-01"
        },
        {
            id: "2",
            anio: 2026,
            mes: 10,
            fecha_guardado: "2026-10-27"
        }
    ];

    const resultado = await crearServicioPlanillas(
        simularSupabase(filas)
    ).consultarHistorial();

    assert.deepEqual(
        resultado.planillas.map(p => p.id),
        ["2", "1"]
    );
});

// PRUEBA 5: Historial vacío
test("HU-25: historial sin registros", async () => {
    const resultado = await crearServicioPlanillas(
        simularSupabase([])
    ).consultarHistorial();

    assert.deepEqual(resultado.planillas, []);
    assert.equal(resultado.totalRegistros, 0);
    assert.equal(resultado.totalPaginas, 0);
});

// PRUEBA 6: Errores de Supabase
test("HU-25: manejar errores de Supabase", async () => {
    const error = new Error("Consulta no disponible");

    await assert.rejects(
        crearServicioPlanillas(
            simularSupabase([], error)
        ).consultarHistorial(),
        error
    );
});
