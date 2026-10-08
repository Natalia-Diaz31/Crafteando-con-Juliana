
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

