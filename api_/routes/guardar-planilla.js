// ARCHIVO: Ruta que guarda una planilla definitiva
// Buscar: guardar planilla, HU-08, HU-17

"use strict";

const express = require("express");
const { validarDatosPlanilla, validarIdentificadorOperacion } = require("../middlewares/validar-planilla");
const { construirRegistroPlanilla } = require("../utils/registro-planilla");

// HU-08 y HU-17: guardar una planilla. Se monta antes que las demás rutas de /api/planillas.
// Qué hace: Crea el router de guardado
// Buscar: crearRutasGuardarPlanilla
function crearRutasGuardarPlanilla({ supabase, verificarToken, verificarRolNomina, verificarReferenciasPlanilla }) {
    const router = express.Router();

    // Qué hace: Valida, recalcula y guarda la planilla en Supabase una sola vez por operación
    // Buscar: POST planillas, guardar_planilla_con_descuentos
    router.post(
        "/",
        verificarToken,
        verificarRolNomina, // HU-09: comprobar permisos
        validarIdentificadorOperacion, // HU-17
        validarDatosPlanilla,
        async (req, res) => {
            try {
                const datos = req.planillaValidada;
                const referencias = await verificarReferenciasPlanilla(datos);

                if (referencias.error) {
                    const { estado, ...respuesta } = referencias.error;

                    return res.status(estado).json({
                        ok: false,
                        ...respuesta
                    });
                }

                const { empleado, plantilla } = referencias;

                // Construir el registro definitivo con los datos validados.
                const registro = construirRegistroPlanilla(
                    datos,
                    empleado,
                    plantilla
                );

                // HU-12: guardar la planilla y sus descuentos
                // en una sola transacción de PostgreSQL.
                const parametrosGuardado = {
                    p_registro: registro,
                    p_descuentos: datos.descuentos,
                    p_operacion_id: req.operacionId,
                    p_novedades: datos.novedades
                };

                // HU-20: enviar el detalle cuando esté disponible.
                if (datos.ingresos_detalle !== null) {
                    parametrosGuardado.p_ingresos = datos.ingresos_detalle;
                }

                const {
                    data: resultado,
                    error: errorGuardado
                } = await supabase.rpc(
                    "guardar_planilla_con_descuentos",
                    parametrosGuardado
                );

                // La función devuelve una lista con la planilla guardada.
                const planilla = resultado?.[0];

                // Comprobar que Supabase guardó correctamente la planilla.
                if (errorGuardado) {
                    throw errorGuardado;
                }

                if (!planilla?.id) {
                    throw new Error(
                        "El guardado no devolvió un identificador"
                    );
                }

                // Confirmar únicamente después de guardar.
                return res.status(planilla.creada_nueva === false ? 200 : 201).json({
                    ok: true,
                    mensaje: "Planilla guardada",
                    id: planilla.id,
                    fecha_guardado: planilla.fecha_guardado,
                    salario_base: datos.salario_base,
                    ingresos_adicionales: datos.ingresos_adicionales,
                    total_ingresos: datos.total_ingresos,
                    descuentos_totales: datos.descuentos_totales,
                    total_pagar: planilla.total_pagar,
                    observaciones: datos.observaciones
                });
            } catch (error) {
                console.error("Error al guardar planilla:", error);

                return res.status(500).json({
                    ok: false,
                    mensaje:
                        "No se pudo guardar la planilla. Intente nuevamente"
                });
            }
        }
    );

    return router;
}

module.exports = crearRutasGuardarPlanilla;
