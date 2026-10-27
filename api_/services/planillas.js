
"use strict";

// HU-25: Consulta paginada del historial de planillas.
const TAMANO_PAGINA = 10;

function crearServicioPlanillas(supabase) {

    async function consultarHistorial({
        empleadoId = null,
        pagina = 1
    } = {}) {

        const desde = (pagina - 1) * TAMANO_PAGINA;
        const hasta = desde + TAMANO_PAGINA - 1;

        let consulta = supabase
            .from("planillas")
            .select(
                "id, empleado_id, anio, mes, empleado_nombre, " +
                "periodo_pago, fecha_guardado, total_pagar",
                { count: "exact" }
            );

        // Filtrar solamente cuando se selecciona un empleado.
        if (empleadoId) {
            consulta = consulta.eq("empleado_id", empleadoId);
        }

        // Ordenar por período y fecha de guardado.
        const { data, count, error } = await consulta
            .order("anio", { ascending: false })
            .order("mes", { ascending: false })
            .order("fecha_guardado", { ascending: false })
            .order("id", { ascending: false })
            .range(desde, hasta);

        if (error) throw error;

        const totalRegistros = count ?? 0;

        return {
            planillas: data ?? [],
            totalRegistros,
            pagina,
            tamanoPagina: TAMANO_PAGINA,
            totalPaginas: Math.ceil(
                totalRegistros / TAMANO_PAGINA
            )
        };
    }

    return { consultarHistorial };
}

module.exports = crearServicioPlanillas;
