"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validarDescuentosManuales } = require(
    "../api_/utils/validar-descuentos-manuales"
);

const ERROR_LEGAL =
    "ISSS, AFP y Renta son deducciones automáticas; no las registre manualmente";
const ERROR_FORMATO =
    "Ingrese un importe válido con máximo dos decimales";
const ERROR_RANGO =
    "El importe debe ser mayor que cero y no superar 9999999999.99";

test("HU-33: normaliza conceptos e importes y suma centavos", () => {
    const resultado = validarDescuentosManuales([
        { concepto: "  Préstamo  ", importe: "10.5" },
        { concepto: "Cuota", importe: 2.25 }
    ]);

    assert.deepEqual(resultado, {
        errores: {},
        detalleDescuentos: [
            { concepto: "Préstamo", importe: "10.50" },
            { concepto: "Cuota", importe: "2.25" }
        ],
        descuentos: 1275
    });
});

test("HU-33: una lista vacía suma cero", () => {
    assert.deepEqual(validarDescuentosManuales([]), {
        errores: {},
        detalleDescuentos: [],
        descuentos: 0
    });
});

test("HU-33: rechaza valores que no son listas", () => {
    for (const entrada of [null, undefined, {}, "texto"]) {
        assert.deepEqual(validarDescuentosManuales(entrada), {
            errores: {
                descuentos: "Debe enviar una lista de descuentos"
            },
            detalleDescuentos: [],
            descuentos: null
        });
    }
});

test("HU-33: impide ISSS, AFP y Renta como conceptos manuales", () => {
    for (const concepto of [" isss ", "aFp", "RENTA"]) {
        const resultado = validarDescuentosManuales([
            { concepto, importe: "1.00" }
        ]);

        assert.equal(
            resultado.errores["descuentos[0].concepto"],
            ERROR_LEGAL
        );
    }
});

test("HU-33: identifica el concepto obligatorio", () => {
    const resultado = validarDescuentosManuales([
        { concepto: "   ", importe: "2.00" }
    ]);

    assert.equal(
        resultado.errores["descuentos[0].concepto"],
        "El concepto es obligatorio"
    );
    assert.deepEqual(resultado.detalleDescuentos, []);
    assert.equal(resultado.descuentos, 200);
});

test("HU-33: rechaza formatos monetarios inválidos", () => {
    for (const importe of [
        "", "abc", "1.234", "-1", "1e3", null, true
    ]) {
        const resultado = validarDescuentosManuales([
            { concepto: "Cuota", importe }
        ]);

        assert.equal(
            resultado.errores["descuentos[0].importe"],
            ERROR_FORMATO
        );
        assert.equal(resultado.descuentos, 0);
    }
});

test("HU-33: rechaza cero e importes mayores al máximo", () => {
    for (const importe of ["0", "0.00", "10000000000.00"]) {
        const resultado = validarDescuentosManuales([
            { concepto: "Cuota", importe }
        ]);

        assert.equal(
            resultado.errores["descuentos[0].importe"],
            ERROR_RANGO
        );
    }
});

test("HU-33: acepta el importe máximo permitido", () => {
    const resultado = validarDescuentosManuales([
        { concepto: "Anticipo", importe: "9999999999.99" }
    ]);

    assert.deepEqual(resultado.errores, {});
    assert.equal(resultado.descuentos, 999999999999);
    assert.equal(
        resultado.detalleDescuentos[0].importe,
        "9999999999.99"
    );
});

test("HU-33: detecta cuando la suma excede el máximo", () => {
    const resultado = validarDescuentosManuales([
        { concepto: "A", importe: "9999999999.99" },
        { concepto: "B", importe: "0.01" }
    ]);

    assert.equal(
        resultado.errores.descuentos,
        "La suma de descuentos supera el monto permitido"
    );
    assert.equal(resultado.descuentos, null);
});

test("HU-33: conserva los índices de errores y procesa otros ítems", () => {
    const resultado = validarDescuentosManuales([
        { concepto: "A", importe: "abc" },
        { concepto: "B", importe: "3.00" }
    ]);

    assert.equal(
        resultado.errores["descuentos[0].importe"],
        ERROR_FORMATO
    );
    assert.deepEqual(resultado.detalleDescuentos, [
        { concepto: "B", importe: "3.00" }
    ]);
    assert.equal(resultado.descuentos, 300);
});

test("HU-33: no modifica la lista original", () => {
    const original = [
        { concepto: "  Anticipo  ", importe: "12.50" }
    ];
    const copia = structuredClone(original);

    validarDescuentosManuales(original);

    assert.deepEqual(original, copia);
});
