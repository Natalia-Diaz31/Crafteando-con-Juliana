
"use strict";

// HU-30: Preparar los movimientos históricos para exportarlos a PDF.
// No consulta la API, no recalcula importes y no modifica la planilla.
function prepararMovimientosPDF(planilla, separarDescuentos) {
    if (!planilla || typeof planilla !== "object" ||
        Array.isArray(planilla) || typeof separarDescuentos !== "function") {
        throw new TypeError("Datos de exportación inválidos");
    }

    const dato = valor =>
        valor == null || (typeof valor === "string" && !valor.trim())
            ? "No registrado"
            : valor;

    const dinero = valor => {
        if (valor == null || valor === "") return "No registrado";

        const numero = Number(valor);
        return Number.isFinite(numero)
            ? numero.toFixed(2)
            : "No registrado";
    };

    const seccion = (nombre, encabezados, filas, sinDetalle = false) => ({
        nombre,
        encabezados,
        filas: filas.length
            ? filas
            : [[sinDetalle ? "Detalle no registrado" : "Sin movimientos"]]
    });

    // Ingresos históricos: bonos e incentivos.
    const ingresos = Array.isArray(planilla.ingresos_detalle)
        ? planilla.ingresos_detalle
        : [];

    const ingresosSinDetalle =
        ingresos.length === 0 &&
        (planilla.ingresos_adicionales == null ||
            Number(planilla.ingresos_adicionales) > 0);

    const seccionIngresos = seccion(
        "Ingresos",
        ["Tipo", "Concepto", "Origen", "Importe (USD)"],
        ingresos.map(item => [
            dato(item.tipo),
            dato(item.concepto),
            dato(item.origen),
            dinero(item.importe)
        ]),
        ingresosSinDetalle
    );

    // Deducciones legales almacenadas con la planilla.
    const legales = planilla.deducciones_legales;
    const detalleLegales = Array.isArray(legales?.detalle)
        ? legales.detalle
        : [];

    const reglaLegal = item => {
        const partes = [];

        if (item.tasa != null) partes.push(`${item.tasa} %`);
        if (item.tope != null) partes.push(`Máximo: ${dinero(item.tope)}`);
        if (item.tramo != null) partes.push(`Tramo: ${item.tramo}`);
        if (item.exceso_desde != null) {
            partes.push(`Exceso desde: ${dinero(item.exceso_desde)}`);
        }
        if (item.cuota_fija != null) {
            partes.push(`Cuota fija: ${dinero(item.cuota_fija)}`);
        }

        return partes.length ? partes.join("; ") : "No registrado";
    };

    const seccionLegales = seccion(
        "Deducciones legales",
        ["Deducción", "Base (USD)", "Tasa / tramo", "Importe (USD)"],
        detalleLegales.map(item => [
            dato(item.nombre),
            dinero(item.base),
            reglaLegal(item),
            dinero(item.importe)
        ]),
        !legales || !Array.isArray(legales.detalle)
    );

    // Separar los descuentos manuales de las deducciones legales.
    const descuentosOriginales = Array.isArray(planilla.descuentos)
        ? planilla.descuentos
        : [];

    const descuentosManuales = separarDescuentos(
        descuentosOriginales,
        legales
    );

    const sinDetalleDescuentos =
        !Array.isArray(planilla.descuentos) &&
        (planilla.descuentos_totales == null ||
            Number(planilla.descuentos_totales) > 0);

    const seccionDescuentos = seccion(
        "Descuentos manuales",
        ["Concepto", "Importe (USD)"],
        descuentosManuales.map(item => [
            dato(item.concepto),
            dinero(item.importe)
        ]),
        sinDetalleDescuentos
    );

    // Novedades históricas: incapacidades, permisos, etc.
    const novedades = Array.isArray(planilla.novedades)
        ? planilla.novedades
        : [];

    const seccionNovedades = seccion(
        "Novedades",
        ["Tipo", "Inicio", "Fin", "Condición de pago", "Días"],
        novedades.map(item => [
            dato(item.tipo),
            dato(item.fecha_inicio),
            dato(item.fecha_fin),
            dato(item.condicion_pago),
            dato(item.dias)
        ]),
        !Array.isArray(planilla.novedades)
    );

    return [
        seccionIngresos,
        seccionLegales,
        seccionDescuentos,
        seccionNovedades
    ];
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = prepararMovimientosPDF;
} else {
    window.prepararMovimientosPDF = prepararMovimientosPDF;
}
