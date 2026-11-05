// ARCHIVO: Ruta con todos los datos guardados de una planilla
// Buscar: detalle planilla, HU-08

"use strict";

const express = require("express");
const { formatearPeriodo } = require("../utils/periodo");
const { contarDias } = require("../utils/validar-novedades");

// Detalle: todos los datos guardados de una planilla. Se monta después de
// /comparacion-anterior y /:id/duplicar para que «/:id» no las capture.
// Qué hace: Crea el router del detalle de planilla
// Buscar: crearRutasDetallePlanilla
function crearRutasDetallePlanilla({ supabase, verificarToken, verificarRolNomina }) {
    const router = express.Router();

    // Qué hace: Devuelve la planilla con descuentos, ingresos, novedades y deducciones
    // Buscar: detalle, GET planilla por id
    router.get("/:id", verificarToken, verificarRolNomina, async (req, res) => {
        try {
            // 1. Comprobar que el identificador tenga formato UUID
            const id = String(req.params.id || "").trim();

            const formatoUUID =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

            if (!formatoUUID.test(id)) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Identificador de planilla inválido"
                });
            }

            // 2. Consultar la planilla guardada
            const { data: planilla, error } = await supabase
                .from("planillas")
                .select(
                    "id, mes, anio, plantilla_nombre, empleado_codigo, empleado_nombre, " +
                    "empleado_dui, empleado_cargo, tipo_contrato, salario_base, salario_original, motivo_ajuste, observaciones, ingresos_adicionales, " +
                    "horas_ordinarias, horas_extras, " +
                    "descuentos_totales, total_pagar, fecha_guardado, periodo_pago, deducciones_legales, " +
                    "dias_remunerados, salario_base_mensual, salario_proporcional, modo_calculo"


                )
                .eq("id", id)
                .maybeSingle();

            if (error) throw error;

            if (!planilla) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "Planilla no encontrada"
                });
            }

            // HU-12: consultar los descuentos asociados a la planilla.
            const {
                data: detalleDescuentos,
                error: errorDescuentos
            } = await supabase
                .from("planilla_descuentos")
                .select("concepto, importe")
                .eq("planilla_id", id)
                .order("id", { ascending: true });

            if (errorDescuentos) {
                throw errorDescuentos;
            }

            // HU-20: consultar los bonos e incentivos guardados.
            const {
                data: detalleIngresos,
                error: errorIngresos
            } = await supabase
                .from("planilla_ingresos")
                .select("tipo, concepto, importe, origen")
                .eq("planilla_id", id);

            if (errorIngresos) {
                throw errorIngresos;
            }

            // HU-18: novedades guardadas, con los días de cada una.
            const { data: novedades, error: errorNovedades } = await supabase
                .from("planilla_novedades")
                .select("tipo, fecha_inicio, fecha_fin, condicion_pago")
                .eq("planilla_id", id)
                .order("fecha_inicio", { ascending: true });

            if (errorNovedades) throw errorNovedades;

            // HU-16: calcular el total de ingresos con los montos guardados.
            const salarioCentavos = Math.round(Number(planilla.salario_base) * 100);
            const ingresosCentavos = Math.round(Number(planilla.ingresos_adicionales) * 100);

            const totalIngresosCentavos = salarioCentavos + ingresosCentavos;

            if (
                !Number.isSafeInteger(totalIngresosCentavos) ||
                totalIngresosCentavos > 999999999999
            ) {
                throw new Error("Total de ingresos fuera del rango permitido");
            }

            const totalIngresos = (totalIngresosCentavos / 100).toFixed(2);

            // 3. Devolver los datos con los nombres que usa la pantalla
            return res.status(200).json({
                ok: true,
                planilla: {
                    id: planilla.id,
                    plantilla: planilla.plantilla_nombre,
                    periodo: formatearPeriodo(planilla.mes, planilla.anio),
                    fecha_guardado: planilla.fecha_guardado,
                    codigo: planilla.empleado_codigo,
                    nombre_completo: planilla.empleado_nombre,
                    dui: planilla.empleado_dui,
                    cargo: planilla.empleado_cargo,
                    tipo_contrato: planilla.tipo_contrato ?? null,
                    salario_base: planilla.salario_base,
                    // HU-21: mostrar los datos del ajuste salarial guardado.
                    salario_original: planilla.salario_original,
                    motivo_ajuste: planilla.motivo_ajuste,

                    // HU-29: devolver las observaciones de la planilla.
                    observaciones: planilla.observaciones ?? "",

                    ingresos_adicionales: planilla.ingresos_adicionales,
                    ingresos_detalle: detalleIngresos || [],
                    detalle_ingresos_registrado: (detalleIngresos || []).length > 0,
                    total_ingresos: totalIngresos,

                    // HU-13: devolver las horas registradas.
                    horas_ordinarias: planilla.horas_ordinarias,
                    horas_extras: planilla.horas_extras,
                    periodo_pago: planilla.periodo_pago,
                    deducciones_legales: planilla.deducciones_legales,
                    descuentos_totales: planilla.descuentos_totales,
                    descuentos: detalleDescuentos || [],
                    total_pagar: planilla.total_pagar,

                    // HU-18: novedades guardadas con los días de cada una.
                    novedades: (novedades || []).map(novedad => ({
                        ...novedad,
                        dias: contarDias(novedad.fecha_inicio, novedad.fecha_fin)
                    })),

                    // HU-32: devolver los valores guardados del cálculo por días.
                    // Mantener null cuando el registro histórico no tenga estos campos.
                    modo_calculo: planilla.modo_calculo ?? null,
                    salario_base_mensual: planilla.salario_base_mensual ?? null,
                    dias_remunerados: planilla.dias_remunerados ?? null,
                    salario_proporcional: planilla.salario_proporcional ?? null

                }
            });

        } catch (error) {
            console.error("Error al consultar la planilla:", error);

            return res.status(500).json({
                ok: false,
                mensaje: "No se pudo consultar la planilla"
            });
        }
    });

    return router;
}

module.exports = crearRutasDetallePlanilla;
