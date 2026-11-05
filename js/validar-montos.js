// ARCHIVO: Validación de montos como módulo
// Buscar: validar montos, HU-35

"use strict";

// HU-35: exponer la validación de montos como módulo.
// Qué hace: Ejecuta la validación de montos de planilla.js
// Buscar: validarMontosPlanilla
export function validarMontosPlanilla() {
    const validar = globalThis.window?.validarMontosPlanilla;

    if (typeof validar !== "function") {
        throw new Error(
            "La validación de montos todavía no está lista"
        );
    }

    return validar();
}
