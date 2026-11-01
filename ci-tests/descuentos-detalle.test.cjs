
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
        /todavía no está listo/
    );

    iniciar();

    // HU-34: subtotal inicial.
    assert.equal(modulo.obtenerSubtotalDescuentosManuales(), 0);

    // HU-35: la validación permite revisar cuando no hay pendientes.
    assert.equal(modulo.validarDetalleDescuentos(), true);

    // HU-35: se conserva la compatibilidad con window.
    assert.equal(window.validarDetalleDescuentos(), true);

    // HU-35: impide revisar si hay un concepto sin confirmar.
    campos["descuento-concepto"].value = "Pendiente";

    assert.equal(modulo.validarDetalleDescuentos(), false);
    assert.equal(window.validarDetalleDescuentos(), false);

    // HU-35: vuelve a permitir la revisión al limpiar los campos.
    campos["descuento-concepto"].value = "";

    assert.equal(modulo.validarDetalleDescuentos(), true);

    function agregar(concepto, importe) {
        campos["descuento-concepto"].value = concepto;
        campos["descuento-importe"].value = importe;
        campos["agregar-descuento"].disparar("click");
    }

    // HU-34: agregar dos descuentos manuales.
    agregar("Préstamo", "25.00");
    agregar("Cuota", "10.00");

    assert.equal(
        modulo.obtenerSubtotalDescuentosManuales(),
        3500
    );

    // Los $35 manuales más $10 de deducciones legales.
    assert.equal(campos.descuentos.value, "45.00");

    // HU-35: iniciar la edición del primer descuento.
    campos["detalle-descuentos"].disparar("click", {
        target: {
            closest: selector =>
                selector === ".editar-descuento"
                    ? { dataset: { indice: "0" } }
                    : null
        }
    });

    // No permite revisar mientras la edición está pendiente.
    assert.equal(modulo.validarDetalleDescuentos(), false);

    // HU-34: guardar el cambio de $25 a $30.
    agregar("Préstamo", "30.00");

    assert.equal(
        modulo.obtenerSubtotalDescuentosManuales(),
        4000
    );

    // HU-35: permite revisar después de confirmar la edición.
    assert.equal(modulo.validarDetalleDescuentos(), true);

    // HU-34: eliminar el descuento de $10.
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

    // HU-34: recuperar descuentos guardados.
    modulo.reemplazarDescuentosManuales([
        { concepto: "Anticipo", importe: "2.50" }
    ]);

    assert.equal(
        modulo.obtenerSubtotalDescuentosManuales(),
        250
    );

    // HU-34: integración real con la función compartida de Jessica.
    modulo.reemplazarDescuentosManuales([
        { concepto: "Préstamo", importe: "25.00" }
    ]);

    const subtotalManual = modulo.obtenerSubtotalDescuentosManuales();
    assert.equal(subtotalManual, 2500);

    const rutaTotales = require("node:path").join(
        __dirname,
        "../js/totales-planilla.js"
    );

    const codigoTotales = require("node:fs").readFileSync(
        rutaTotales,
        "utf8"
    );

    const moduloTotales = await import(
        `data:text/javascript;base64,${Buffer.from(codigoTotales).toString("base64")}`
    );

    const rutaEntradas = require("node:path").join(
        __dirname,
        "../js/entradas-totales-planilla.js"
    );

    const codigoEntradas = require("node:fs").readFileSync(
        rutaEntradas,
        "utf8"
    );

    const moduloEntradas = await import(
        `data:text/javascript;base64,${Buffer.from(codigoEntradas).toString("base64")}`
    );

    const motor = require("../api_/utils/reglas-nomina.js");

    const entradas = moduloEntradas.prepararEntradasTotales({
        salarioAplicable: "840.00",
        ingresosAdicionales: "50.00",
        deduccionesLegales: { total: "100.00" }
    }, motor);

    const totales = moduloTotales.calcularTotales({
        ...entradas,
        descuentosManuales: subtotalManual
    });

    assert.deepEqual(totales, {
        totalIngresos: 89000,
        totalDescuentos: 12500,
        totalPagar: 76500
    });

    // Las deducciones legales se incluyen una sola vez.
    assert.notEqual(totales.totalDescuentos, 22500);

    // HU-34: vaciar la lista de descuentos.
    modulo.reemplazarDescuentosManuales([]);

    assert.equal(
        modulo.obtenerSubtotalDescuentosManuales(),
        0
    );
});
