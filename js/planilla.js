
//
// HU-05: MOSTRAR DATOS DEL EMPLEADO SELECCIONADO
//

document.addEventListener("DOMContentLoaded", () => {

    // 1. Recuperar los datos del empleado seleccionado
    const empleadoGuardado =
        sessionStorage.getItem("empleadoSeleccionado");

    const mensaje =
        document.getElementById("mensaje-empleado");

    // 2. Verificar si se seleccionó un empleado
    if (!empleadoGuardado) {
        if (mensaje) {
            mensaje.textContent =
                "No hay un empleado seleccionado.";
        }
        return;
    }

    try {
        // 3. Convertir los datos guardados a un objeto
        const empleado = JSON.parse(empleadoGuardado);

        // 4. Verificar que los datos estén completos
        if (
            !empleado.codigo ||
            !empleado.nombre_completo ||
            !empleado.dui ||
            !empleado.cargo
        ) {
            throw new Error("Datos del empleado incompletos");
        }

        // 5. Mostrar los datos del empleado en la página
        document.getElementById("empleado-codigo")
            .textContent = empleado.codigo;

        document.getElementById("empleado-nombre")
            .textContent = empleado.nombre_completo;

        document.getElementById("empleado-dui")
            .textContent = empleado.dui;

        document.getElementById("empleado-cargo")
            .textContent = empleado.cargo;

        // 6. Limpiar el mensaje de error
        if (mensaje) {
            mensaje.textContent = "";
        }

    } catch (error) {
        console.error("Error al cargar empleado:", error);

        if (mensaje) {
            mensaje.textContent =
                "No se pudieron cargar los datos del empleado.";
        }
    }
});
