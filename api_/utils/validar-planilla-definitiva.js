
"use strict";

// HU-33: Coordinadora de validación definitiva de planillas.
// No utiliza Express ni realiza consultas a Supabase.

const { esUUIDValido } = require("./validar-uuid");
const { validarNovedades } = require("./validar-novedades");
const { validarSalarioEIngresos } = require("./validar-ingresos");
const { validarDescuentosManuales } = require("./validar-descuentos-manuales");
const ReglasNomina = require("./reglas-nomina");

const MAXIMO_CENTAVOS = 999999999999;

function obtenerTexto(valor) {
    if (typeof valor === "string") {
        return valor.trim();
    }

    if (typeof valor === "number" && Number.isFinite(valor)) {
        return String(valor);
    }

    return "";
}

function normalizarObservacion(valor) {
    if (valor === undefined || valor === null) {
        return { valor: "", error: null };
    }

    if (typeof valor !== "string") {
        return {
            valor: "",
            error: "La observación debe ser texto"
        };
    }

    const observacion = valor.trim();

    if (observacion.length > 500) {
        return {
            valor: observacion,
            error: "La observación no puede superar 500 caracteres"
        };
    }

    return { valor: observacion, error: null };
}

function validarHoras(datos, campo, errores) {
    const texto = obtenerTexto(datos[campo]);

    if (!texto) {
        errores[campo] = "Este campo es obligatorio";
        return null;
    }

    if (!/^\d+(?:\.\d{1,2})?$/.test(texto)) {
        errores[campo] =
            "Ingrese una cantidad mayor o igual a cero, con máximo dos decimales";
        return null;
    }

    const [entero, decimal = ""] = texto.split(".");

    const centesimas =
        Number(entero) * 100 +
        Number(decimal.padEnd(2, "0"));

    if (
        !Number.isSafeInteger(centesimas) ||
        centesimas > 9999999999
    ) {
        errores[campo] =
            "Las horas no pueden superar 99999999.99";
        return null;
    }

    return (centesimas / 100).toFixed(2);
}

function validarPlanillaDefinitiva(datosEntrada) {
    const datos = { ...(datosEntrada || {}) };
    const errores = {};

    const esPlanillaPorDias = datos.modo_calculo === "dias";

    // HU-29: observaciones.
    const resultadoObservacion =
        normalizarObservacion(datos.observaciones);

    if (resultadoObservacion.error) {
        errores.observaciones = resultadoObservacion.error;
    } else {
        datos.observaciones = resultadoObservacion.valor;
    }

    // Reutilizar la validación UUID existente.
    for (const campo of ["empleado_id", "plantilla_id"]) {
        if (!esUUIDValido(datos[campo])) {
            errores[campo] =
                "Debe seleccionar un registro con identificador válido";
        }
    }

    // Validación del período.
    const mesTexto = obtenerTexto(datos.mes);
    const anioTexto = obtenerTexto(datos.anio);

    if (
        !/^\d{1,2}$/.test(mesTexto) ||
        Number(mesTexto) < 1 ||
        Number(mesTexto) > 12
    ) {
        errores.mes = "Seleccione un mes entre 1 y 12";
    }

    if (
        !/^\d{4}$/.test(anioTexto) ||
        Number(anioTexto) === 0
    ) {
        errores.anio =
            "Ingrese un año válido de cuatro cifras";
    }

    // Reutilizar los módulos de Jessica y Sara.
    const resultadoIngresos =
        validarSalarioEIngresos(datos);

    const resultadoDescuentos =
        validarDescuentosManuales(datos.descuentos);

    Object.assign(errores, resultadoIngresos.errores);
    Object.assign(errores, resultadoDescuentos.errores);

    // HU-13 y HU-19: horas de planillas tradicionales.
    const horasOrdinarias = esPlanillaPorDias
        ? null
        : validarHoras(datos, "horas_ordinarias", errores);

    const horasExtras = esPlanillaPorDias
        ? null
        : validarHoras(datos, "horas_extras", errores);

    // HU-18: reutilizar la validación de novedades.
    const resultadoNovedades = validarNovedades(
        datos.novedades,
        {
            mes: Number(mesTexto),
            anio: Number(anioTexto),
            frecuencia: datos.periodo_pago
        }
    );

    if (!resultadoNovedades.valido) {
        errores.novedades =
            resultadoNovedades.errores.join(". ");
    }

    // HU-14: comprobar la versión de reglas.
    if (datos.version_regla !== ReglasNomina.VERSION) {
        errores.version_regla =
            "Las reglas cambiaron. Recargue y revise nuevamente la planilla";
    }

    // HU-19: cálculo por días y cálculo tradicional.
    let deduccionesLegales = null;

    const { salario, ingresos, ingresosDetalle } =
        resultadoIngresos;

    if (salario !== null && ingresos !== null) {
        try {
            const ingresosAdicionales =
                ReglasNomina.decimal(ingresos);

            deduccionesLegales = esPlanillaPorDias
                ? ReglasNomina.calcularPorDias({
                    salario_base_mensual:
                        datos.salario_base_mensual,
                    dias_remunerados:
                        resultadoNovedades.diasRemunerados,
                    ingresos_adicionales:
                        ingresosAdicionales,
                    periodo_pago: datos.periodo_pago,
                    mes: datos.mes,
                    anio: datos.anio
                })
                : ReglasNomina.calcular({
                    salario_base: datos.salario_base,
                    ingresos_adicionales:
                        ingresosAdicionales,
                    periodo_pago: datos.periodo_pago,
                    mes: datos.mes,
                    anio: datos.anio
                });
        } catch (error) {
            errores.deducciones_legales = error.message;
        }
    }

    // HU-12: descuentos manuales y legales.
    const detalleDescuentos = [
        ...resultadoDescuentos.detalleDescuentos
    ];

    let descuentos = resultadoDescuentos.descuentos;

    if (
        deduccionesLegales !== null &&
        descuentos !== null
    ) {
        descuentos += ReglasNomina.centavos(
            deduccionesLegales.total
        );

        for (const item of deduccionesLegales.detalle) {
            if (ReglasNomina.centavos(item.importe) > 0) {
                detalleDescuentos.push({
                    concepto: item.nombre,
                    importe: item.importe
                });
            }
        }

        if (descuentos > MAXIMO_CENTAVOS) {
            errores.descuentos_totales =
                "La suma de descuentos supera el monto permitido";
        }
    }

    // HU-19: usar el salario proporcional cuando corresponda.
    const salarioCalculado = esPlanillaPorDias
        ? (
            deduccionesLegales?.salario_proporcional !== undefined
                ? ReglasNomina.centavos(
                    deduccionesLegales.salario_proporcional
                )
                : null
        )
        : salario;

    let totalIngresos = null;
    let total = null;

    if (
        salarioCalculado !== null &&
        ingresos !== null &&
        descuentos !== null
    ) {
        const sumaIngresos = salarioCalculado + ingresos;
        totalIngresos = sumaIngresos;

        if (!Number.isSafeInteger(sumaIngresos)) {
            errores.ingresos_adicionales =
                "La suma de ingresos supera el valor que el sistema puede procesar";
        } else if (descuentos > sumaIngresos) {
            errores.descuentos_totales =
                "Los descuentos no pueden superar los ingresos";
        } else {
            total = sumaIngresos - descuentos;

            if (total > MAXIMO_CENTAVOS) {
                errores.total_pagar =
                    "El total a pagar no puede superar 9999999999.99";
            }
        }
    }

    // Si hay errores, no devolver una planilla lista para guardar.
    if (Object.keys(errores).length > 0) {
        return {
            valido: false,
            errores,
            planillaValidada: null
        };
    }

    // Mantener los nombres y formatos utilizados por server.js.
    const planillaValidada = {
        periodo_pago: datos.periodo_pago,
        deducciones_legales: deduccionesLegales,
        empleado_id: datos.empleado_id,
        plantilla_id: datos.plantilla_id,
        mes: Number(mesTexto),
        anio: Number(anioTexto),

        novedades: resultadoNovedades.novedades,
        dias_remunerados:
            resultadoNovedades.diasRemunerados,

        modo_calculo: esPlanillaPorDias
            ? "dias"
            : "horas",

        salario_base_mensual: esPlanillaPorDias
            ? ReglasNomina.decimal(salario)
            : null,

        salario_proporcional: esPlanillaPorDias
            ? ReglasNomina.decimal(salarioCalculado)
            : null,

        motivo_ajuste: datos.motivo_ajuste,
        observaciones: datos.observaciones,

        salario_base:
            ReglasNomina.decimal(salarioCalculado),

        ingresos_adicionales:
            ReglasNomina.decimal(ingresos),

        ingresos_detalle: ingresosDetalle,
        total_ingresos:
            ReglasNomina.decimal(totalIngresos),

        horas_ordinarias: horasOrdinarias,
        horas_extras: horasExtras,

        descuentos_totales:
            ReglasNomina.decimal(descuentos),

        descuentos: detalleDescuentos,

        total_pagar: ReglasNomina.decimal(total)
    };

    return {
        valido: true,
        errores: {},
        planillaValidada
    };
}

module.exports = { validarPlanillaDefinitiva };
