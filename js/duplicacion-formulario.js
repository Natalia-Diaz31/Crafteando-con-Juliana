// ARCHIVO: Carga en el formulario la planilla que se eligió duplicar
// Buscar: duplicación formulario, HU-27

// HU-27: aplica en el formulario la planilla elegida en el detalle,
// con la misma recuperación que usan los borradores. La página nueva
// no conserva confirmación ni borrador anterior, y el guardado crea otra operación.
import { prepararDuplicacion } from "./duplicacion-planilla.js";
import { recuperarBorrador } from "./borradores.js";

// Qué hace: Lee la duplicación guardada en la sesión y llena el formulario
// Buscar: planillaDuplicada, recuperar
document.addEventListener("DOMContentLoaded", async () => {
    const pendiente = sessionStorage.getItem("planillaDuplicada");

    if (!pendiente) return;

    sessionStorage.removeItem("planillaDuplicada");

    try {
        const { origen, datos } = JSON.parse(pendiente);

        await recuperarBorrador(
            prepararDuplicacion(datos, globalThis.ReglasNomina)
        );

        document.getElementById("duplicacion-origen-identificador").textContent = origen;
        document.getElementById("duplicacion-origen").hidden = false;
    } catch (error) {
        const mensaje = document.getElementById("duplicacion-mensaje");

        mensaje.textContent = error.message;
        mensaje.hidden = false;
    }
});
