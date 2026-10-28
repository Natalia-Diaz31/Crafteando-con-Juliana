const MAXIMO_CENTAVOS = 999999999999;

export function calcularTotales({
    salario,
    ingresosAdicionales,
    deduccionesLegales,
    descuentosManuales
}) {
    const importes = {
        salario,
        ingresosAdicionales,
        deduccionesLegales,
        descuentosManuales
    };

    for (const [campo, valor] of Object.entries(importes)) {
        if (
            !Number.isSafeInteger(valor) ||
            valor < 0 ||
            valor > MAXIMO_CENTAVOS
        ) {
            throw new Error(
                `${campo}: importe en centavos inválido`
            );
        }
    }

    const totalIngresos = salario + ingresosAdicionales;
    const totalDescuentos =
        deduccionesLegales + descuentosManuales;

    if (
        totalIngresos > MAXIMO_CENTAVOS ||
        totalDescuentos > MAXIMO_CENTAVOS
    ) {
        throw new Error(
            "La suma supera el monto permitido"
        );
    }

    if (totalDescuentos > totalIngresos) {
        throw new Error(
            "Los descuentos no pueden superar los ingresos"
        );
    }

    return {
        totalIngresos,
        totalDescuentos,
        totalPagar: totalIngresos - totalDescuentos
    };
}