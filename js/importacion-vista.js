// ARCHIVO: Sección «Importar conceptos desde CSV» del formulario
// Buscar: importación vista, HU-22

import { leerArchivoCSV } from "./importacion-csv.js";

import {
    validarImportacion,
    aplicarImportacion
} from "./importacion-aplicar.js";

const elementos = {
    archivo: document.getElementById("archivo-importacion"),
    descargarEjemplo: document.getElementById("descargar-ejemplo-importacion"),
    revisar: document.getElementById("validar-importacion"),
    mensaje: document.getElementById("importacion-mensaje"),
    errores: document.getElementById("importacion-errores"),
    vistaPrevia: document.getElementById("importacion-vista-previa"),
    resultados: document.getElementById("importacion-resultados"),
    cantidad: document.getElementById("importacion-validos"),
    totalIngresos: document.getElementById("importacion-total-ingresos"),
    totalDescuentos: document.getElementById("importacion-total-descuentos"),
    aplicar: document.getElementById("aplicar-importacion")
};

let filasValidadas = [];
// Qué hace: Muestra un mensaje de estado de la importación
// Buscar: mostrarMensaje
function mostrarMensaje(texto, tipo = "normal") {
    elementos.mensaje.textContent = texto;

    elementos.mensaje.classList.remove(
        "text-danger",
        "text-success"
    );

    if (tipo === "error") {
        elementos.mensaje.classList.add("text-danger");
    }

    if (tipo === "exito") {
        elementos.mensaje.classList.add("text-success");
    }
}

// Qué hace: Borra la lista de errores
// Buscar: limpiarErrores
function limpiarErrores() {
    elementos.errores.replaceChildren();
}

// Qué hace: Muestra los errores por fila y campo
// Buscar: mostrarErrores
function mostrarErrores(errores = []) {
    limpiarErrores();

    errores.forEach(error => {
        const mensaje = document.createElement("p");
        mensaje.className = "text-danger mb-1";

        const partes = [];

        if (error.fila !== null && error.fila !== undefined) {
            partes.push(`Fila ${error.fila}`);
        }

        if (error.campo) {
            partes.push(`Campo: ${error.campo}`);
        }

        const ubicacion = partes.length
            ? `${partes.join(" · ")}: `
            : "";

        mensaje.textContent =
            `${ubicacion}${error.motivo ?? "Error de validación"}`;

        elementos.errores.append(mensaje);
    });
}

// Qué hace: Borra la vista previa
// Buscar: limpiarVistaPrevia
function limpiarVistaPrevia() {
    filasValidadas = [];

    elementos.resultados.replaceChildren();
    elementos.vistaPrevia.hidden = true;
    elementos.aplicar.disabled = true;

    elementos.cantidad.textContent = "0";
    elementos.totalIngresos.textContent = "0.00";
    elementos.totalDescuentos.textContent = "0.00";
}

// Qué hace: Muestra cuántas filas son válidas y sus totales
// Buscar: mostrarVistaPrevia
function mostrarVistaPrevia(resultado) {
    elementos.resultados.replaceChildren();

    resultado.filas.forEach((fila, indice) => {
        const registro = document.createElement("tr");

        const datos = [
            fila.numeroFila ?? indice + 2,
            fila.tipo ?? "",
            fila.concepto ?? "",
            fila.importe ?? "",
            "Válido"
        ];

        datos.forEach(dato => {
            const celda = document.createElement("td");
            celda.textContent = dato;
            registro.append(celda);
        });

        elementos.resultados.append(registro);
    });

    elementos.cantidad.textContent =
        resultado.cantidad ?? resultado.filas.length;

    elementos.totalIngresos.textContent =
        Number(resultado.total_ingresos ?? 0).toFixed(2);

    elementos.totalDescuentos.textContent =
        Number(resultado.total_descuentos ?? 0).toFixed(2);

    elementos.vistaPrevia.hidden = false;
}
// Qué hace: Indica si hay empleado, mes y año para importar
// Buscar: puedeImportar
function puedeImportar() {
    const empleado = sessionStorage.getItem("empleadoSeleccionado");
    const mes = document.getElementById("mes")?.value;
    const anio = document.getElementById("anio")?.value;

    return Boolean(empleado && mes && anio);
}

// Qué hace: Habilita o deshabilita los botones de importación
// Buscar: actualizarDisponibilidad
function actualizarDisponibilidad() {
    const disponible = puedeImportar();

    elementos.archivo.disabled = !disponible;
    elementos.descargarEjemplo.disabled = !disponible;
    elementos.revisar.disabled = !disponible;

    if (!disponible) {
        limpiarVistaPrevia();
        limpiarErrores();

        mostrarMensaje(
            "Seleccione un empleado y un período para importar conceptos."
        );
    }
}
// Qué hace: Lee el archivo y lo valida en la API
// Buscar: revisarArchivo, Revisar archivo
async function revisarArchivo() {
    limpiarVistaPrevia();
    limpiarErrores();

    const archivo = elementos.archivo.files[0];

    if (!archivo) {
        mostrarMensaje("Seleccione un archivo CSV.", "error");
        return;
    }

    try {
        mostrarMensaje("Revisando archivo...");

        const lectura = await leerArchivoCSV(archivo);

        if (!lectura.valido) {
            mostrarErrores(lectura.errores);

            mostrarMensaje(
                "El archivo contiene errores. No se aplicó ningún cambio.",
                "error"
            );

            return;
        }

        const resultado = await validarImportacion(lectura.filas);

        if (!resultado.valido) {
            mostrarErrores(resultado.errores);

            mostrarMensaje(
                "El archivo contiene errores. No se aplicó ningún cambio.",
                "error"
            );

            return;
        }

        filasValidadas = resultado.filas;

        mostrarVistaPrevia(resultado);
        elementos.aplicar.disabled = false;

        mostrarMensaje(
            "Archivo válido. Revise los datos antes de aplicar la importación.",
            "exito"
        );
    } catch (error) {
        mostrarMensaje(
            error.message || "No se pudo revisar el archivo.",
            "error"
        );
    }
}
// Qué hace: Pide confirmación y aplica las filas al formulario
// Buscar: confirmarImportacion, Aplicar
function confirmarImportacion() {
    if (filasValidadas.length === 0) {
        return;
    }

    const confirmado = window.confirm(
        "La importación sustituirá los bonos, incentivos y descuentos manuales actuales. ¿Desea continuar?"
    );

    if (!confirmado) {
        return;
    }

    try {
        aplicarImportacion(filasValidadas);

        elementos.aplicar.disabled = true;

        mostrarMensaje(
            "Importación aplicada correctamente.",
            "exito"
        );
    } catch (error) {
        mostrarMensaje(
            error.message || "No se pudo aplicar la importación.",
            "error"
        );
    }
}

// Qué hace: Descarga un CSV de ejemplo
// Buscar: descargarEjemplo
function descargarEjemplo() {
    const empleado = JSON.parse(
        sessionStorage.getItem("empleadoSeleccionado") ?? "null"
    );

    const mes = document.getElementById("mes")?.value;
    const anio = document.getElementById("anio")?.value;

    if (!empleado || !mes || !anio) {
        mostrarMensaje(
            "Seleccione un empleado y un período antes de descargar el ejemplo.",
            "error"
        );
        return;
    }

    const numeroMes = globalThis.ReglasNomina.numeroMes(mes);

    const contenido = [
        "codigo_empleado,mes,anio,tipo,concepto,importe",
        `${empleado.codigo},${numeroMes},${anio},bono,Bono por desempeño,50.00`,
        `${empleado.codigo},${numeroMes},${anio},incentivo,Incentivo mensual,25.00`,
        `${empleado.codigo},${numeroMes},${anio},descuento,Descuento manual,10.00`
    ].join("\n");

    const archivo = new Blob(
        ["\uFEFF", contenido],
        { type: "text/csv;charset=utf-8" }
    );

    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = "ejemplo-importacion.csv";

    enlace.click();

    URL.revokeObjectURL(url);
}
// Qué hace: Conecta el botón del archivo de ejemplo
// Buscar: descargar-ejemplo-importacion
elementos.descargarEjemplo.addEventListener("click", descargarEjemplo);

// Qué hace: Conecta el botón «Revisar archivo»
// Buscar: validar-importacion
elementos.revisar.addEventListener("click", revisarArchivo);

// Qué hace: Conecta el botón «Aplicar importación»
// Buscar: aplicar-importacion
elementos.aplicar.addEventListener("click", confirmarImportacion);

// Qué hace: Reinicia la vista al elegir otro archivo
// Buscar: archivo-importacion
elementos.archivo.addEventListener("change", () => {
    limpiarVistaPrevia();
    limpiarErrores();
    mostrarMensaje("");
});

document.getElementById("mes")?.addEventListener(
    "change",
    reiniciarImportacionPorCambioDeContexto
);

document.getElementById("anio")?.addEventListener(
    "input",
    reiniciarImportacionPorCambioDeContexto
);

// Qué hace: Reinicia la importación al cambiar empleado, mes o año
// Buscar: cambio de contexto
document.addEventListener(
    "empleado:actualizado",
    reiniciarImportacionPorCambioDeContexto
);

actualizarDisponibilidad();

// Qué hace: Borra la importación validada para otro empleado o período
// Buscar: reiniciarImportacionPorCambioDeContexto
function reiniciarImportacionPorCambioDeContexto() {
    limpiarVistaPrevia();
    limpiarErrores();
    mostrarMensaje("");
    actualizarDisponibilidad();
}
