"use strict";

// HU-35: exponer la validación de montos como módulo.
export function validarMontosPlanilla() {
    const validar = globalThis.window?.validarMontosPlanilla;

    if (typeof validar !== "function") {
        throw new Error(
            "La validación de montos todavía no está lista"
        );
    }

    return validar();
}
