
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ReglasNomina = require("../api_/utils/reglas-nomina.js");

const ruta = path.resolve(
    __dirname,
    "../js/entradas-totales-planilla.js"
);

const codigo = fs.readFileSync(ruta, "utf8")
    .replace(
        "export function prepararEntradasTotales",
        "function prepararEntradasTotales"
    );

const contexto = vm.createContext({});

vm.runInContext(
    `${codigo}
    globalThis.funcionProbada = prepararEntradasTotales;`,
    contexto
);

const prepararEntradasTotales = contexto.funcionProbada;

function crearDatos(cambios = {}) {
    return {
        salarioAplicable: "840.00",
        ingresosAdicionales: "50.00",
        deduccionesLegales: {
            total: "100.00"
        },
        ...cambios
    };
}

test("HU-34: convierte los importes a centavos", () => {
    const resultado = prepararEntradasTotales(
        crearDatos(),
        ReglasNomina
    );

    assert.equal(resultado.salario, 84000);
    assert.equal(resultado.ingresosAdicionales, 5000);
    assert.equal(resultado.deduccionesLegales, 10000);
});

test("HU-34: acepta un salario proporcional ya calculado", () => {
    const resultado = prepararEntradasTotales(
        crearDatos({
            salarioAplicable: "420.00"
        }),
        ReglasNomina
    );

    assert.equal(resultado.salario, 42000);
});

test("HU-34: acepta importes de cero", () => {
    const resultado = prepararEntradasTotales(
        crearDatos({
            salarioAplicable: "0.00",
            ingresosAdicionales: "0.00",
            deduccionesLegales: {
                total: "0.00"
            }
        }),
        ReglasNomina
    );

    assert.equal(resultado.salario, 0);
    assert.equal(resultado.ingresosAdicionales, 0);
    assert.equal(resultado.deduccionesLegales, 0);
});

test("HU-34: rechaza importes negativos", () => {
    assert.throws(
        () => prepararEntradasTotales(
            crearDatos({
                salarioAplicable: "-100.00"
            }),
            ReglasNomina
        )
    );
});

test("HU-34: rechaza importes con más de dos decimales", () => {
    assert.throws(
        () => prepararEntradasTotales(
            crearDatos({
                ingresosAdicionales: "50.999"
            }),
            ReglasNomina
        )
    );
});

test("HU-34: rechaza deducciones legales ausentes", () => {
    assert.throws(
        () => prepararEntradasTotales(
            crearDatos({
                deduccionesLegales: null
            }),
            ReglasNomina
        ),
        /deducciones legales no están disponibles/
    );
});

test("HU-34: rechaza un motor monetario ausente", () => {
    assert.throws(
        () => prepararEntradasTotales(
            crearDatos(),
            null
        ),
        /motor monetario no está disponible/
    );
});

test("HU-34: no modifica los datos recibidos", () => {
    const datos = crearDatos();
    const copia = JSON.stringify(datos);

    prepararEntradasTotales(datos, ReglasNomina);

    assert.equal(JSON.stringify(datos), copia);
});

test("HU-34: las entradas funcionan con el cálculo compartido", () => {
    const entradas = prepararEntradasTotales(
        crearDatos(),
        ReglasNomina
    );

    const descuentosManuales = 2500;

    const totalIngresos =
        entradas.salario + entradas.ingresosAdicionales;

    const totalDescuentos =
        entradas.deduccionesLegales + descuentosManuales;

    assert.equal(totalIngresos, 89000);
    assert.equal(totalDescuentos, 12500);
    assert.equal(totalIngresos - totalDescuentos, 76500);
});
