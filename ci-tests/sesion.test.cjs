// ARCHIVO: Pruebas del manejo de 401, 403 y errores del servidor
// Buscar: pruebas sesión, HU-32

"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ruta = path.join(__dirname, "../js/sesion.js");
const codigo = fs.readFileSync(ruta, "utf8");

// Qué hace: Carga sesion.js con sesión y redirección simuladas
// Buscar: crearEntorno
function crearEntorno() {
    const sesion = { token: "token-prueba" };
    const redirecciones = [];
    const esperas = [];

    const contexto = {
        sessionStorage: {
            getItem: clave => sesion[clave] ?? null,
            removeItem: clave => delete sesion[clave]
        },
        location: {
            replace: destino => redirecciones.push(destino)
        },
        document: {
            addEventListener() {}
        },
        setTimeout: (accion, tiempo) => esperas.push({ accion, tiempo })
    };

    contexto.window = contexto;
    vm.runInNewContext(codigo, contexto);

    return {
        verificar: contexto.verificarAccesoApi,
        sesion,
        redirecciones,
        esperas
    };
}

test("HU-32: cierra la sesión expirada", () => {
    const entorno = crearEntorno();

    assert.throws(
        () => entorno.verificar({ status: 401 }),
        { message: "La sesión expiró. Inicie sesión nuevamente" }
    );

    assert.equal(entorno.sesion.token, undefined);
});

test("HU-32: lleva al inicio de sesión después del aviso", () => {
    const entorno = crearEntorno();

    assert.throws(() => entorno.verificar({ status: 401 }));
    assert.equal(entorno.redirecciones.length, 0);
    assert.equal(entorno.esperas[0].tiempo, 2500);

    entorno.esperas[0].accion();

    assert.deepEqual(entorno.redirecciones, ["index.html"]);
});

test("HU-32: informa el acceso denegado sin cerrar la sesión", () => {
    const entorno = crearEntorno();

    assert.throws(
        () => entorno.verificar({ status: 403 }),
        { message: "No tiene permisos para acceder a esta función" }
    );

    assert.equal(entorno.sesion.token, "token-prueba");
});

test("HU-32: informa los fallos del servidor", () => {
    for (const status of [500, 502, 503]) {
        assert.throws(
            () => crearEntorno().verificar({ status }),
            { message: "El servidor no pudo completar la solicitud. Intente nuevamente" }
        );
    }
});

test("HU-32: permite continuar con las demás respuestas", () => {
    const entorno = crearEntorno();

    for (const status of [200, 201, 400, 404]) {
        assert.doesNotThrow(() => entorno.verificar({ status }));
    }

    assert.equal(entorno.sesion.token, "token-prueba");
    assert.equal(entorno.redirecciones.length, 0);
});
