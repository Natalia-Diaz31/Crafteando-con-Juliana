"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

function crearElemento(id = "") {
    const eventos = {};

    return {
        id,
        value: "",
        textContent: "",
        dataset: {},
        classList: { toggle() {} },
        setAttribute() {},
        closest() {
            return null;
        },
        after() {},
        append() {},
        appendChild() {},
        replaceChildren() {},
        focus() {},
        addEventListener(tipo, fn) {
            eventos[tipo] = fn;
        },
        dispatchEvent(evento) {
            eventos[evento.type]?.(evento);
        },
        disparar(tipo, evento = {}) {
            eventos[tipo]?.(evento);
        }
    };
}

test("HU-34 y HU-35: subtotal manual y validación de descuentos", async () => {
    const ids = [
        "descuento-concepto",
        "descuento-importe",
        "agregar-descuento",
        "detalle-descuentos",
        "descuentos"
    ];

    const campos = Object.fromEntries(
        ids.map(id => [id, crearElemento(id)])
    );

    let iniciar;

    globalThis.document = {
        addEventListener(tipo, fn) {
            if (tipo === "DOMContentLoaded") {
                iniciar = fn;
            }
        },
        getElementById(id) {
            return campos[id] ?? null;
        },
        createElement() {
            return crearElemento();
        },
        createTextNode(texto) {
            return { textContent: texto };
        }
    };

    globalThis.window = {
        obtenerDeduccionesLegales: () => ({ total: "10.00" })
    };

    globalThis.ReglasNomina = {
        centavos: valor => Math.round(Number(valor) * 100),
        decimal: valor => (valor / 100).toFixed(2)
    };

    const ruta = require("node:path").join(
        __dirname,
        "../js/descuentos-detalle.js"
    );

    const codigo = require("node:fs").readFileSync(ruta, "utf8");

    const modulo = await import(
        `data:text/javascript;base64,${Buffer.from(codigo).toString("base64")}`
    );

    // HU-34: el subtotal no está disponible antes de inicializar.
    assert.throws(
        () => modulo.obtenerSubtotalDescuentosManuales(),
        /todavía no está listo/
    );

    // HU-35: la validación tampoco está disponible antes de inicializar.
    assert.throws(
        () => modulo.validarDetalleDescuentos(),

    assert.equal(
        modulo.obtenerSubtotalDescuentosManuales(),
        0
    );
});
