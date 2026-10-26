import {
    guardarBorrador,
    listarBorradores,
    abrirBorrador
} from "./borradores-api.js";

const elementos = {
    guardar: document.getElementById("guardar-borrador"),
    mensaje: document.getElementById("borrador-mensaje"),
    lista: document.getElementById("lista-borradores")
};

function mostrarMensaje(texto, tipo = "normal") {
    elementos.mensaje.textContent = texto;
    elementos.mensaje.classList.remove("text-danger", "text-success");

    if (tipo === "error") {
        elementos.mensaje.classList.add("text-danger");
    }

    if (tipo === "exito") {
        elementos.mensaje.classList.add("text-success");
    }
}

function mostrarListaVacia() {
    elementos.lista.replaceChildren();

    const fila = document.createElement("tr");
    const celda = document.createElement("td");

    celda.colSpan = 5;
    celda.className = "text-muted";
    celda.textContent = "No hay borradores guardados.";

    fila.append(celda);
    elementos.lista.append(fila);
}

function obtenerTextoEmpleado(borrador) {
    return borrador.contenido?.empleado?.nombre_completo
        ?? borrador.contenido?.empleado?.nombre
        ?? "Sin empleado";
}

function obtenerTextoPlantilla(borrador) {
    return borrador.contenido?.plantilla?.nombre
        ?? borrador.contenido?.plantilla_nombre
        ?? "Sin plantilla";
}

function obtenerTextoPeriodo(borrador) {
    const mes = borrador.contenido?.mes ?? borrador.contenido?.periodo?.mes;
    const anio = borrador.contenido?.anio ?? borrador.contenido?.periodo?.anio;

    if (!mes && !anio) {
        return "Sin período";
    }

    return [mes, anio].filter(Boolean).join(" ");
}

function obtenerFecha(borrador) {
    const fecha = borrador.actualizado_en
        ?? borrador.updated_at
        ?? borrador.fecha_actualizacion;

    if (!fecha) {
        return "—";
    }

    return new Date(fecha).toLocaleString("es-SV");
}

function crearCelda(texto) {
    const celda = document.createElement("td");
    celda.textContent = texto;
    return celda;
}

function mostrarBorradores(borradores) {
    elementos.lista.replaceChildren();

    if (!Array.isArray(borradores) || borradores.length === 0) {
        mostrarListaVacia();
        return;
    }

    borradores.forEach(borrador => {
        const fila = document.createElement("tr");

        fila.append(
            crearCelda(obtenerTextoPlantilla(borrador)),
            crearCelda(obtenerTextoEmpleado(borrador)),
            crearCelda(obtenerTextoPeriodo(borrador)),
            crearCelda(obtenerFecha(borrador))
        );

        const celdaAccion = document.createElement("td");
        const boton = document.createElement("button");

        boton.type = "button";
        boton.className = "btn btn-outline-primary btn-sm";
        boton.textContent = "Continuar";

        boton.addEventListener("click", async () => {
            boton.disabled = true;
            mostrarMensaje("Recuperando borrador...");

            try {
                await abrirBorrador(borrador.id);
                mostrarMensaje(
                    "Borrador recuperado. Puede continuar editándolo.",
                    "exito"
                );
            } catch (error) {
                mostrarMensaje(
                    error.message || "No se pudo recuperar el borrador.",
                    "error"
                );
            } finally {
                boton.disabled = false;
            }
        });

        celdaAccion.append(boton);
        fila.append(celdaAccion);

        elementos.lista.append(fila);
    });
}

async function cargarBorradores() {
    try {
        const borradores = await listarBorradores();
        mostrarBorradores(borradores);
    } catch (error) {
        elementos.lista.replaceChildren();

        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 5;
        celda.className = "text-danger";
        celda.textContent = "No se pudieron cargar los borradores.";

        fila.append(celda);
        elementos.lista.append(fila);
    }
}

async function guardar() {
    elementos.guardar.disabled = true;
    mostrarMensaje("Guardando borrador...");

    try {
        await guardarBorrador();

        mostrarMensaje(
            "Borrador guardado correctamente.",
            "exito"
        );

        await cargarBorradores();
    } catch (error) {
        mostrarMensaje(
            error.message || "No se pudo guardar el borrador.",
            "error"
        );
    } finally {
        elementos.guardar.disabled = false;
    }
}

elementos.guardar.addEventListener("click", guardar);

cargarBorradores();
