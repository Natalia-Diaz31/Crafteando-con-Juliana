// ARCHIVO: Hojas de ingresos y descuentos manuales del Excel
// Buscar: Excel, movimientos, HU-31

"use strict";

// HU-31: Preparar ingresos y descuentos manuales para Excel.
// Qué hace: Prepara las filas de ingresos y descuentos manuales
// Buscar: prepararMovimientosExcel
function prepararMovimientosExcel(planilla, separarDescuentos) {
    if (!planilla || typeof separarDescuentos !== "function") {
        throw new TypeError("Datos de exportación inválidos");
    }

    // Qué hace: Convierte un importe a número
    // Buscar: importe
    const importe = valor => {
        const numero = Number(valor);
        if (valor == null || valor === "" || !Number.isFinite(numero)) {
            throw new TypeError("Importe de movimiento inválido");
        }
        return numero;
    };

    const ingresos = Array.isArray(planilla.ingresos_detalle)
        ? planilla.ingresos_detalle
        : [];

    const descuentos = separarDescuentos(
        Array.isArray(planilla.descuentos) ? planilla.descuentos : [],
        planilla.deducciones_legales
    );

    const ingresosSinDetalle = planilla.ingresos_adicionales == null ||
        Number(planilla.ingresos_adicionales) > 0;

    const totalDescuentos = planilla.descuentos_totales;
    const totalLegales = planilla.deducciones_legales?.total;

    const descuentosSinDetalle = totalDescuentos == null ||
        totalLegales == null ||
        Number(totalDescuentos) > Number(totalLegales);

    return [
        {
            nombre: "Ingresos",
            encabezados: ["Tipo", "Concepto", "Origen", "Importe (USD)"],
            filas: ingresos.length
                ? ingresos.map(i => [
                    i.tipo,
                    i.concepto,
                    i.origen ?? "No registrado",
                    importe(i.importe)
                ])
                : [[ingresosSinDetalle
                    ? "Detalle no registrado"
                    : "Sin movimientos"]]
        },
        {
            nombre: "Descuentos manuales",
            encabezados: ["Concepto", "Importe (USD)"],
            filas: descuentos.length
                ? descuentos.map(d => [
                    d.concepto,
                    importe(d.importe)
                ])
                : [[descuentosSinDetalle
                    ? "Detalle no registrado"
                    : "Sin movimientos"]]
        }
    ];
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = prepararMovimientosExcel;
} else {
    window.prepararMovimientosExcel = prepararMovimientosExcel;
}
