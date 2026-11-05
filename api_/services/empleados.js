// ARCHIVO: Consultas a Supabase sobre empleados
// Buscar: servicio empleados, supabase

// Qué hace: Crea el servicio con el cliente de Supabase
// Buscar: crearServicioEmpleados
function crearServicioEmpleados(supabase) {
    const columnas = `
        id,
        codigo,
        nombre_completo,
        dui,
        cargo,
        salario_base_mensual,
        departamento_id,
        sucursal_id,
        departamentos(nombre),
        sucursales(nombre)
    `;

    // Qué hace: Agrega los filtros de departamento y sucursal a una consulta
    // Buscar: filtros, departamento, sucursal
    function aplicarFiltros(consulta, departamentoId, sucursalId) {
        if (departamentoId) {
            consulta = consulta.eq("departamento_id", departamentoId);
        }

        if (sucursalId) {
            consulta = consulta.eq("sucursal_id", sucursalId);
        }

        return consulta;
    }

    // Qué hace: Busca por código o DUI exacto y, si no hay, por nombre parcial
    // Buscar: buscar, ilike, código, DUI, nombre
    async function buscar({ termino = "", departamentoId, sucursalId }) {
        termino = String(termino).trim();

        if (termino.length > 100) {
            throw new Error("La búsqueda es demasiado larga");
        }

        // Mantener la búsqueda exacta por código y DUI.
        if (termino) {
            for (const campo of ["codigo", "dui"]) {
                const consulta = aplicarFiltros(
                    supabase.from("empleados").select(columnas),
                    departamentoId,
                    sucursalId
                );

                const { data, error } = await consulta
                    .eq(campo, termino)
                    .order("nombre_completo", { ascending: true })
                    .order("codigo", { ascending: true })
                    .limit(10);

                if (error) throw error;
                if (data?.length) return data;
            }
        }

        // Las sugerencias por nombre requieren al menos dos caracteres.
        if (termino.length < 2) return [];

        const nombreSeguro = termino.replace(/[%_\\]/g, "\\$&");

        const consulta = aplicarFiltros(
            supabase.from("empleados").select(columnas),
            departamentoId,
            sucursalId
        );

        const { data, error } = await consulta
            .ilike("nombre_completo", `%${nombreSeguro}%`)
            .order("nombre_completo", { ascending: true })
            .order("codigo", { ascending: true })
            .limit(10);

        if (error) throw error;

        return data || [];
    }

    // Qué hace: Lista hasta 10 empleados ordenados por nombre
    // Buscar: listar, primeros 10
    async function listar({ departamentoId, sucursalId }) {
        const consulta = aplicarFiltros(
            supabase.from("empleados")
                .select("id, codigo, nombre_completo, departamentos(nombre), sucursales(nombre)"),
            departamentoId,
            sucursalId
        );
        const { data, error } = await consulta
            .order("nombre_completo", { ascending: true })
            .order("codigo", { ascending: true })
            .limit(10);

        if (error) throw error;
        return data ?? [];
    }

    // Qué hace: Lee una tabla de catálogo ordenada por nombre
    // Buscar: catálogo, departamentos, sucursales
    async function listarCatalogo(tabla) {
        const { data, error } = await supabase
            .from(tabla)
            .select("id, nombre")
            .order("nombre", { ascending: true });

        if (error) throw error;

        return data || [];
    }

    return {
        buscar,
        listar,
        listarDepartamentos: () => listarCatalogo("departamentos"),
        listarSucursales: () => listarCatalogo("sucursales")
    };
}

module.exports = crearServicioEmpleados;
