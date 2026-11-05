// ARCHIVO: Comprueba que empleado y plantilla existan antes de guardar
// Buscar: referencias, verificar empleado

"use strict";

// server.js entrega el cliente de Supabase (las pruebas lo sustituyen ahí).
// Qué hace: Crea la comprobación con el cliente de Supabase
// Buscar: crearVerificarReferencias
function crearVerificarReferencias(supabase) {
    // HU-23: consultar y comprobar los registros necesarios
    // para guardar una planilla definitiva.
    // Qué hace: Consulta empleado y plantilla y valida el ajuste salarial
    // Buscar: empleado, plantilla, ajuste salarial, motivo
    async function verificarReferenciasPlanilla(datos) {
        const { data: empleado, error: errorEmpleado } = await supabase
            .from("empleados")
            .select("id, codigo, nombre_completo, dui, cargo, salario_base_mensual, tipo_contrato")
            .eq("id", datos.empleado_id)
            .maybeSingle();

        if (errorEmpleado) throw errorEmpleado;

        if (!empleado) {
            return {
                error: {
                    estado: 404,
                    mensaje: "El empleado seleccionado no existe"
                }
            };
        }

        const salarioOriginal = empleado.salario_base_mensual;

        const salarioUtilizado = datos.modo_calculo === "dias"
            ? datos.salario_base_mensual
            : datos.salario_base;

        const motivo = typeof datos.motivo_ajuste === "string"
            ? datos.motivo_ajuste.trim()
            : "";

        const tieneSalarioOriginal =
            salarioOriginal !== null && salarioOriginal !== undefined;

        const ajustado = tieneSalarioOriginal &&
            Math.round(Number(salarioOriginal) * 100) !==
            Math.round(Number(salarioUtilizado) * 100);

        if (ajustado && (motivo.length < 1 || motivo.length > 200)) {
            return {
                error: {
                    estado: 400,
                    mensaje: "Corrija el ajuste salarial",
                    errores: {
                        motivo_ajuste:
                            "El motivo del ajuste debe tener entre 1 y 200 caracteres"
                    }
                }
            };
        }

        const { data: plantilla, error: errorPlantilla } = await supabase
            .from("plantillas")
            .select("id, nombre")
            .eq("id", datos.plantilla_id)
            .maybeSingle();

        if (errorPlantilla) throw errorPlantilla;

        if (!plantilla) {
            return {
                error: {
                    estado: 404,
                    mensaje: "La plantilla seleccionada no existe"
                }
            };
        }

        if (plantilla.nombre !== "Planilla básica mensual") {
            return {
                error: {
                    estado: 400,
                    mensaje: "Seleccione la plantilla Planilla básica mensual"
                }
            };
        }

        return { empleado, plantilla };
    }

    return verificarReferenciasPlanilla;
}

module.exports = crearVerificarReferencias;
