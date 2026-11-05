"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ruta = path.join(__dirname, "../js/importacion-aplicar.js");
const codigo = fs.readFileSync(ruta, "utf8")
    .replace(/^import[\s\S]*?from "[^"]+";$/gm, "")
    .replace(/^export /gm, "");

const filas = [
    { tipo: "bono", concepto: "Bono anual", importe: "100.00" },
    { tipo: "descuento", concepto: "Préstamo", importe: "25.50" },
    { tipo: "incentivo", concepto: "Metas", importe: "10.00" }
];

// Convierte los datos creados dentro de vm en objetos comunes.
const copiar = valor => JSON.parse(JSON.stringify(valor));

// falla: nombre de la función del formulario que rechaza los datos.
function crearEntorno({ falla = null, integrado = true } = {}) {
    const cambios = {};

    function registrar(nombre) {
        return datos => {
            if (nombre === falla) throw new Error("Datos inválidos");
            cambios[nombre] = copiar(datos);
        };
    }

    const contexto = {
        obtenerIngresos: () => (integrado ? { detalle: [] } : null),
        normalizarIngresos: registrar("validarIngresos"),
        reemplazarDescuentosManuales: registrar("descuentos"),
        reemplazarIngresos: registrar("ingresos")
    };

    vm.runInNewContext(codigo, contexto);

    return { aplicar: contexto.aplicarImportacion, cambios };
}

test("HU-22: aplica bonos e incentivos importados", () => {
    const { aplicar, cambios } = crearEntorno();

    aplicar(filas);

    assert.deepEqual(cambios.ingresos, [
        { tipo: "Bono", concepto: "Bono anual", importe: "100.00", origen: "CSV" },
        { tipo: "Incentivo", concepto: "Metas", importe: "10.00", origen: "CSV" }
    ]);
});

test("HU-22: aplica descuentos importados", () => {
    const { aplicar, cambios } = crearEntorno();

    aplicar(filas);

    assert.deepEqual(cambios.descuentos, [
        { concepto: "Préstamo", importe: "25.50", origen: "CSV" }
    ]);
});

test("HU-22: no cambia el formulario si un ingreso es inválido", () => {
    const { aplicar, cambios } = crearEntorno({ falla: "validarIngresos" });

    assert.throws(() => aplicar(filas));
    assert.deepEqual(cambios, {});
});

test("HU-22: no cambia los ingresos si un descuento es inválido", () => {
    const { aplicar, cambios } = crearEntorno({ falla: "descuentos" });

    assert.throws(() => aplicar(filas));
    assert.equal(cambios.ingresos, undefined);
});

test("HU-22: no aplica cambios sin el formulario de ingresos", () => {
    const { aplicar, cambios } = crearEntorno({ integrado: false });

    assert.throws(() => aplicar(filas), /todavía no está integrado/);
    assert.deepEqual(cambios, {});
});
