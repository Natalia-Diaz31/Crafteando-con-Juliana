
"use strict";

const express = require("express");

const FORMATO_UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function convertirImporte(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return null;
    }

    const numero = Number(valor);

    if (!Number.isFinite(numero) || numero < 0) {
        return null;
    }

    const centavos = Math.round(numero * 100);

    if (!Number.isSafeInteger(centavos)) {
        return null;
    }

    return (centavos / 100).toFixed(2);
}

function obtenerTotalDeducciones(valor) {
    if (valor === null || valor === undefined) {
        return null;
    }

    if (typeof valor === "object" && !Array.isArray(valor)) {
        return convertirImporte(valor.total);
    }

    return convertirImporte(valor);
}

function crearRutasComparacion({
    servicio,
    verificarToken,
    verificarRolNomina,
    formatearPeriodo
}) {
    const router = express.Router();

    // HU-28: consultar los importes históricos de la planilla anterior.
    router.get(
        "/comparacion-anterior",
        verificarToken,
        verificarRolNomina,
        async (req, res) => {
            const empleadoId = String(req.query.empleado_id ?? "").trim();
            const anioTexto = String(req.query.anio ?? "").trim();
            const mesTexto = String(req.query.mes ?? "").trim();

            if (!FORMATO_UUID.test(empleadoId)) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Identificador de empleado inválido"
                });
            }

            if (
                !/^\d{4}$/.test(anioTexto) ||
                !/^(?:[1-9]|1[0-2])$/.test(mesTexto)
            ) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Período mensual inválido"
                });
            }

            const anio = Number(anioTexto);
            const mes = Number(mesTexto);

            if (anio < 1900 || anio > 9999) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Año fuera del rango permitido"
                });
            }

            try {
                // Reutilizar la consulta implementada por Sara.
                const anterior = await servicio.consultarPlanillaAnterior({
                    empleadoId,
                    anio,
                    mes
                });

                if (!anterior) {
                    return res.json({
                        ok: true,
                        comparable: false,
                        mensaje: "No hay una planilla anterior comparable",
                        motivo: "No existe una planilla mensual finalizada de un período anterior"
                    });
                }

                const salario = convertirImporte(anterior.salario_base);
                const ingresosAdicionales =
                    convertirImporte(anterior.ingresos_adicionales);
                const deducciones =
                    obtenerTotalDeducciones(anterior.deducciones_legales);
                const descuentosTotales =
                    convertirImporte(anterior.descuentos_totales);
                const totalPagar = convertirImporte(anterior.total_pagar);

                if (
                    salario === null ||
                    ingresosAdicionales === null ||
                    deducciones === null ||
                    descuentosTotales === null ||
                    totalPagar === null
                ) {
                    return res.json({
                        ok: true,
                        comparable: false,
                        mensaje: "No hay una planilla anterior comparable",
                        motivo: "La planilla anterior no tiene todos los importes históricos necesarios"
                    });
                }

                // Combinar únicamente los importes históricos guardados.

                const totalIngresosCentavos =
                    Math.round(Number(salario) * 100) +
                    Math.round(Number(ingresosAdicionales) * 100);

                const descuentosManualesCentavos =
                    Math.round(Number(descuentosTotales) * 100) -
                    Math.round(Number(deducciones) * 100);

                const totalIngresos = Number.isSafeInteger(totalIngresosCentavos)
                    ? convertirImporte(totalIngresosCentavos / 100)
                    : null;

                const descuentosManuales =
                    Number.isSafeInteger(descuentosManualesCentavos) &&
                        descuentosManualesCentavos >= 0
                        ? convertirImporte(descuentosManualesCentavos / 100)
                        : null;


                if (totalIngresos === null || descuentosManuales === null) {
                    return res.json({
                        ok: true,
                        comparable: false,
                        mensaje: "No hay una planilla anterior comparable",
                        motivo: "Los subtotales históricos no permiten una comparación válida"
                    });
                }

                return res.json({
                    ok: true,
                    comparable: true,
                    anterior: {
                        id: anterior.id,
                        periodo: formatearPeriodo(anterior.mes, anterior.anio),
                        fecha_guardado: anterior.fecha_guardado,
                        importes: {
                            totalIngresos,
                            deduccionesLegales: deducciones,
                            descuentosManuales,
                            totalPagar
                        }
                    }
                });

            } catch (error) {
                console.error("Error al consultar comparación:", error);

                return res.status(500).json({
                    ok: false,
                    mensaje: "No se pudo consultar la planilla anterior. Intente nuevamente"
                });
            }
        }
    );

    return router;
}

module.exports = crearRutasComparacion;
