let ingresos = [];
let indiceEdicion = null;
let controles = null;

const motor = () => globalThis.ReglasNomina;

function notificarCambio() {
    document.dispatchEvent(
        new CustomEvent("planilla:modificada")
    );
}

export function normalizarIngresos(lista) {
    if (!Array.isArray(lista)) {
        throw new Error("La lista de ingresos es inválida");
    }

    const detalle = lista.map(item => {
        if (!item || !["Bono", "Incentivo"].includes(item.tipo)) {
            throw new Error("Seleccione Bono o Incentivo");
        }

        const concepto =
            typeof item.concepto === "string"
                ? item.concepto.trim()
                : "";

        if (!concepto || concepto.length > 100) {
            throw new Error(
                "El concepto debe tener entre 1 y 100 caracteres"
            );
        }

        const importe = motor().centavos(item.importe);

        if (importe <= 0) {
            throw new Error("El importe debe ser mayor que cero");
        }

        const origen = item.origen ?? "Manual";

        if (!["Manual", "CSV"].includes(origen)) {
            throw new Error("El origen del ingreso es inválido");
        }

        return {
            tipo: item.tipo,
            concepto,
            importe: motor().decimal(importe),
            origen
        };
    });

    const suma = detalle.reduce(
        (total, item) => total + motor().centavos(item.importe),
        0
    );

    const total = motor().decimal(suma);

    // Reutiliza el límite de almacenamiento del motor existente.
    motor().centavos(total);

    return { detalle, total };
}

export function obtenerIngresos() {
    if (!controles) return null;

    return normalizarIngresos(ingresos);
}

export function reemplazarIngresos(lista) {
    if (!controles) {
        throw new Error(
            "El formulario de ingresos todavía no está integrado"
        );
    }

    const resultado = normalizarIngresos(lista);

    ingresos = resultado.detalle;

    limpiarEdicion();
    mostrarIngresos();

    controles.total.value = resultado.total;

    controles.total.dispatchEvent(
        new Event("input", { bubbles: true })
    );

    notificarCambio();
}

export function validarIngresosPendientes() {
    if (!controles) return true;

    const hayPendiente =
        indiceEdicion !== null ||
        controles.tipo.value !== "" ||
        controles.concepto.value.trim() !== "" ||
        controles.importe.value.trim() !== "";

    controles.error.textContent = hayPendiente
        ? "Agregue o confirme el ingreso antes de continuar"
        : "";

    return !hayPendiente;
}

function limpiarEdicion() {
    indiceEdicion = null;

    controles.tipo.value = "";
    controles.concepto.value = "";
    controles.importe.value = "";
    controles.agregar.textContent = "Agregar ingreso";
    controles.error.textContent = "";
}

function mostrarIngresos() {
    controles.detalle.replaceChildren();

    ingresos.forEach((item, indice) => {
        const fila = document.createElement("tr");

        [item.tipo, item.concepto, item.importe].forEach(valor => {
            const celda = document.createElement("td");
            celda.textContent = valor;
            fila.append(celda);
        });

        const acciones = document.createElement("td");

        ["Editar", "Eliminar"].forEach(accion => {
            const boton = document.createElement("button");

            boton.type = "button";
            boton.textContent = accion;
            boton.className = "btn btn-outline-primary btn-sm";

            boton.addEventListener("click", () => {
                if (accion === "Eliminar") {
                    reemplazarIngresos(
                        ingresos.filter((_, posicion) =>
                            posicion !== indice
                        )
                    );
                } else {
                    indiceEdicion = indice;

                    controles.tipo.value = item.tipo;
                    controles.concepto.value = item.concepto;
                    controles.importe.value = item.importe;
                    controles.agregar.textContent = "Guardar cambio";

                    notificarCambio();
                }
            });

            acciones.append(boton);
        });

        fila.append(acciones);
        controles.detalle.append(fila);
    });
}

function iniciarIngresos() {
    const buscar = id => document.getElementById(id);

    // Natalia incorpora este formulario.
    if (!buscar("ingreso-tipo")) return;

    const elementos = {
        tipo: buscar("ingreso-tipo"),
        concepto: buscar("ingreso-concepto"),
        importe: buscar("ingreso-importe"),
        agregar: buscar("agregar-ingreso"),
        detalle: buscar("detalle-ingresos"),
        error: buscar("ingreso-error"),
        total: buscar("ingresos")
    };

    if (!Object.values(elementos).every(Boolean)) {
        console.error("Faltan controles del formulario de ingresos");
        return;
    }

    if (
        elementos.total.value.trim() !== "" &&
        motor().centavos(elementos.total.value) !== 0
    ) {
        elementos.error.textContent =
            "Desglose el ingreso adicional existente antes de activar esta sección";

        return;
    }

    controles = elementos;
    controles.total.readOnly = true;
    controles.total.value = "0.00";

    controles.agregar.addEventListener("click", () => {
        const nueva = {
            tipo: controles.tipo.value,
            concepto: controles.concepto.value,
            importe: controles.importe.value
        };

        const propuesta = [...ingresos];

        if (indiceEdicion === null) {
            propuesta.push(nueva);
        } else {
            propuesta[indiceEdicion] = nueva;
        }

        try {
            reemplazarIngresos(propuesta);
        } catch (error) {
            controles.error.textContent = error.message;
        }
    });
}

document.addEventListener("DOMContentLoaded", iniciarIngresos);