
const express = require("express");

function crearRutasEmpleados({ servicio, verificarToken }) {
    const router = express.Router();

    router.get("/buscar", verificarToken, async (req, res) => {
        try {
            const termino = String(req.query.q || "").trim();
            const departamentoId = String(
                req.query.departamento_id || req.query.departamentoId || ""
            ).trim();
            const sucursalId = String(
                req.query.sucursal_id || req.query.sucursalId || ""
            ).trim();

            if (termino.length > 100) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "La búsqueda es demasiado larga"
                });
            }

            if (termino.length === 1) {
                return res.json({ ok: true, empleados: [] });
            }

            const empleados = await servicio.buscar({
                termino,
                departamentoId,
                sucursalId
            });

            return res.json({ ok: true, empleados });
        } catch (error) {
            console.error("Error al buscar empleados:", error);
            return res.status(500).json({
                ok: false,
                mensaje: "No se pudo consultar empleados. Intente nuevamente"
            });
        }
    });

    router.get("/departamentos", verificarToken, async (req, res) => {
        try {
            const departamentos = await servicio.listarDepartamentos();
            return res.json({ ok: true, departamentos });
        } catch (error) {
            console.error("Error al consultar departamentos:", error);
            return res.status(500).json({
                ok: false,
                mensaje: "No se pudieron consultar los departamentos"
            });
        }
    });

    router.get("/sucursales", verificarToken, async (req, res) => {
        try {
            const sucursales = await servicio.listarSucursales();
            return res.json({ ok: true, sucursales });
        } catch (error) {
            console.error("Error al consultar sucursales:", error);
            return res.status(500).json({
                ok: false,
                mensaje: "No se pudieron consultar las sucursales"
            });
        }
    });

    return router;
}

module.exports = crearRutasEmpleados;
