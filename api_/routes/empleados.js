// ARCHIVO: Rutas de búsqueda y catálogos de empleados
// Buscar: empleados, búsqueda, HU-24

const express = require("express");

// Qué hace: Crea el router de empleados
// Buscar: crearRutasEmpleados
function crearRutasEmpleados({ servicio, verificarToken, verificarRolNomina }) {
    const router = express.Router();

    // Qué hace: Busca empleados por código, DUI o nombre con filtros
    // Buscar: buscar empleado, sugerencias, filtros
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

    // Qué hace: Lista los primeros 10 empleados (solo nómina)
    // Buscar: lista empleados, primeros 10
    router.get("/lista", verificarToken, verificarRolNomina, async (req, res) => {
        try {
            const empleados = await servicio.listar({
                departamentoId: String(req.query.departamento_id ?? "").trim(),
                sucursalId: String(req.query.sucursal_id ?? "").trim()
            });
            return res.json({ ok: true, empleados });
        } catch (error) {
            console.error("Error al listar empleados:", error);
            return res.status(500).json({
                ok: false,
                mensaje: "No se pudo consultar empleados. Intente nuevamente"
            });
        }
    });

    // Qué hace: Devuelve el catálogo de departamentos
    // Buscar: departamentos, filtro
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

    // Qué hace: Devuelve el catálogo de sucursales
    // Buscar: sucursales, filtro
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
