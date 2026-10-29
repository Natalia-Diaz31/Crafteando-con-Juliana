"use strict";

const express = require("express");

const FORMATO_UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function crearRutasDuplicacion({
    servicio,
    supabase,
    verificarToken,
    verificarRolNomina
}) {
    const router = express.Router();

    // HU-27: preparar una nueva planilla a partir de una anterior.
    router.get("/:id/duplicar", verificarToken, verificarRolNomina, async (req, res) => {
        const id = String(req.params.id ?? "").trim();

        if (!FORMATO_UUID.test(id)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Identificador de planilla inválido"
            });
        }

        try {
            // Recuperar los datos originales mediante el servicio de Sara.
            const origen = await servicio.consultarOrigenDuplicacion(id);

            if (!origen) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "La planilla original no existe"
                });
            }

            // Solo se permite duplicar planillas mensuales.
            if (String(origen.periodo_pago ?? "").toLowerCase() !== "mensual") {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Solo se pueden duplicar planillas mensuales"
                });
            }

            // Impedir duplicar planillas sin referencias originales.
            if (!origen.empleado_id || !origen.plantilla_id) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "La planilla original no tiene empleado o plantilla asociados"
                });
            }

            // Impedir duplicar ingresos positivos sin desglose.
            if (
                Number(origen.ingresos_adicionales) > 0 &&
                !Array.isArray(origen.ingresos_detalle)
            ) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "No se puede duplicar la planilla porque sus ingresos adicionales no tienen desglose"
                });
            }

            // Consultar el empleado y la plantilla actuales.
            const [
                { data: empleado, error: errorEmpleado },
                { data: plantilla, error: errorPlantilla }
            ] = await Promise.all([
                supabase
                    .from("empleados")
                    .select("id, codigo, nombre_completo, salario_base_mensual")
                    .eq("id", origen.empleado_id)
                    .maybeSingle(),

                supabase
                    .from("plantillas")
                    .select("id, nombre")
                    .eq("id", origen.plantilla_id)
                    .maybeSingle()
            ]);

            if (errorEmpleado) throw errorEmpleado;
            if (errorPlantilla) throw errorPlantilla;

            if (!empleado) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "No se puede duplicar porque el empleado original ya no existe"
                });
            }

            if (!plantilla) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "No se puede duplicar porque la plantilla original ya no existe"
                });
            }

            if (plantilla.nombre !== "Planilla básica mensual") {
                return res.status(400).json({
                    ok: false,
                    mensaje: "No se puede duplicar porque la plantilla original no es compatible con el sistema"
                });
            }

            // Devolver los datos reutilizables sin crear una nueva planilla.
            return res.status(200).json({
                ok: true,
                duplicacion: {
                    empleado_id: empleado.id,
                    plantilla_id: plantilla.id,

                    empleado: {
                        id: empleado.id,
                        codigo: empleado.codigo,
                        nombre_completo: empleado.nombre_completo,
                        salario_base_mensual: empleado.salario_base_mensual
                    },

                    plantilla: {
                        id: plantilla.id,
                        nombre: plantilla.nombre
                    },

                    ingresos_detalle: origen.ingresos_detalle ?? [],
                    descuentos: origen.descuentos ?? [],

                    // Valores iniciales para una nueva planilla mensual.
                    mes: null,
                    anio: null,
                    dias_remunerados: 30
                }
            });
        } catch (error) {
            console.error("Error al preparar la duplicación:", error);

            return res.status(500).json({
                ok: false,
                mensaje: "No se pudo preparar la duplicación de la planilla"
            });
        }
    });

    return router;
}

module.exports = crearRutasDuplicacion;