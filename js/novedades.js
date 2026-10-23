import { validarNovedades } from "./novedades-reglas.js";

let novedades = [];
let indiceEdicion = null;

const campo = id => document.getElementById(id);

function obtenerPeriodo() {
    return {
        mes: globalThis.ReglasNomina.numeroMes(campo("mes").value),
        anio: campo("anio").value,
        frecuencia: campo("periodo-pago").value
    };
}

function notificarCambio() {
    document.dispatchEvent(
        new CustomEvent("planilla:modificada")
    );
}

function mostrarError(texto) {
    campo("novedades-error").textContent = texto;
}

export function obtenerNovedades() {
    return structuredClone(novedades);
}

export function obtenerEstadoNovedades() {
    return validarNovedades(novedades, obtenerPeriodo());
}

function limpiarFormulario() {
    indiceEdicion = null;

    [
        "novedad-tipo",
        "novedad-condicion",
        "novedad-inicio",
        "novedad-fin"
    ].forEach(id => {
        campo(id).value = "";
    });

    campo("agregar-novedad").textContent = "Agregar novedad";
}

export function validarNovedadesFormulario() {
    const resultado = obtenerEstadoNovedades();

    const hayPendiente =
        indiceEdicion !== null ||
        [
            "novedad-tipo",
            "novedad-condicion",
            "novedad-inicio",
            "novedad-fin"
        ].some(id => campo(id).value !== "");

    mostrarError(
        hayPendiente
            ? "Agregue o confirme la novedad antes de continuar"
            : resultado.errores.join(". ")
    );

    return resultado.valido && !hayPendiente;
}

export function reemplazarNovedades(lista) {
    const resultado = validarNovedades(lista, obtenerPeriodo());

    if (!resultado.valido) {
        throw new Error(resultado.errores.join(". "));
    }

    novedades = resultado.novedades;
    limpiarFormulario();
    mostrarNovedades();
    notificarCambio();
}

function mostrarNovedades() {
    const cuerpo = campo("detalle-novedades");
    cuerpo.replaceChildren();

    novedades.forEach((novedad, indice) => {
        const fila = document.createElement("tr");

        [
            novedad.tipo,
            novedad.fechaInicio,
            novedad.fechaFin,
            novedad.condicion,
            novedad.dias
        ].forEach(valor => {
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
                    novedades.splice(indice, 1);
                    limpiarFormulario();
                    mostrarNovedades();
                } else {
                    indiceEdicion = indice;

                    campo("novedad-tipo").value = novedad.tipo;
                    campo("novedad-condicion").value = novedad.condicion;
                    campo("novedad-inicio").value = novedad.fechaInicio;
                    campo("novedad-fin").value = novedad.fechaFin;

                    campo("agregar-novedad").textContent =
                        "Guardar cambios";
                }

                notificarCambio();
            });

            acciones.append(boton);
        });

        fila.append(acciones);
        cuerpo.append(fila);
    });

    const resultado = obtenerEstadoNovedades();

    campo("total-dias-remunerados").textContent =
        resultado.valido
            ? resultado.diasRemunerados
            : "—";

    mostrarError(resultado.errores.join(". "));
}

function iniciarNovedades() {
    const agregar = campo("agregar-novedad");

    if (!agregar) return;

    if (!campo("novedades-error")) {
        const error = document.createElement("p");

        error.id = "novedades-error";
        error.className = "text-danger mt-2";
        error.setAttribute("role", "alert");

        agregar.after(error);
    }

    agregar.addEventListener("click", () => {
        const nueva = {
            tipo: campo("novedad-tipo").value,
            condicion: campo("novedad-condicion").value,
            fechaInicio: campo("novedad-inicio").value,
            fechaFin: campo("novedad-fin").value
        };

        const propuesta = [...novedades];

        if (indiceEdicion === null) {
            propuesta.push(nueva);
        } else {
            propuesta[indiceEdicion] = nueva;
        }

        try {
            reemplazarNovedades(propuesta);
        } catch (error) {
            mostrarError(error.message);
        }
    });

    ["mes", "anio", "periodo-pago"].forEach(id => {
        campo(id).addEventListener("change", () => {
            mostrarNovedades();
            notificarCambio();
        });
    });

    campo("anio").addEventListener("input", () => {
        mostrarNovedades();
        notificarCambio();
    });

    document.addEventListener("empleado:actualizado", () => {
        novedades = [];
        limpiarFormulario();
        mostrarNovedades();
        notificarCambio();
    });

    mostrarNovedades();
}

document.addEventListener("DOMContentLoaded", iniciarNovedades);