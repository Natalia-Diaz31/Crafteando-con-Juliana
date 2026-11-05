// ARCHIVO: Ruta con los datos básicos de un empleado por su id
// Buscar: empleado, detalle empleado, HU-05

"use strict";

const express = require("express");

// HU-05: datos básicos de un empleado. Se monta después de /buscar,
// /departamentos y /sucursales para que «/:id» no las capture.
// Qué hace: Crea el router del detalle de empleado
// Buscar: crearRutasDetalleEmpleado
function crearRutasDetalleEmpleado({ supabase, verificarToken }) {
    const router = express.Router();

    // Qué hace: Devuelve código, nombre, DUI, cargo, salario y contrato del empleado
    // Buscar: empleado por id, salario, contrato
    router.get("/:id", verificarToken, async (req, res) => {
        try {
            // 1. Obtener el identificador del empleado
            const id = String(req.params.id || "").trim();

            // Comprobar que el identificador tenga formato UUID
            const formatoUUID =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

            if (!formatoUUID.test(id)) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Identificador de empleado inválido"
                });
            }

            // 2. Consultar los datos registrados en Supabase
            const { data: empleado, error } = await supabase
                .from("empleados")
                .select("codigo, nombre_completo, dui, cargo, salario_base_mensual, tipo_contrato")
                .eq("id", id)
                .maybeSingle();

            if (error) {
                console.error("Error al consultar empleado:", error);

                return res.status(500).json({
                    ok: false,
                    mensaje: "No se pudo consultar el empleado"
                });
            }

            // 3. Comprobar que el empleado exista
            if (!empleado) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "Empleado no encontrado"
                });
            }

            // 4. Devolver los cuatro datos básicos
            return res.status(200).json({
                ok: true,
                empleado: {
                    codigo: empleado.codigo,
                    nombre_completo: empleado.nombre_completo,
                    dui: empleado.dui,
                    cargo: empleado.cargo,
                    salario_base_mensual: empleado.salario_base_mensual,
                    tipo_contrato: empleado.tipo_contrato ?? null
                }
            });

        } catch (error) {
            console.error("Error del servidor:", error);

            return res.status(500).json({
                ok: false,
                mensaje: "Error interno del servidor"
            });
        }
    });

    return router;
}

module.exports = crearRutasDetalleEmpleado;
