// ARCHIVO: Pruebas del cálculo por días en el formulario
// Buscar: pruebas salario por días, HU-19

"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ReglasNomina = require("../js/reglas-nomina.js");

const ruta = path.join(__dirname, "../js/salario-dias.js");
const codigo = fs.readFileSync(ruta, "utf8")
    .replace('import { obtenerEstadoNovedades } from "./novedades.js";', "")
    .replace("export function esPlanillaPorDias", "function esPlanillaPorDias");

// Qué hace: Crea un campo de formulario falso
// Buscar: crearCampo
function crearCampo(valor) {
    const eventos = {};

    return {
        value: valor,
        readOnly: false,
        addEventListener: (tipo, accion) => { eventos[tipo] = accion; },
        dispatchEvent() {},
        cambiar(nuevoValor) {
            this.value = nuevoValor;
            eventos.change();
        }
    };
}

// Qué hace: Carga salario-dias.js con campos falsos
// Buscar: crearEntorno
function crearEntorno({ salario = "1100.00", frecuencia = "mensual", dias = 30, conProporcional = true } = {}) {
    const campos = {
        "salario": crearCampo(salario),
        "periodo-pago": crearCampo(frecuencia)
    };

    if (conProporcional) {
        campos["salario-proporcional"] = crearCampo("");
    }

    let iniciar = () => {};

    const contexto = {
        Event: class {},
        ReglasNomina,
        obtenerEstadoNovedades: () => ({ diasRemunerados: dias }),
        document: {
            getElementById: id => campos[id] ?? null,
            addEventListener(tipo, accion) {
                if (tipo === "DOMContentLoaded") iniciar = accion;
            }
        }
    };

    vm.runInNewContext(codigo, contexto);
    iniciar();

    return { campos, esPlanillaPorDias: contexto.esPlanillaPorDias };
}

test("HU-19: calcula por días solo las planillas mensuales", () => {
    assert.equal(crearEntorno({ frecuencia: "mensual" }).esPlanillaPorDias(), true);
    assert.equal(crearEntorno({ frecuencia: "quincenal" }).esPlanillaPorDias(), false);
    assert.equal(crearEntorno({ frecuencia: "semanal" }).esPlanillaPorDias(), false);
});

test("HU-19: no calcula por días sin el campo de salario proporcional", () => {
    assert.equal(crearEntorno({ conProporcional: false }).esPlanillaPorDias(), false);
});

test("HU-19: calcula el salario según los días remunerados", () => {
    const { campos } = crearEntorno({ salario: "1100.00", dias: 25 });

    assert.equal(campos["salario-proporcional"].value, "916.67");
    assert.equal(campos["salario-proporcional"].readOnly, true);
});

test("HU-19: conserva el salario completo en quincenal y semanal", () => {
    for (const frecuencia of ["quincenal", "semanal"]) {
        const { campos } = crearEntorno({ salario: "1100.00", dias: 25 });

        campos["periodo-pago"].cambiar(frecuencia);

        assert.equal(campos["salario-proporcional"].value, "1100.00");
    }
});

test("HU-19: deja vacío el salario proporcional si el salario es inválido", () => {
    const { campos } = crearEntorno({ salario: "abc" });

    assert.equal(campos["salario-proporcional"].value, "");
});
