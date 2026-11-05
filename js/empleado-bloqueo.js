// ARCHIVO: Bloquea el formulario hasta seleccionar un empleado
// Buscar: bloqueo empleado

"use strict";

// HU-35: interfaz exportada para validar el empleado.
// La lógica de selección y bloqueo permanece en este componente.

let validarEmpleadoInterno = null;

// Qué hace: Indica si hay un empleado seleccionado
// Buscar: validarEmpleadoSeleccionado
export function validarEmpleadoSeleccionado() {
    if (!validarEmpleadoInterno) {
        throw new Error(
            "El componente de empleado todavía no está listo"
        );
    }

    return validarEmpleadoInterno();
}

// Qué hace: Prepara el bloqueo cuando carga la página
// Buscar: inicio bloqueo
document.addEventListener("DOMContentLoaded", () => {
    const campos = document.getElementById("datos-pago");
    const mensaje = document.getElementById("mensaje-empleado");

    // Qué hace: Lee el empleado seleccionado de la sesión
    // Buscar: obtenerEmpleadoSeleccionado
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

    // Qué hace: Habilita o deshabilita los campos según haya empleado
    // Buscar: actualizarBloqueoEmpleado, fieldset
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

    // Qué hace: Actualiza el bloqueo al cambiar de empleado
    // Buscar: empleado:actualizado
    document.addEventListener(
        "empleado:actualizado",
        actualizarBloqueoEmpleado
    );
});
