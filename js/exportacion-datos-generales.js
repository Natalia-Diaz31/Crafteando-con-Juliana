"use strict";

// HU-30: Preparar datos generales e históricos para exportación.
function prepararDatosGeneralesExportacion(planilla) {
    if (!planilla || typeof planilla !== "object" || Array.isArray(planilla)) {
        throw new TypeError("Detalle de planilla inválido");
    }

    const dato = valor =>
        valor == null || (typeof valor === "string" && !valor.trim())
            ? "No registrado"
            : valor;

    return {
        identificacion: {
            id: dato(planilla.id),
            fecha_guardado: dato(planilla.fecha_guardado),
            plantilla: dato(planilla.plantilla),
            periodo: dato(planilla.periodo),
            periodo_pago: dato(planilla.periodo_pago)
        },

        empleado: {
            codigo: dato(planilla.codigo),
            nombre_completo: dato(planilla.nombre_completo),
            dui: dato(planilla.dui),
            cargo: dato(planilla.cargo),
            tipo_contrato: dato(planilla.tipo_contrato)
        },

        datos_salariales: {
            salario_base: dato(planilla.salario_base),
            salario_original: dato(planilla.salario_original),
            motivo_ajuste: dato(planilla.motivo_ajuste),
            salario_base_mensual: dato(planilla.salario_base_mensual),
            salario_proporcional: dato(planilla.salario_proporcional),
            dias_remunerados: dato(planilla.dias_remunerados),
            horas_ordinarias: dato(planilla.horas_ordinarias),
            horas_extras: dato(planilla.horas_extras),
            ingresos_adicionales: dato(planilla.ingresos_adicionales),
            total_ingresos: dato(planilla.total_ingresos),
            descuentos_totales: dato(planilla.descuentos_totales),
            total_pagar: dato(planilla.total_pagar)
        },

        observaciones: Object.hasOwn(planilla, "observaciones")
            ? (planilla.observaciones?.trim() || "Sin observaciones")
            : "No registrado"
    };
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = prepararDatosGeneralesExportacion;
} else {
    window.prepararDatosGeneralesExportacion =
        prepararDatosGeneralesExportacion;
}
