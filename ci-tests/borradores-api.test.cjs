// ARCHIVO: Pruebas de la conexión del formulario con los borradores
// Buscar: pruebas borradores, HU-23

"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ReglasNomina = require("../js/reglas-nomina.js");

// Quitar import y export para ejecutar los módulos fuera del navegador.
// Qué hace: Lee un módulo del navegador sin import ni export
// Buscar: leerModulo
function leerModulo(archivo) {
    return fs.readFileSync(path.join(__dirname, "../js", archivo), "utf8")
        .replace(/^import[\s\S]*?from "[^"]+";$/gm, "")
        .replace(/^export /gm, "");
}

const codigo = `
    ${leerModulo("resultado-guardado.js")}
    ${leerModulo("borradores-api.js")}
    globalThis.obtenerBorradorActual = obtenerBorradorActual;
`;

const BORRADOR = "bbbbbbbb-0000-4000-8000-000000000001";
const PLANILLA = "33333333-3333-4333-8333-333333333333";

// respuestas: lo que devuelve la API en cada solicitud, en orden.
// Qué hace: Carga borradores-api.js con una API simulada
// Buscar: crearEntorno
function crearEntorno(respuestas) {
    const solicitudes = [];

    const contexto = {
        API_URL: "",
        ReglasNomina,
        sessionStorage: {
            getItem: () => "token-prueba"
        },
        capturarBorrador: () => ({
            valido: true,
            errores: {},
            contenido: { mes: "Septiembre", anio: "2027" }
        }),
        recuperarBorrador: async () => {},
        verificarAccesoApi() {},
        async fetch(ruta, opciones = {}) {
            solicitudes.push(`${opciones.method ?? "GET"} ${ruta}`);

            const resultado = respuestas.shift();

            return {
                ok: resultado.ok,
                json: async () => resultado
            };
        }
    };

    contexto.window = contexto;
    vm.runInNewContext(codigo, contexto);

    return { api: contexto, solicitudes };
}

test("HU-23: guardar un borrador nuevo lo deja abierto", async () => {
    const { api, solicitudes } = crearEntorno([
        { ok: true, borrador: { id: BORRADOR } }
    ]);

    await api.guardarBorrador();

    assert.deepEqual(solicitudes, ["POST /api/borradores"]);
    assert.equal(api.obtenerBorradorActual(), BORRADOR);
});

test("HU-23: finaliza el borrador abierto después de guardarlo", async () => {
    const { api, solicitudes } = crearEntorno([
        { ok: true, borrador: { id: BORRADOR, contenido: {} } },
        { ok: true, borrador: { id: BORRADOR } },
        { ok: true, id: PLANILLA }
    ]);

    await api.abrirBorrador(BORRADOR);
    const resultado = await api.finalizarBorrador();

    assert.deepEqual(solicitudes, [
        `GET /api/borradores/${BORRADOR}`,
        `PUT /api/borradores/${BORRADOR}`,
        `POST /api/borradores/${BORRADOR}/finalizar`
    ]);
    assert.equal(resultado.id, PLANILLA);
    assert.equal(api.obtenerBorradorActual(), null);
});

test("HU-23: mantiene el borrador abierto si no se puede finalizar", async () => {
    const { api } = crearEntorno([
        { ok: true, borrador: { id: BORRADOR, contenido: {} } },
        { ok: true, borrador: { id: BORRADOR } },
        { ok: false, mensaje: "No se pudo finalizar el borrador" }
    ]);

    await api.abrirBorrador(BORRADOR);

    await assert.rejects(
        api.finalizarBorrador(),
        { message: "No se pudo finalizar el borrador" }
    );
    assert.equal(api.obtenerBorradorActual(), BORRADOR);
});

test("HU-23: no confirma una finalización sin identificador válido", async () => {
    const { api } = crearEntorno([
        { ok: true, borrador: { id: BORRADOR, contenido: {} } },
        { ok: true, borrador: { id: BORRADOR } },
        { ok: true, id: "sin-identificador" }
    ]);

    await api.abrirBorrador(BORRADOR);

    await assert.rejects(api.finalizarBorrador());
    assert.equal(api.obtenerBorradorActual(), BORRADOR);
});
