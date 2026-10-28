const CAMPOS = [
    "totalIngresos",
    "deduccionesLegales",
    "descuentosManuales",
    "totalPagar"
];

export function compararImportes(actuales, anteriores, motor) {
    return CAMPOS.map(campo => {
        const actual = motor.centavos(actuales[campo]);
        const anterior = motor.centavos(anteriores[campo]);
        const diferencia = actual - anterior;

        const signo = diferencia > 0
            ? "+"
            : diferencia < 0
                ? "-"
                : "";

        return {
            campo,
            anterior: motor.decimal(anterior),
            actual: motor.decimal(actual),
            diferenciaCentavos: diferencia,
            diferencia: signo + motor.decimal(Math.abs(diferencia)),
            estado: diferencia > 0
                ? "Aumentó"
                : diferencia < 0
                    ? "Disminuyó"
                    : "Sin cambio"
        };
    });
}