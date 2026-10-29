"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("HU-35: expone la validación de montos sin duplicar reglas", async () => {
    const ruta = path.join(__dirname, "../js/validar-montos.js");
    const codigo = fs.readFileSync(ruta, "utf8");

    const modulo = await import(
        `data:text/javascript;base64,${Buffer.from(codigo).toString("base64")}`
    );

    const ventanaAnterior = globalThis.window;

    try {
        // La validación todavía no está disponible.
        delete globalThis.window;

        assert.throws(
            () => modulo.validarMontosPlanilla(),
            /todavía no está lista/
        );

        // La validación original devuelve true.
        let llamadas = 0;

        globalThis.window = {
            validarMontosPlanilla() {
                llamadas++;
                return true;
            }
        };

        assert.equal(modulo.validarMontosPlanilla(), true);
        assert.equal(llamadas, 1);

        // También conserva un resultado inválido.
        globalThis.window.validarMontosPlanilla = () => false;

        assert.equal(modulo.validarMontosPlanilla(), false);

        // No oculta los errores de la validación original.
        globalThis.window.validarMontosPlanilla = () => {
            throw new Error("Error de validación");
        };

        assert.throws(
            () => modulo.validarMontosPlanilla(),
            /Error de validación/
        );
    } finally {
        if (ventanaAnterior === undefined) {
            delete globalThis.window;
        } else {
            globalThis.window = ventanaAnterior;
        }
    }
});
