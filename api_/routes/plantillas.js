// ARCHIVO: Ruta que devuelve la plantilla de planilla y sus campos
// Buscar: plantilla, HU-03

"use strict";

const express = require("express");

// HU-03: consultar la plantilla y sus campos.
// Qué hace: Crea el router de plantillas
// Buscar: crearRutasPlantillas
function crearRutasPlantillas({ supabase, verificarToken }) {
    const router = express.Router();

    // Qué hace: Devuelve la plantilla básica mensual con sus nueve campos
    // Buscar: GET plantillas, campos
    router.get("/", verificarToken, async (req, res) => {
        try {
            // 1. Buscar nuestra plantilla en Supabase
            const { data: plantilla, error: errorPlantilla } =
                await supabase
                    .from("plantillas")
                    .select("id, nombre, descripcion")
                    .eq("nombre", "Planilla básica mensual")
                    .single();

            if (errorPlantilla || !plantilla) {
                console.error("Error plantilla:", errorPlantilla);

                return res.status(404).json({
                    ok: false,
                    mensaje: "No se encontró la plantilla"
                });
            }

            // 2. Buscar los campos de esa plantilla
            const { data: campos, error: errorCampos } =
                await supabase
                    .from("campos_plantilla")
                    .select("nombre, orden")
                    .eq("plantilla_id", plantilla.id)
                    .order("orden", { ascending: true });

            if (errorCampos) {
                console.error("Error campos:", errorCampos);

                return res.status(500).json({
                    ok: false,
                    mensaje: "No se pudieron consultar los campos"
                });
            }

            // 3. Devolver la información al frontend
            return res.status(200).json({
                ok: true,
                plantilla: {
                    id: plantilla.id,
                    nombre: plantilla.nombre,
                    descripcion: plantilla.descripcion,
                    campos: campos
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

module.exports = crearRutasPlantillas;
