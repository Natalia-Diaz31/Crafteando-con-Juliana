// ARCHIVO: Ruta del historial de planillas con filtro y paginación
// Buscar: historial, consultar planillas, HU-25

const express = require("express");

const FORMATO_UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Qué hace: Crea el router del historial
// Buscar: crearRutasPlanillas
function crearRutasPlanillas({
    servicio,
    verificarToken,
    verificarRolNomina,
    formatearPeriodo
}) {
    const router = express.Router();

    // Qué hace: Devuelve 10 planillas por página, opcionalmente de un empleado
    // Buscar: listado, paginación, empleado_id
    router.get("/", verificarToken, verificarRolNomina, async (req, res) => {
        const empleadoId = String(req.query.empleado_id ?? "").trim();
        const paginaTexto = String(req.query.pagina ?? "1").trim();

        if (empleadoId && !FORMATO_UUID.test(empleadoId)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Identificador de empleado inválido"
            });
        }

        if (!/^[1-9]\d*$/.test(paginaTexto) ||
            !Number.isSafeInteger(Number(paginaTexto))) {
            return res.status(400).json({
                ok: false,
                mensaje: "Número de página inválido"
            });
        }

        try {
            const resultado = await servicio.consultarHistorial({
                empleadoId: empleadoId || null,
                pagina: Number(paginaTexto)
            });

            return res.json({
                ok: true,
                planillas: resultado.planillas.map((planilla) => ({
                    id: planilla.id,
                    empleado_id: planilla.empleado_id,
                    periodo: formatearPeriodo(planilla.mes, planilla.anio),
                    nombre_completo: planilla.empleado_nombre,
                    frecuencia: planilla.periodo_pago,
                    fecha_guardado: planilla.fecha_guardado,
                    total_pagar: Number(planilla.total_pagar).toFixed(2)
                })),
                paginacion: {
                    pagina: resultado.pagina,
                    tamanoPagina: resultado.tamanoPagina,
                    totalRegistros: resultado.totalRegistros,
                    totalPaginas: resultado.totalPaginas
                }
            });
        } catch (error) {
            console.error("Error al consultar historial:", error);

            return res.status(500).json({
                ok: false,
                mensaje: "No se pudo cargar el historial. Intente nuevamente"
            });
        }
    });

    return router;
}

module.exports = crearRutasPlanillas;
