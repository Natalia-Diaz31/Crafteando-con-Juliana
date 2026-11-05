// ARCHIVO: Sección de incapacidades, permisos y ausencias
// Buscar: novedades, HU-18

import { validarNovedades } from "./novedades-reglas.js";

let novedades = [];
let indiceEdicion = null;

// Qué hace: Busca un elemento por id
// Buscar: campo
const campo = id => document.getElementById(id);

// Qué hace: Lee mes, año y frecuencia de la planilla
// Buscar: obtenerPeriodo
function obtenerPeriodo() {
    return {
        mes: globalThis.ReglasNomina.numeroMes(campo("mes").value),
        anio: campo("anio").value,
        frecuencia: campo("periodo-pago").value
    };
}

// Qué hace: Avisa que la planilla cambió
// Buscar: notificarCambio
function notificarCambio() {
    document.dispatchEvent(
        new CustomEvent("planilla:modificada")
    );
}

// Qué hace: Muestra el error de novedades
// Buscar: mostrarError
function mostrarError(texto) {
    campo("novedades-error").textContent = texto;
}

// Qué hace: Devuelve las novedades agregadas
// Buscar: obtenerNovedades
export function obtenerNovedades() {
    return structuredClone(novedades);
}

// Qué hace: Devuelve novedades y días remunerados
// Buscar: obtenerEstadoNovedades, días remunerados
export function obtenerEstadoNovedades() {
    return validarNovedades(novedades, obtenerPeriodo());
}

// Qué hace: Limpia los campos de captura
// Buscar: limpiarFormulario
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

// Qué hace: Valida las novedades antes de revisar o guardar
// Buscar: validarNovedadesFormulario
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

// Qué hace: Reemplaza las novedades (borrador)
// Buscar: reemplazarNovedades
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

// Qué hace: Dibuja la tabla de novedades y los días remunerados
// Buscar: mostrarNovedades, tabla
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

    const diasRemunerados = campo("dias-remunerados");

    if (diasRemunerados) {
        diasRemunerados.value =
            resultado.valido
                ? resultado.diasRemunerados
                : "";
    }

    mostrarError(resultado.errores.join(". "));

}

// Qué hace: Prepara la sección de novedades
// Buscar: iniciarNovedades
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

    // Qué hace: Agrega una novedad
    // Buscar: agregar novedad
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

    // Qué hace: Borra las novedades al cambiar de empleado
    // Buscar: empleado:actualizado
    document.addEventListener("empleado:actualizado", () => {
        novedades = [];
        limpiarFormulario();
        mostrarNovedades();
        notificarCambio();
    });

    mostrarNovedades();
}

// Qué hace: Inicia la sección cuando carga la página
// Buscar: DOMContentLoaded
document.addEventListener("DOMContentLoaded", iniciarNovedades);