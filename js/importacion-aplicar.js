// HU-22: aplica las filas que la API ya validó, sustituyendo juntos los bonos e incentivos
// y los descuentos manuales. Si algo es inválido, no cambia nada del formulario (ADR 0010).
// Formato de cada fila: { tipo: "bono" | "incentivo" | "descuento", concepto, importe }.
import {
    normalizarIngresos,
    obtenerIngresos,
    reemplazarIngresos
} from "./ingresos-detalle.js";

import { reemplazarDescuentosManuales } from "./descuentos-detalle.js";

const TIPOS_INGRESO = { bono: "Bono", incentivo: "Incentivo" };

// Envía las filas leídas por leerArchivoCSV() a la API, que las compara con el empleado
// y el período del formulario. No modifica la planilla; devuelve
// { valido, cantidad, filas, total_ingresos, total_descuentos, errores }.
export async function validarImportacion(filas) {
    const empleado = JSON.parse(sessionStorage.getItem("empleadoSeleccionado") ?? "null");

    const respuesta = await fetch(`${API_URL}/api/planillas/validar-importacion`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionStorage.getItem("token")}`
        },
        body: JSON.stringify({
            empleado_id: empleado?.id,
            mes: globalThis.ReglasNomina.numeroMes(document.getElementById("mes").value),
            anio: document.getElementById("anio").value,
            filas
        })
    });

    return respuesta.json();
}

export function aplicarImportacion(filas) {
    if (obtenerIngresos() === null) {
        throw new Error("El formulario de bonos e incentivos todavía no está integrado");
    }

    const ingresos = filas
        .filter(fila => fila.tipo !== "descuento")
        .map(({ tipo, concepto, importe }) => ({
            tipo: TIPOS_INGRESO[tipo], concepto, importe, origen: "CSV"
        }));

    const descuentos = filas
        .filter(fila => fila.tipo === "descuento")
        .map(({ concepto, importe }) => ({ concepto, importe, origen: "CSV" }));

    // Validar los ingresos antes de tocar el formulario; los descuentos se validan
    // completos dentro de reemplazarDescuentosManuales antes de aplicarse.
    normalizarIngresos(ingresos);
    reemplazarDescuentosManuales(descuentos);

    // Recalcula deducciones y totales, y exige revisar de nuevo la planilla.
    reemplazarIngresos(ingresos);
}
