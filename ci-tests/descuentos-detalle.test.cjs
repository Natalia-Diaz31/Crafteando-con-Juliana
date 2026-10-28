"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Simular los elementos necesarios de la interfaz.
function crearElemento(id = "") {
    const eventos = {};

    return {
        id,
        value: "",
        textContent: "",
        dataset: {},
        classList: { toggle() {} },
        setAttribute() {},
        closest() { return null; },
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

test("HU-34: actualiza el subtotal de descuentos manuales", async () => {
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
            if (tipo === "DOMContentLoaded") iniciar = fn;
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

    const ruta = path.join(
        __dirname,
        "../js/descuentos-detalle.js"
    );

    const codigo = fs.readFileSync(ruta, "utf8");

    const modulo = await import(
        `data:text/javascript;base64,${Buffer.from(codigo).toString("base64")}`
    );

    // 1. Antes de inicializar el componente.
    assert.throws(
        () => modulo.obtenerSubtotalDescuentosManuales(),
        /todavía no está listo/
    );

    iniciar();

    assert.equal(modulo.obtenerSubtotalDescuentosManuales(), 0);

    function agregar(concepto, importe) {
        campos["descuento-concepto"].value = concepto;
        campos["descuento-importe"].value = importe;
        campos["agregar-descuento"].disparar("click");
    }

    // 2. Agregar descuentos manuales.
    agregar("Préstamo", "25.00");
    agregar("Cuota", "10.00");

    assert.equal(
        modulo.obtenerSubtotalDescuentosManuales(),
        3500
    );

    // 35 manuales + 10 de deducciones legales.
    assert.equal(campos.descuentos.value, "45.00");

    // 3. Editar un descuento.
    campos["detalle-descuentos"].disparar("click", {
        target: {
            closest: selector =>
                selector === ".editar-descuento"
                    ? { dataset: { indice: "0" } }
                    : null
        }
    });

    agregar("Préstamo", "30.00");

    assert.equal(
        modulo.obtenerSubtotalDescuentosManuales(),
        4000
    );

    // 4. Eliminar un descuento.
    campos["detalle-descuentos"].disparar("click", {
        target: {
            closest: selector =>
                selector === ".eliminar-descuento"
                    ? { dataset: { indice: "1" } }
                    : null
        }
    });

    assert.equal(
        modulo.obtenerSubtotalDescuentosManuales(),
        3000
    );

    // 5. Recuperar descuentos guardados.
    modulo.reemplazarDescuentosManuales([
        { concepto: "Anticipo", importe: "2.50" }
    ]);

    assert.equal(
        modulo.obtenerSubtotalDescuentosManuales(),
        250
    );

    // 6. Vaciar la lista.
    modulo.reemplazarDescuentosManuales([]);

    assert.equal(
        modulo.obtenerSubtotalDescuentosManuales(),
        0
    );
});
