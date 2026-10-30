
"use strict";

// HU-35: interfaz exportada para validar el empleado.
// La lógica de selección y bloqueo permanece en este componente.

let validarEmpleadoInterno = null;

export function validarEmpleadoSeleccionado() {
    if (!validarEmpleadoInterno) {
        throw new Error(
            "El componente de empleado todavía no está listo"
        );
    }

    return validarEmpleadoInterno();
}

document.addEventListener("DOMContentLoaded", () => {
    const campos = document.getElementById("datos-pago");
    const mensaje = document.getElementById("mensaje-empleado");

    function obtenerEmpleadoSeleccionado() {
        try {
            const texto = sessionStorage.getItem("empleadoSeleccionado");

            if (!texto) return null;

            const empleado = JSON.parse(texto);

            if (
                !empleado ||
                !empleado.codigo ||
                !empleado.nombre_completo ||
                !empleado.dui ||
                !empleado.cargo
            ) {
                return null;
            }

            return empleado;
        } catch {
            return null;
        }
    }

    function actualizarBloqueoEmpleado() {
        const empleado = obtenerEmpleadoSeleccionado();

        campos.disabled = !empleado;

        mensaje.textContent = empleado
            ? ""
            : "Seleccione un empleado para continuar";

        return Boolean(empleado);
    }

    validarEmpleadoInterno = actualizarBloqueoEmpleado;

    // Compatibilidad con los componentes existentes.
    window.obtenerEmpleadoSeleccionado = obtenerEmpleadoSeleccionado;
    window.actualizarBloqueoEmpleado = validarEmpleadoSeleccionado;

    actualizarBloqueoEmpleado();

    document.addEventListener(
        "empleado:actualizado",
        actualizarBloqueoEmpleado
    );
});
