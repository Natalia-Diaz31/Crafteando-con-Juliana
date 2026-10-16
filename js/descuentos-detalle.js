document.addEventListener("DOMContentLoaded", () => {
    const conceptoInput =
        document.getElementById("descuento-concepto");

    const importeInput =
        document.getElementById("descuento-importe");

    const agregarBtn =
        document.getElementById("agregar-descuento");

    const detalle =
        document.getElementById("detalle-descuentos");

    const totalInput =
        document.getElementById("descuentos");

    let descuentos = [];
    let indiceEdicion = null;

    const MAXIMO_CENTAVOS = 999999999999;

    function crearError(input) {
        let error = document.getElementById(`${input.id}-error`);

        if (!error) {
            error = document.createElement("div");
            error.id = `${input.id}-error`;
            error.className = "invalid-feedback";
            error.setAttribute("role", "alert");

            const grupo = input.closest(".input-group");
            (grupo || input).after(error);
        }

        input.setAttribute("aria-describedby", error.id);
        return error;
    }

    const conceptoError = crearError(conceptoInput);
    const importeError = crearError(importeInput);

    function mostrarError(input, error, mensaje) {
        input.classList.toggle("is-invalid", Boolean(mensaje));
        input.setAttribute("aria-invalid", String(Boolean(mensaje)));

        error.textContent = mensaje;
        error.classList.toggle("d-block", Boolean(mensaje));
    }

    function aCentavos(texto) {
        const [entero, decimal = ""] = texto.split(".");

        return Number(entero) * 100 +
            Number(decimal.padEnd(2, "0"));
    }

    function aDecimal(centavos) {
        const entero = Math.floor(centavos / 100);
        const decimal = String(centavos % 100).padStart(2, "0");

        return `${entero}.${decimal}`;
    }

    function validarComponente() {
        const concepto = conceptoInput.value.trim();
        const importe = importeInput.value.trim();

        let errorConcepto = "";
        let errorImporte = "";
        let centavos = null;

        if (!concepto) {
            errorConcepto = "Ingrese el concepto del descuento";
        }

        if (!importe) {
            errorImporte = "Ingrese el importe del descuento";
        } else if (!/^\d+(?:\.\d{1,2})?$/.test(importe)) {
            errorImporte =
                "Ingrese un número mayor que cero, con máximo dos decimales";
        } else {
            centavos = aCentavos(importe);

            if (
                !Number.isSafeInteger(centavos) ||
                centavos <= 0 ||
                centavos > MAXIMO_CENTAVOS
            ) {
                errorImporte =
                    "El importe debe ser mayor que cero y no superar 9999999999.99";
            }
        }

        mostrarError(conceptoInput, conceptoError, errorConcepto);
        mostrarError(importeInput, importeError, errorImporte);

        if (errorConcepto || errorImporte) {
            (errorConcepto ? conceptoInput : importeInput).focus();
            return null;
        }

        return {
            concepto,
            importe: aDecimal(centavos)
        };
    }

    function obtenerSuma(lista) {
        return lista.reduce(
            (suma, descuento) => suma + aCentavos(descuento.importe),
            0
        );
    }

    function reiniciarConfirmacion() {
        const casilla =
            document.getElementById("confirmacion-revisado");

        const guardar =
            document.getElementById("btn-guardar-planilla");

        if (casilla) {
            casilla.checked = false;
            casilla.dispatchEvent(
                new Event("change", { bubbles: true })
            );
        }

        if (guardar) guardar.disabled = true;
    }

    function actualizarTotal() {
        totalInput.value = aDecimal(obtenerSuma(descuentos));

        totalInput.dispatchEvent(
            new Event("input", { bubbles: true })
        );

        reiniciarConfirmacion();
    }

    function terminarEdicion() {
        indiceEdicion = null;
        conceptoInput.value = "";
        importeInput.value = "";
        agregarBtn.textContent = "Agregar";

        mostrarError(conceptoInput, conceptoError, "");
        mostrarError(importeInput, importeError, "");
    }

    function crearBoton(texto, clase, indice) {
        const boton = document.createElement("button");

        boton.type = "button";
        boton.textContent = texto;
        boton.className = `btn btn-sm ${clase}`;
        boton.dataset.indice = String(indice);

        return boton;
    }

    function mostrarDescuentos() {
        detalle.replaceChildren();

        descuentos.forEach((descuento, indice) => {
            const fila = document.createElement("tr");

            const concepto = document.createElement("td");
            concepto.textContent = descuento.concepto;

            const importe = document.createElement("td");
            importe.textContent = `$${descuento.importe}`;

            const acciones = document.createElement("td");

            const editar = crearBoton(
                "Editar",
                "btn-outline-primary editar-descuento",
                indice
            );

            const eliminar = crearBoton(
                "Eliminar",
                "btn-outline-danger eliminar-descuento",
                indice
            );

            acciones.append(
                editar,
                document.createTextNode(" "),
                eliminar
            );

            fila.append(concepto, importe, acciones);
            detalle.appendChild(fila);
        });
    }

    agregarBtn.addEventListener("click", () => {
        const componente = validarComponente();
        if (!componente) return;

        const propuesta = descuentos.map(item => ({ ...item }));

        if (indiceEdicion === null) {
            propuesta.push(componente);
        } else {
            propuesta[indiceEdicion] = componente;
        }

        const suma = obtenerSuma(propuesta);

        if (
            !Number.isSafeInteger(suma) ||
            suma > MAXIMO_CENTAVOS
        ) {
            mostrarError(
                importeInput,
                importeError,
                "La suma de descuentos supera el máximo permitido"
            );
            return;
        }

        descuentos = propuesta;

        terminarEdicion();
        mostrarDescuentos();
        actualizarTotal();
    });

    detalle.addEventListener("click", (evento) => {
        const editar =
            evento.target.closest(".editar-descuento");

        const eliminar =
            evento.target.closest(".eliminar-descuento");

        if (editar) {
            const indice = Number(editar.dataset.indice);

            indiceEdicion = indice;
            conceptoInput.value = descuentos[indice].concepto;
            importeInput.value = descuentos[indice].importe;
            agregarBtn.textContent = "Guardar cambio";
            conceptoInput.focus();

            reiniciarConfirmacion();
        }

        if (eliminar) {
            const indice = Number(eliminar.dataset.indice);

            descuentos.splice(indice, 1);

            // Cancelar la edición evita conservar un índice desactualizado.
            terminarEdicion();
            mostrarDescuentos();
            actualizarTotal();
        }
    });

    // Punto de conexión para quien integre el guardado.
    window.obtenerDetalleDescuentos = function () {
        return descuentos.map(item => ({ ...item }));
    };

    // Evitar revisar mientras existe una edición sin confirmar.
    window.validarDetalleDescuentos = function () {
        const hayPendiente =
            indiceEdicion !== null ||
            conceptoInput.value.trim() !== "" ||
            importeInput.value.trim() !== "";

        if (hayPendiente) {
            mostrarError(
                conceptoInput,
                conceptoError,
                "Agregue o confirme el descuento antes de revisar"
            );

            conceptoInput.focus();
            return false;
        }

        return true;
    };

    totalInput.readOnly = true;

    mostrarDescuentos();
    actualizarTotal();
});