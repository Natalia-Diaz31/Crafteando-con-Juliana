
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const carpetaJS = path.join(__dirname, "../js");

function leerArchivo(nombre) {
    return fs.readFileSync(
        path.join(carpetaJS, nombre),
        "utf8"
    );
}

function cargarModulo(nombre, contexto) {
    const codigo = leerArchivo(nombre)
        .replace(
            /^\s*import\s*\{[\s\S]*?\}\s*from\s*["'][^"']+["'];?/gm,
            ""
        )
        .replaceAll("export function ", "function ")
        .replaceAll("export const ", "const ");

    vm.runInContext(codigo, contexto);
}

function prepararEntorno(opciones = {}) {
    const eventos = {};
    const elementos = {};

    function elemento(id) {
        if (!elementos[id]) {
            elementos[id] = {
                id,
                value: "",
                textContent: "",
                disabled: false,
                classList: {
                    toggle() {},
                    remove() {}
                },
                setAttribute() {},
                addEventListener() {},
                after() {},
                replaceChildren() {},
                append() {}
            };
        }

        return elementos[id];
    }

    const documento = {
        addEventListener(nombre, fn) {
            if (!eventos[nombre]) eventos[nombre] = [];
            eventos[nombre].push(fn);
        },
        getElementById(id) {
            if (
                id === "salario-proporcional" &&
                !opciones.porDias
            ) {
                return null;
            }

            return elemento(id);
        },
        createElement() {
            return elemento(`creado-${Object.keys(elementos).length}`);
        }
    };

    const contexto = vm.createContext({
        document: documento,
        window: {},
        sessionStorage: {
            getItem() {
                return opciones.empleado
                    ? JSON.stringify(opciones.empleado)
                    : null;
            }
        },
        console
    });

    return {
        contexto,
        elemento,
        iniciar() {
            for (const fn of eventos.DOMContentLoaded ?? []) {
                fn();
            }
        }
    };
}

test("HU-35: exporta la validación del empleado", () => {
    const entorno = prepararEntorno();

    cargarModulo("empleado-bloqueo.js", entorno.contexto);

    entorno.iniciar();

    assert.equal(
        vm.runInContext(
            "validarEmpleadoSeleccionado()",
            entorno.contexto
        ),
        false
    );
});

test("HU-35: acepta un empleado completo", () => {
    const entorno = prepararEntorno({
        empleado: {
            codigo: "E001",
            nombre_completo: "Empleado de prueba",
            dui: "00000000-0",
            cargo: "Analista"
        }
    });

    cargarModulo("empleado-bloqueo.js", entorno.contexto);

    entorno.iniciar();

    assert.equal(
        vm.runInContext(
            "validarEmpleadoSeleccionado()",
            entorno.contexto
        ),
        true
    );
});

test("HU-35: valida campos obligatorios", () => {
    const entorno = prepararEntorno();

    cargarModulo("planilla-obligatorios.js", entorno.contexto);

    entorno.iniciar();

    assert.equal(
        vm.runInContext(
            "validarObligatoriosPlanilla()",
            entorno.contexto
        ),
        false
    );
});

test("HU-35: acepta campos obligatorios completos", () => {
    const entorno = prepararEntorno();

    cargarModulo("planilla-obligatorios.js", entorno.contexto);

    entorno.elemento("mes").value = "Octubre";
    entorno.elemento("anio").value = "2026";
    entorno.elemento("salario").value = "500";
    entorno.elemento("ingresos").value = "0";
    entorno.elemento("descuentos").value = "0";

    entorno.iniciar();

    assert.equal(
        vm.runInContext(
            "validarObligatoriosPlanilla()",
            entorno.contexto
        ),
        true
    );
});

test("HU-35: exporta la validación de horas", () => {
    const entorno = prepararEntorno();

    cargarModulo("horas-validacion.js", entorno.contexto);

    entorno.iniciar();

    assert.equal(
        vm.runInContext(
            "validarHorasPlanilla()",
            entorno.contexto
        ),
        false
    );
});

test("HU-35: acepta horas válidas", () => {
    const entorno = prepararEntorno();

    cargarModulo("horas-validacion.js", entorno.contexto);

    entorno.elemento("horas-ordinarias").value = "160";
    entorno.elemento("horas-extras").value = "0";

    entorno.iniciar();

    assert.equal(
        vm.runInContext(
            "validarHorasPlanilla()",
            entorno.contexto
        ),
        true
    );
});

test("HU-35: conserva compatibilidad con funciones globales", () => {
    const entorno = prepararEntorno();

    cargarModulo("empleado-bloqueo.js", entorno.contexto);
    cargarModulo("planilla-obligatorios.js", entorno.contexto);
    cargarModulo("horas-validacion.js", entorno.contexto);

    entorno.iniciar();

    assert.equal(
        typeof entorno.contexto.window.actualizarBloqueoEmpleado,
        "function"
    );

    assert.equal(
        typeof entorno.contexto.window.validarObligatoriosPlanilla,
        "function"
    );

    assert.equal(
        typeof entorno.contexto.window.validarHorasPlanilla,
        "function"
    );
});

test("HU-35: el adaptador utiliza importaciones directas", () => {
    const codigo = leerArchivo(
        "validaciones-revision-componentes.js"
    );

    assert.match(
        codigo,
        /import\s*\{\s*validarEmpleadoSeleccionado\s*\}/
    );

    assert.match(
        codigo,
        /import\s*\{\s*validarObligatoriosPlanilla\s*\}/
    );

    assert.match(
        codigo,
        /import\s*\{\s*validarDeduccionesLegales\s*\}/
    );

    assert.match(
        codigo,
        /import\s*\{\s*validarHorasPlanilla\s*\}/
    );

    assert.doesNotMatch(
        codigo,
        /window\.|globalThis\[/
    );
});

test("HU-35: conserva la distinción entre días y horas", () => {
    const codigo = leerArchivo(
        "validaciones-revision-componentes.js"
    );

    assert.match(codigo, /esPlanillaPorDias\(\)/);
    assert.match(codigo, /return validarHorasPlanilla\(\)/);
});
