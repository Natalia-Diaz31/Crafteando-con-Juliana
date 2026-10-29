"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ruta = path.join(__dirname, "../js/consultar-planillas.js");
const codigo = fs.readFileSync(ruta, "utf8");

function crearEntorno() {
    const solicitudes = [];
    const marcador = "async function inicializarConsulta() {";

    assert.ok(
        codigo.includes(marcador),
        "No se encontró la función de inicialización"
    );

    const contexto = {
        window: {
            location: {
                href: "https://ejemplo.test/consultar-planillas.html"
            }
        },
        document: {
            readyState: "loading",
            addEventListener() {}
        },
        URL,
        fetch(url, opciones) {
            return new Promise((resolver, rechazar) => {
                solicitudes.push({
                    url,
                    opciones,
                    resolver,
                    rechazar
                });
            });
        }
    };

    // Exponer la función privada únicamente durante las pruebas.
    const codigoPrueba = codigo.replace(
        marcador,
        `globalThis.consultarEnPrueba = consultarPlanillas;
         ${marcador}`
    );

    vm.runInNewContext(codigoPrueba, contexto);

    return {
        consultar: contexto.consultarEnPrueba,
        solicitudes
    };
}

function completar(solicitud) {
    solicitud.resolver({
        ok: true,
        json: async () => ({
            ok: true,
            planillas: []
        })
    });
}

test("HU-36: no repite solicitudes simultáneas idénticas", async () => {
    const { consultar, solicitudes } = crearEntorno();

    const primera = consultar(
        "/api/planillas?pagina=1&empleado=7",
        "token-prueba"
    );

    const segunda = consultar(
        "/api/planillas?empleado=7&pagina=1",
        "token-prueba"
    );

    assert.equal(solicitudes.length, 1);
    assert.strictEqual(primera, segunda);

    completar(solicitudes[0]);

    const [resultado1, resultado2] = await Promise.all([
        primera,
        segunda
    ]);

    assert.equal(resultado1.resultado.ok, true);
    assert.equal(resultado2.resultado.ok, true);
});

test("HU-36: permite solicitudes con parámetros diferentes", async () => {
    const { consultar, solicitudes } = crearEntorno();

    const primera = consultar(
        "/api/planillas?pagina=1",
        "token-prueba"
    );

    const segunda = consultar(
        "/api/planillas?pagina=2",
        "token-prueba"
    );

    assert.equal(solicitudes.length, 2);

    completar(solicitudes[0]);
    completar(solicitudes[1]);

    await Promise.all([primera, segunda]);
});

test("HU-36: permite reintentar después de finalizar", async () => {
    const { consultar, solicitudes } = crearEntorno();

    const primera = consultar(
        "/api/planillas?pagina=1",
        "token-prueba"
    );

    completar(solicitudes[0]);
    await primera;

    const segunda = consultar(
        "/api/planillas?pagina=1",
        "token-prueba"
    );

    assert.equal(solicitudes.length, 2);

    completar(solicitudes[1]);
    await segunda;
});

test("HU-36: libera la solicitud cuando ocurre un error", async () => {
    const { consultar, solicitudes } = crearEntorno();

    const primera = consultar(
        "/api/planillas?pagina=1",
        "token-prueba"
    );

    solicitudes[0].rechazar(new Error("Error de conexión"));

    await assert.rejects(
        primera,
        /Error de conexión/
    );

    const segunda = consultar(
        "/api/planillas?pagina=1",
        "token-prueba"
    );

    assert.equal(solicitudes.length, 2);

    completar(solicitudes[1]);
    await segunda;
});
