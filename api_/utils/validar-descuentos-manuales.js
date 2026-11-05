// ARCHIVO: Validación de los descuentos que escribe el encargado
// Buscar: descuentos manuales, validación

"use strict";

const { centavos, decimal } = require("./reglas-nomina");
const MAXIMO_CENTAVOS = 999999999999;

// Qué hace: Revisa concepto e importe de cada descuento y suma el total en centavos
// Buscar: validarDescuentosManuales, ISSS, AFP, Renta
function validarDescuentosManuales(lista) {
    const errores = {};
    const detalleDescuentos = [];
    let descuentos = 0;

    if (!Array.isArray(lista)) {
        return {
            errores: {
                descuentos: "Debe enviar una lista de descuentos"
            },
            detalleDescuentos,
            descuentos: null
        };
    }

    lista.forEach((descuento, indice) => {
        const concepto = typeof descuento?.concepto === "string"
            ? descuento.concepto.trim() : "";

        const valor = descuento?.importe;
        const texto = typeof valor === "string" ? valor.trim()
            : typeof valor === "number" && Number.isFinite(valor)
                ? String(valor) : "";

        if (["isss", "afp", "renta"].includes(concepto.toLowerCase())) {
            errores[`descuentos[${indice}].concepto`] =
                "ISSS, AFP y Renta son deducciones automáticas; no las registre manualmente";
        } else if (!concepto) {
            errores[`descuentos[${indice}].concepto`] =
                "El concepto es obligatorio";
        }

        if (!/^\d+(?:\.\d{1,2})?$/.test(texto)) {
            errores[`descuentos[${indice}].importe`] =
                "Ingrese un importe válido con máximo dos decimales";
            return;
        }

        let importeCentavos;

        try {
            importeCentavos = centavos(texto);
        } catch {
            importeCentavos = null;
        }

        if (importeCentavos === null || importeCentavos <= 0) {
            errores[`descuentos[${indice}].importe`] =
                "El importe debe ser mayor que cero y no superar 9999999999.99";
            return;
        }

        descuentos += importeCentavos;

        if (concepto) {
            detalleDescuentos.push({
                concepto,
                importe: decimal(importeCentavos)
            });
        }
    });

    if (!Number.isSafeInteger(descuentos) ||
        descuentos > MAXIMO_CENTAVOS) {
        errores.descuentos =
            "La suma de descuentos supera el monto permitido";
        descuentos = null;
    }

    return { errores, detalleDescuentos, descuentos };
}

module.exports = { validarDescuentosManuales };
