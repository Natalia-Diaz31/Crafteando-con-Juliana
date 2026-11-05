// ARCHIVO: Pantalla «Crear planilla»: empleado seleccionado y validación de montos
// Buscar: planilla, empleado, montos, HU-05, HU-06

//
// HU-05: MOSTRAR DATOS DEL EMPLEADO SELECCIONADO
//

// Qué hace: Prepara la selección de empleado cuando carga la página
// Buscar: inicio planilla
document.addEventListener("DOMContentLoaded", () => {

    const mensaje = document.getElementById("mensaje-empleado");
    const botonCambiarEmpleado = document.getElementById("cambiar-empleado");

    // Qué hace: Muestra los datos del empleado elegido
    // Buscar: mostrarEmpleadoEnPantalla
    function mostrarEmpleadoEnPantalla(empleado) {
        const codigo = document.getElementById("empleado-codigo");
        const nombre = document.getElementById("empleado-nombre");
        const dui = document.getElementById("empleado-dui");
        const cargo = document.getElementById("empleado-cargo");
        const contrato = document.getElementById("empleado-contrato");

        if (codigo) codigo.textContent = empleado?.codigo || "---";
        if (nombre) nombre.textContent = empleado?.nombre_completo || "---";
        if (dui) dui.textContent = empleado?.dui || "---";
        if (cargo) cargo.textContent = empleado?.cargo || "---";
        if (contrato) { 
            contrato.textContent = empleado?.tipo_contrato || "No registrado";
        }
        if (mensaje) {
            mensaje.textContent = empleado ? "" : "No hay un empleado seleccionado.";
        }

        if (botonCambiarEmpleado) {
            botonCambiarEmpleado.hidden = !empleado;
        }

        // HU-25: abre el historial filtrado por el empleado seleccionado
        const historial = document.getElementById("ver-historial-empleado");

        if (historial) {
            historial.hidden = !empleado?.id;
            historial.href = empleado?.id
                ? `consultar-planillas.html?empleado_id=${encodeURIComponent(empleado.id)}`
                : "#";
        }
    }

    // Qué hace: Guarda el empleado elegido en la sesión
    // Buscar: guardarEmpleadoSeleccionado, sessionStorage
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

    // Consultar en la API los datos registrados del empleado elegido
    // Qué hace: Consulta en la API los datos del empleado
    // Buscar: consultarEmpleado, GET empleados/:id
    async function consultarEmpleado(id) {
        const token = sessionStorage.getItem("token");

        const respuesta = await fetch(
            `${API_URL}/api/empleados/${encodeURIComponent(id)}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        window.verificarAccesoApi(respuesta); // HU-32

        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.ok || !resultado.empleado) {
            throw new Error(
                resultado.mensaje || "No se pudieron consultar los datos del empleado"
            );
        }

        // La consulta no devuelve el id; se conserva el del empleado elegido
        return { id, ...resultado.empleado };
    }

    // Evita que una respuesta lenta reemplace una selección más reciente
    let ultimaConsulta = 0;
    

    // Qué hace: Quita el empleado seleccionado
    // Buscar: empleado:limpiar
    document.addEventListener("empleado:limpiar", () => {
    ultimaConsulta++;

    sessionStorage.removeItem("empleadoSeleccionado");
    mostrarEmpleadoEnPantalla(null);

    document.dispatchEvent(
        new CustomEvent("empleado:actualizado")
    );
});

// Qué hace: Vuelve a cargar el empleado de un borrador o duplicación
// Buscar: empleado:recuperar
document.addEventListener("empleado:recuperar", async evento => {
    const {
        empleado,
        resolver,
        rechazar
    } = evento.detail;

    const consulta = ++ultimaConsulta;

    try {
        if (!empleado) {
            sessionStorage.removeItem("empleadoSeleccionado");
            mostrarEmpleadoEnPantalla(null);

            document.dispatchEvent(
                new CustomEvent("empleado:actualizado")
            );

            resolver();
            return;
        }

        const actualizado = await consultarEmpleado(empleado.id);

        if (consulta !== ultimaConsulta) {
            throw new Error(
                "La selección cambió durante la recuperación"
            );
        }

        if (!guardarEmpleadoSeleccionado(actualizado)) {
            throw new Error(
                "No se pudieron recuperar los datos del empleado"
            );
        }

        resolver();
    } catch (error) {
        rechazar(error);
    }
});

    // Qué hace: Carga el empleado elegido en la búsqueda
    // Buscar: empleado:seleccionar
    document.addEventListener("empleado:seleccionar", async (evento) => {
        const consulta = ++ultimaConsulta;

        if (mensaje) {
            mensaje.textContent = "Consultando datos del empleado...";
        }

        try {
            const empleado = await consultarEmpleado(evento.detail?.id);

            if (consulta !== ultimaConsulta) return;

            guardarEmpleadoSeleccionado(empleado);
        } catch (error) {
            if (consulta !== ultimaConsulta) return;

            // Se conserva la selección anterior y se informa el error
            console.error("Error al consultar empleado:", error);

            if (mensaje) {
                // fetch lanza TypeError cuando no hay conexión con la API
                mensaje.textContent = error instanceof TypeError
                    ? "No se pudo conectar con el servidor"
                    : error.message;
            }
        }
    });

    if (botonCambiarEmpleado) {
        // Qué hace: Permite cambiar de empleado
        // Buscar: cambiar-empleado
        botonCambiarEmpleado.addEventListener("click", () => {
            const buscador = document.getElementById("buscar-empleado");

            if (buscador) {
                buscador.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

                buscador.focus();
            }
        });
    }
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

// Qué hace: Prepara la validación de montos
// Buscar: inicio montos
document.addEventListener("DOMContentLoaded", () => {

    // Campos monetarios del formulario
    const campos = [
        "salario",
        "ingresos",
        "descuentos"
    ];

    // Validar un monto individual
    // Qué hace: Valida un monto con hasta dos decimales
    // Buscar: validarMonto
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
    // Qué hace: Muestra u oculta el error de un monto
    // Buscar: mostrarValidacion
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
        // Qué hace: Valida mientras el usuario escribe
        // Buscar: input monto
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
    // Qué hace: Valida todos los montos antes de abrir el resumen
    // Buscar: validarMontosPlanilla
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

