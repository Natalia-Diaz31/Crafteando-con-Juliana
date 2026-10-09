document.addEventListener("DOMContentLoaded", () => {
    const formulario = document.getElementById("form-planilla");
    const resumen = document.getElementById("resumen-planilla");
    const boton = document.getElementById("revisar-planilla");
    const editar = document.getElementById("editar-datos");

    const formatoUSD = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    });

    // Al abrir la página, el resumen siempre está oculto.
    resumen.hidden = true;

    function ocultarResumen() {
        resumen.hidden = true;
        boton.setAttribute("aria-expanded", "false");
    }

    function mostrarDato(id, valor) {
        document.getElementById(id).textContent = valor;
    }

    // Convierte montos validados a centavos para calcular.
    function aCentavos(valor) {
        const [entero, decimales = ""] = valor.trim().split(".");
        return Number(entero) * 100 +
            Number(decimales.padEnd(2, "0"));
    }

    formulario.addEventListener("submit", (evento) => {
        evento.preventDefault();
        ocultarResumen();

        const empleadoValido = window.actualizarBloqueoEmpleado();
        const obligatoriosValidos =
            window.validarObligatoriosPlanilla();
        const montosValidos = window.validarMontosPlanilla();

        if (
            !empleadoValido ||
            !obligatoriosValidos ||
            !montosValidos
        ) {
            formulario.querySelector(".is-invalid")?.focus();
            return;
        }

        const mes = document.getElementById("mes").value;
        const campoAnio = document.getElementById("anio");
        const anio = campoAnio.value.trim();

        // El año debe ser un entero positivo de cuatro cifras.
        if (!/^[1-9]\d{3}$/.test(anio)) {
            const error = document.getElementById("anio-error");

            campoAnio.classList.add("is-invalid");
            campoAnio.setAttribute("aria-invalid", "true");
            error.textContent = "Ingrese un año de cuatro cifras";
            error.classList.add("d-block");
            campoAnio.focus();
            return;
        }

        const salario = aCentavos(
            document.getElementById("salario").value
        );
        const ingresos = aCentavos(
            document.getElementById("ingresos").value
        );
        const descuentos = aCentavos(
            document.getElementById("descuentos").value
        );

        if (descuentos > salario + ingresos) {
            const campo = document.getElementById("descuentos");
            const error = document.getElementById("descuentos-error");

            campo.classList.add("is-invalid");
            campo.setAttribute("aria-invalid", "true");
            error.textContent =
                "Los descuentos no pueden superar los ingresos";
            error.classList.add("d-block");
            campo.focus();
            return;
        }

        const empleado = window.obtenerEmpleadoSeleccionado();
        const total = salario + ingresos - descuentos;

        // Obtener la plantilla elegida en la HU-03.
        let plantilla = null;

        try {
            plantilla = JSON.parse(
                sessionStorage.getItem("plantillaSeleccionada")
            );
        } catch {
            plantilla = null;
        }

        if (!plantilla?.id || !plantilla?.nombre) {
            alert("Seleccione una plantilla para continuar");
            return;
        }

        mostrarDato("resumen-plantilla", plantilla.nombre);
        mostrarDato("resumen-periodo", `${mes} ${anio}`);
        mostrarDato("resumen-codigo", empleado.codigo);
        mostrarDato("resumen-nombre", empleado.nombre_completo);
        mostrarDato("resumen-dui", empleado.dui);
        mostrarDato("resumen-cargo", empleado.cargo);

        mostrarDato("resumen-salario", formatoUSD.format(salario / 100));
        mostrarDato("resumen-ingresos", formatoUSD.format(ingresos / 100));
        mostrarDato(
            "resumen-descuentos",
            formatoUSD.format(descuentos / 100)
        );
        mostrarDato("resumen-total", formatoUSD.format(total / 100));

        // Si el equipo agrega una casilla de confirmación,
        // debe confirmarse nuevamente en cada revisión.
        resumen.querySelectorAll('input[type="checkbox"]')
            .forEach((casilla) => {
                casilla.checked = false;
                casilla.dispatchEvent(new Event("change", {
                    bubbles: true
                }));
            });

        document.getElementById("mensaje-guardado").textContent = "";

        resumen.hidden = false;
        boton.setAttribute("aria-expanded", "true");
        resumen.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });

    editar.addEventListener("click", () => {
        ocultarResumen();

        // Conserva lo ingresado: no ejecuta formulario.reset().
        formulario.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        document.getElementById("mes").focus();
    });

    // Evita mostrar un resumen desactualizado al cambiar datos.
    formulario.addEventListener("input", ocultarResumen);
    formulario.addEventListener("change", ocultarResumen);
    document.addEventListener("empleado:actualizado", ocultarResumen);
});