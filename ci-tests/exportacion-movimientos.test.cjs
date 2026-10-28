"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");
const { join } = require("node:path");

const preparar = require("../js/exportacion-movimientos");

// Reutilizar la clasificación existente de descuentos legales.
const contexto = { window: {} };

runInNewContext(
    readFileSync(
        join(__dirname, "../js/desglose-planilla.js"),
        "utf8"
    ),
    contexto
);

const separar = contexto.window.separarDescuentosAutorizados;

const base = {
    ingresos_adicionales: "50.00",
    ingresos_detalle: [
        {
            tipo: "Bono",
            concepto: "Productividad",
            origen: "CSV",
            importe: "50.00"
        }
    ],
    deducciones_legales: {
        total: "30.00",
        detalle: [
            { nombre: "ISSS", importe: "30.00" }
        ]
    },
    descuentos_totales: "45.00",
    descuentos: [
        { concepto: "ISSS", importe: "30.00" },
        { concepto: "Préstamo", importe: "15.00" }
    ]
};

// 1. Estructura e importes
test("HU-31: prepara las dos hojas con importes numéricos", () => {
    const hojas = preparar(base, separar);

    assert.deepEqual(
        hojas.map(h => h.nombre),
        ["Ingresos", "Descuentos manuales"]
    );

    assert.deepEqual(hojas[0].filas, [
        ["Bono", "Productividad", "CSV", 50]
    ]);

    assert.deepEqual(hojas[1].filas, [
        ["Préstamo", 15]
    ]);
});

// 2. No eliminar descuentos manuales coincidentes
test("HU-31: excluye cada deducción legal una sola vez", () => {
    const datos = {
        ...base,
        descuentos_totales: "60.00",
        descuentos: [
            { concepto: "ISSS", importe: "30.00" },
            { concepto: "ISSS", importe: "30.00" }
        ]
    };

    assert.deepEqual(
        preparar(datos, separar)[1].filas,
        [["ISSS", 30]]
    );
});

// 3. Ingresos históricos sin desglose
test("HU-31: ingresos sin desglose histórico", () => {
    const hojas = preparar({
        ...base,
        ingresos_detalle: []
    }, separar);

    assert.deepEqual(hojas[0].filas, [
        ["Detalle no registrado"]
    ]);
});

// 4. Descuentos históricos sin desglose
test("HU-31: descuentos sin desglose histórico", () => {
    const hojas = preparar({
        ...base,
        descuentos: []
    }, separar);

    assert.deepEqual(hojas[1].filas, [
        ["Detalle no registrado"]
    ]);
});

// 5. Sin movimientos reales
test("HU-31: distingue listas realmente vacías", () => {
    const hojas = preparar({
        ingresos_adicionales: 0,
        ingresos_detalle: [],
        deducciones_legales: {
            total: 30,
            detalle: [
                { nombre: "ISSS", importe: 30 }
            ]
        },
        descuentos_totales: 30,
        descuentos: [
            { concepto: "ISSS", importe: 30 }
        ]
    }, separar);

    assert.deepEqual(
        hojas.map(h => h.filas),
        [
            [["Sin movimientos"]],
            [["Sin movimientos"]]
        ]
    );
});

// 6. Datos históricos desconocidos
test("HU-31: identifica totales no registrados", () => {
    const hojas = preparar({}, separar);

    assert.deepEqual(
        hojas.map(h => h.filas),
        [
            [["Detalle no registrado"]],
            [["Detalle no registrado"]]
        ]
    );
});

// 7. Importes inválidos
test("HU-31: rechaza importes inválidos", () => {
    assert.throws(() => preparar({
        ...base,
        ingresos_detalle: [
            { tipo: "Bono", concepto: "Prueba", importe: "abc" }
        ]
    }, separar), TypeError);

    assert.throws(() => preparar({
        ...base,
        descuentos: [
            { concepto: "Préstamo", importe: "" }
        ]
    }, separar), TypeError);
});

// 8. No modificar datos originales
test("HU-31: no modifica los datos originales", () => {
    const copia = JSON.parse(JSON.stringify(base));

    preparar(base, separar);

    assert.deepEqual(base, copia);
});

// 9. Entradas obligatorias
test("HU-31: exige datos y función de separación", () => {
    assert.throws(
        () => preparar(null, separar),
        TypeError
    );

    assert.throws(
        () => preparar(base, null),
        TypeError
    );
});
