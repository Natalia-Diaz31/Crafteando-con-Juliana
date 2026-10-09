
//
// HU-05: MOSTRAR DATOS DEL EMPLEADO SELECCIONADO
//

document.addEventListener("DOMContentLoaded", () => {

    const mensaje = document.getElementById("mensaje-empleado");

    function mostrarEmpleadoEnPantalla(empleado) {
        const codigo = document.getElementById("empleado-codigo");
        const nombre = document.getElementById("empleado-nombre");
        const dui = document.getElementById("empleado-dui");
        const cargo = document.getElementById("empleado-cargo");

        if (codigo) codigo.textContent = empleado?.codigo || "---";
        if (nombre) nombre.textContent = empleado?.nombre_completo || "---";
        if (dui) dui.textContent = empleado?.dui || "---";
        if (cargo) cargo.textContent = empleado?.cargo || "---";

        if (mensaje) {
            mensaje.textContent = empleado ? "" : "No hay un empleado seleccionado.";
        }
    }

    function guardarEmpleadoSeleccionado(empleado) {
        if (!empleado ||
            !empleado.codigo ||
            !empleado.nombre_completo ||
            !empleado.dui ||
            !empleado.cargo) {
            sessionStorage.removeItem("empleadoSeleccionado");
            mostrarEmpleadoEnPantalla(null);
            return false;
        }

        sessionStorage.setItem("empleadoSeleccionado", JSON.stringify(empleado));
        mostrarEmpleadoEnPantalla(empleado);
        document.dispatchEvent(new CustomEvent("empleado:actualizado"));
        return true;
    }

    document.addEventListener("empleado:seleccionar", (evento) => {
        guardarEmpleadoSeleccionado(evento.detail);
    });

    const empleadoGuardado = sessionStorage.getItem("empleadoSeleccionado");

    if (!empleadoGuardado) {
        mostrarEmpleadoEnPantalla(null);
        return;
    }

    try {
        const empleado = JSON.parse(empleadoGuardado);

        if (!guardarEmpleadoSeleccionado(empleado)) {
            throw new Error("Datos del empleado incompletos");
        }
    } catch (error) {
        console.error("Error al cargar empleado:", error);

        if (mensaje) {
            mensaje.textContent = "No se pudieron cargar los datos del empleado.";
        }
    }
});


//
// HU-06: VALIDACIÓN DE MONTOS MONETARIOS
//

document.addEventListener("DOMContentLoaded", () => {

    // Campos monetarios del formulario
    const campos = [
        "salario",
        "ingresos",
        "descuentos"
    ];

    // Validar un monto individual
    function validarMonto(valor) {

        const texto = valor.trim();

        // Campo vacío
        if (texto === "") {
            return "Este campo es obligatorio";
        }

        // Números negativos
        if (texto.startsWith("-")) {
            return "No se permiten valores negativos";
        }

        // Letras u otros caracteres no válidos
        if (!/^[0-9.]+$/.test(texto)) {
            return "Solo se permiten números y punto decimal";
        }

        // Más de dos decimales
        if (/^\d+\.\d{3,}$/.test(texto)) {
            return "Se permiten máximo dos decimales";
        }

        // Formato numérico incorrecto
        if (!/^\d+(\.\d{1,2})?$/.test(texto)) {
            return "Ingrese un monto válido";
        }

        // Límite compatible con NUMERIC(12,2)
        const parteEntera = texto.split(".")[0];

        if (Number(parteEntera) > 9999999999.99) {
            return "El monto supera el máximo permitido";
        }

        // Sin errores
        return "";
    }

    // Mostrar o quitar los mensajes de error
    function mostrarValidacion(input) {

        const mensaje = validarMonto(input.value);

        const error = document.getElementById(
            input.id + "-error"
        );

        if (mensaje) {
            input.classList.add("is-invalid");
            input.setAttribute("aria-invalid", "true");

            error.textContent = mensaje;
            error.classList.add("d-block");

            return false;
        }

        input.classList.remove("is-invalid");
        input.removeAttribute("aria-invalid");

        error.textContent = "";
        error.classList.remove("d-block");

        return true;
    }

    // Preparar las validaciones de cada campo
    campos.forEach(id => {

        const input = document.getElementById(id);

        if (!input) return;

        // Crear espacio para mensajes de error
        const error = document.createElement("div");

        error.id = id + "-error";
        error.className = "invalid-feedback";
        error.setAttribute("role", "alert");

        input.closest(".input-group").after(error);

        input.setAttribute(
            "aria-describedby",
            error.id
        );

        // Validar mientras el usuario escribe
        input.addEventListener("input", () => {
            mostrarValidacion(input);
        });

        // Validar cuando sale del campo
        input.addEventListener("blur", () => {
            mostrarValidacion(input);
        });

    });

    // Esta función se reutilizará en HU-07
    // antes de permitir abrir el resumen.
    window.validarMontosPlanilla = function () {

        let todosValidos = true;

        campos.forEach(id => {
            const input = document.getElementById(id);

            if (input && !mostrarValidacion(input)) {
                todosValidos = false;
            }
        });

        return todosValidos;
    };

});

