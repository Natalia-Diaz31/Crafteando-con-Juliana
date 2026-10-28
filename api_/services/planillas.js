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

    // HU-27: Consultar los datos originales para duplicar.
    async function consultarOrigenDuplicacion(id) {
        const { data: planilla, error } = await supabase
            .from("planillas")
            .select("id, empleado_id, plantilla_id, periodo_pago, ingresos_adicionales")
            .eq("id", id)
            .maybeSingle();

        if (error) throw error;
        if (!planilla) return null;

        const [
            { data: ingresos, error: errorIngresos },
            { data: descuentos, error: errorDescuentos }
        ] = await Promise.all([
            supabase
                .from("planilla_ingresos")
                .select("tipo, concepto, importe, origen")
                .eq("planilla_id", id)
                .order("id", { ascending: true }),

            supabase
                .from("planilla_descuentos")
                .select("concepto, importe, origen")
                .eq("planilla_id", id)
                .order("id", { ascending: true })
        ]);

        if (errorIngresos) throw errorIngresos;
        if (errorDescuentos) throw errorDescuentos;

        return {
            ...planilla,
            ingresos_detalle: ingresos?.length
                ? ingresos
                : planilla.ingresos_adicionales == null ||
                  Number(planilla.ingresos_adicionales) > 0
                    ? null
                    : [],
            descuentos: descuentos ?? []
        };
    }

    return {
        consultarHistorial,
        consultarOrigenDuplicacion
    };
}

module.exports = crearServicioPlanillas;
