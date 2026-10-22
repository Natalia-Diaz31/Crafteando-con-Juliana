//
// HU-18: Registro de novedades del empleado
//

let novedades = [];
let novedadEditando = null;


// Agregar una nueva novedad o guardar una edición
function guardarNovedad() {

    const tipo = document.getElementById("novedad-tipo").value;
    const condicion = document.getElementById("novedad-condicion").value;
    const fechaInicio = document.getElementById("novedad-inicio").value;
    const fechaFin = document.getElementById("novedad-fin").value;

    if (!tipo || !condicion || !fechaInicio || !fechaFin) {
        return;
    }

    const dias = calcularDiasNovedad(fechaInicio, fechaFin);

    const novedad = {
        tipo,
        condicion,
        fechaInicio,
        fechaFin,
        dias
    };

    if (novedadEditando === null) {
        novedades.push(novedad);
    } else {
        novedades[novedadEditando] = novedad;
        novedadEditando = null;
    }

    limpiarFormularioNovedad();
    mostrarNovedades();
}


// Calcular los días de una novedad incluyendo inicio y fin
function calcularDiasNovedad(fechaInicio, fechaFin) {

    const inicio = new Date(`${fechaInicio}T00:00:00`);
    const fin = new Date(`${fechaFin}T00:00:00`);

    const diferencia = fin - inicio;

    return Math.floor(
        diferencia / (1000 * 60 * 60 * 24)
    ) + 1;
}


// Mostrar las novedades registradas
function mostrarNovedades() {

    const detalle =
        document.getElementById("detalle-novedades");

    detalle.innerHTML = "";

    novedades.forEach((novedad, indice) => {

        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>${novedad.tipo}</td>
            <td>${novedad.fechaInicio}</td>
            <td>${novedad.fechaFin}</td>
            <td>${novedad.condicion}</td>
            <td>${novedad.dias}</td>
            <td>
                <button
                    type="button"
                    class="btn btn-outline-primary btn-sm"
                    data-accion="editar"
                    data-indice="${indice}">
                    Editar
                </button>

                <button
                    type="button"
                    class="btn btn-outline-danger btn-sm"
                    data-accion="eliminar"
                    data-indice="${indice}">
                    Eliminar
                </button>
            </td>
        `;

        detalle.appendChild(fila);
    });

    actualizarDiasRemunerados();
}


// Cargar una novedad nuevamente en el formulario
function editarNovedad(indice) {

    const novedad = novedades[indice];

    document.getElementById("novedad-tipo").value =
        novedad.tipo;

    document.getElementById("novedad-condicion").value =
        novedad.condicion;

    document.getElementById("novedad-inicio").value =
        novedad.fechaInicio;

    document.getElementById("novedad-fin").value =
        novedad.fechaFin;

    novedadEditando = indice;

    document.getElementById("agregar-novedad").textContent =
        "Guardar cambios";
}


// Eliminar una novedad
function eliminarNovedad(indice) {

    novedades.splice(indice, 1);

    if (novedadEditando === indice) {
        limpiarFormularioNovedad();
    }

    novedadEditando = null;

    mostrarNovedades();
}

// Calcular el total de días remunerados
function actualizarDiasRemunerados() {

    const diasSinGoce = novedades
        .filter(novedad => novedad.condicion === "Sin goce")
        .reduce((total, novedad) => total + novedad.dias, 0);

    const totalRemunerados = 30 - diasSinGoce;

    document.getElementById("total-dias-remunerados").textContent =
        totalRemunerados;
}

// Limpiar los campos después de guardar
function limpiarFormularioNovedad() {

    document.getElementById("novedad-tipo").value = "";
    document.getElementById("novedad-condicion").value = "";
    document.getElementById("novedad-inicio").value = "";
    document.getElementById("novedad-fin").value = "";

    document.getElementById("agregar-novedad").textContent =
        "Agregar novedad";
}

// Eventos de HU-18
document.addEventListener("DOMContentLoaded", () => {

    const botonAgregar =
        document.getElementById("agregar-novedad");

    const detalle =
        document.getElementById("detalle-novedades");

    botonAgregar.addEventListener(
        "click",
        guardarNovedad
    );

    detalle.addEventListener("click", (evento) => {

        const boton = evento.target.closest(
            "button[data-accion]"
        );

        if (!boton) {
            return;
        }

        const indice = Number(boton.dataset.indice);

        if (boton.dataset.accion === "editar") {
            editarNovedad(indice);
        }

        if (boton.dataset.accion === "eliminar") {
            eliminarNovedad(indice);
        }
    });
});