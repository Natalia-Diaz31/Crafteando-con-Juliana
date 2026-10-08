document.addEventListener("DOMContentLoaded", () => {
    const campos = document.getElementById("datos-pago");
    const mensaje = document.getElementById("mensaje-empleado");

    window.obtenerEmpleadoSeleccionado = function () {
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
    };

    window.actualizarBloqueoEmpleado = function () {
        const empleado = window.obtenerEmpleadoSeleccionado();
        campos.disabled = !empleado;

        mensaje.textContent = empleado
            ? ""
            : "Seleccione un empleado para continuar";

        return Boolean(empleado);
    };

    window.actualizarBloqueoEmpleado();

    // Natalia debe emitir este evento después de guardar o quitar la selección.
    document.addEventListener(
        "empleado:actualizado",
        window.actualizarBloqueoEmpleado
    );
});