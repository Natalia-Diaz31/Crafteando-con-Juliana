// ARCHIVO: Arma el registro que se guarda en la base de datos
// Buscar: registro, guardar, borrador

"use strict";

const ReglasNomina = require("./reglas-nomina.js");

// HU-23: adaptar el contenido recuperado de un borrador
// al contrato de validación de una planilla definitiva.
// Qué hace: Convierte el contenido de un borrador al formato de una planilla definitiva
// Buscar: prepararDatosDesdeBorrador, finalizar
function prepararDatosDesdeBorrador(contenido) {
    const esMensual = contenido.periodo_pago === "mensual";

    return {
        periodo_pago: contenido.periodo_pago,
        modo_calculo: esMensual ? "dias" : "horas",
        version_regla: ReglasNomina.VERSION,

        plantilla_id: contenido.plantilla?.id ?? null,
        empleado_id: contenido.empleado?.id ?? null,

        mes: contenido.mes,
        anio: contenido.anio,

        salario_base: contenido.salario_base,
        salario_base_mensual: contenido.salario_base,

        ingresos_adicionales: contenido.ingresos_adicionales,

        horas_ordinarias: esMensual
            ? null
            : contenido.horas_ordinarias,

        horas_extras: esMensual
            ? null
            : contenido.horas_extras,

        descuentos: contenido.descuentos,
        novedades: contenido.novedades,
        ingresos_detalle: contenido.ingresos,

        // HU-29: Conservar las observaciones al finalizar el borrador.
        observaciones: contenido.observaciones ?? "",
        motivo_ajuste: contenido.motivo_ajuste
    };
}

// HU-23: construir el registro definitivo a partir de datos validados.
// Se reutiliza tanto en el guardado normal como en la finalización.
// Qué hace: Construye la fila de la planilla con los datos validados, del empleado y de la plantilla
// Buscar: construirRegistroPlanilla, registro
function construirRegistroPlanilla(datos, empleado, plantilla) {
    const salarioOriginal = empleado.salario_base_mensual;

    const salarioUtilizado = datos.modo_calculo === "dias"
        ? datos.salario_base_mensual
        : datos.salario_base;

    const tieneSalarioOriginal =
        salarioOriginal !== null && salarioOriginal !== undefined;

    const ajustado = tieneSalarioOriginal &&
        Math.round(Number(salarioOriginal) * 100) !==
        Math.round(Number(salarioUtilizado) * 100);

    const motivo = typeof datos.motivo_ajuste === "string"
        ? datos.motivo_ajuste.trim()
        : "";

    return {
        periodo_pago: datos.periodo_pago,
        deducciones_legales: datos.deducciones_legales,
        plantilla_id: plantilla.id,
        empleado_id: empleado.id,
        mes: datos.mes,
        anio: datos.anio,
        plantilla_nombre: plantilla.nombre,
        empleado_codigo: empleado.codigo,
        empleado_nombre: empleado.nombre_completo,
        empleado_dui: empleado.dui,
        empleado_cargo: empleado.cargo,
        tipo_contrato: empleado.tipo_contrato ?? null,
        modo_calculo: datos.modo_calculo,
        salario_base_mensual: datos.salario_base_mensual,
        dias_remunerados: datos.dias_remunerados,
        salario_proporcional: datos.salario_proporcional,
        salario_original: salarioOriginal ?? null,
        motivo_ajuste: ajustado ? motivo : null,
        observaciones: datos.observaciones ?? "",
        salario_base: datos.salario_base,
        ingresos_adicionales: datos.ingresos_adicionales,
        horas_ordinarias: datos.horas_ordinarias,
        horas_extras: datos.horas_extras,
        descuentos_totales: datos.descuentos_totales,
        total_pagar: datos.total_pagar
    };
}

module.exports = { prepararDatosDesdeBorrador, construirRegistroPlanilla };
