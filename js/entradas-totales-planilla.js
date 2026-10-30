"use strict";

// HU-34: preparar las entradas para el cálculo compartido de totales.
// Reutiliza el salario aplicable, los ingresos y las deducciones
// legales existentes, sin volver a calcular sus importes.

/**
 * Convierte los importes existentes a centavos enteros.
 *
 * No consulta el DOM, no modifica componentes y no calcula
 * deducciones legales ni salarios proporcionales.
 *
 * @param {Object} datos
 * @param {string|number} datos.salarioAplicable
 * @param {string|number} datos.ingresosAdicionales
 * @param {Object} datos.deduccionesLegales
 * @param {Object} motor - Motor compartido ReglasNomina.
 *
 * @returns {{
 *   salario: number,
 *   ingresosAdicionales: number,
 *   deduccionesLegales: number
 * }}
 */
export function prepararEntradasTotales(
    {
        salarioAplicable,
        ingresosAdicionales,
        deduccionesLegales
    },
    motor
) {
    if (!motor || typeof motor.centavos !== "function") {
        throw new Error(
            "El motor monetario no está disponible"
        );
    }

    if (
        !deduccionesLegales ||
        typeof deduccionesLegales !== "object"
    ) {
        throw new Error(
            "Las deducciones legales no están disponibles"
        );
    }

    return {
        salario: motor.centavos(salarioAplicable),
        ingresosAdicionales: motor.centavos(ingresosAdicionales),
        deduccionesLegales: motor.centavos(
            deduccionesLegales.total
        )
    };
}
