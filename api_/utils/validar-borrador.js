// ARCHIVO: Validaciones del contenido de un borrador
// Buscar: validar borrador, HU-23

"use strict";

const { esUUIDValido } = require("./validar-uuid");
const { normalizarObservacion } = require("./validar-planilla-definitiva");

// HU-23: validación del contenido de un borrador.
// Qué hace: Revisa el formato de los datos presentes en un borrador (permite campos vacíos)
// Buscar: validarContenidoBorrador
function validarContenidoBorrador(contenido) {
    const errores = {};

    if (
        !contenido ||
        typeof contenido !== "object" ||
        Array.isArray(contenido)
    ) {
        return {
            valido: false,
            errores: {
                contenido: "El contenido del borrador debe ser un objeto"
            }
        };
    }

    // HU-29: Validar y normalizar las observaciones del borrador.
    const resultadoObservacion = normalizarObservacion(
        contenido.observaciones
    );

    if (resultadoObservacion.error) {
        errores.observaciones = resultadoObservacion.error;
    } else {
        contenido.observaciones = resultadoObservacion.valor;
    }

    if (
        !contenido.plantilla ||
        !esUUIDValido(contenido.plantilla.id)
    ) {
        errores.plantilla =
            "Debe seleccionar una plantilla válida";
    }

    if (
        contenido.empleado?.id &&
        !esUUIDValido(contenido.empleado.id)
    ) {
        errores.empleado =
            "El identificador del empleado no es válido";
    }

    const mes = contenido.mes;

    if (
        mes !== undefined &&
        mes !== null &&
        mes !== "" &&
        (
            !Number.isInteger(Number(mes)) ||
            Number(mes) < 1 ||
            Number(mes) > 12
        )
    ) {
        errores.mes = "Seleccione un mes válido";
    }

    const anio = contenido.anio;

    if (
        anio !== undefined &&
        anio !== null &&
        anio !== "" &&
        !/^[1-9]\d{3}$/.test(String(anio))
    ) {
        errores.anio = "Ingrese un año de cuatro cifras";
    }

    if (
        contenido.periodo_pago !== undefined &&
        contenido.periodo_pago !== "" &&
        !["mensual", "quincenal", "semanal"].includes(
            contenido.periodo_pago
        )
    ) {
        errores.periodo_pago =
            "Seleccione una frecuencia válida";
    }

    const camposNumericos = [
        "salario_base",
        "ingresos_adicionales",
        "horas_ordinarias",
        "horas_extras"
    ];

    for (const campo of camposNumericos) {
        const valor = contenido[campo];

        if (
            valor === undefined ||
            valor === null ||
            valor === ""
        ) {
            continue;
        }

        if (
            !/^\d+(?:\.\d{1,2})?$/.test(String(valor)) ||
            Number(valor) > 9999999999.99
        ) {
            errores[campo] =
                "Ingrese un valor válido con máximo dos decimales";
        }
    }

    for (const campo of ["ingresos", "descuentos", "novedades"]) {
        if (
            contenido[campo] !== undefined &&
            !Array.isArray(contenido[campo])
        ) {
            errores[campo] =
                `El campo ${campo} debe contener una lista`;
        }
    }

    return {
        valido: Object.keys(errores).length === 0,
        errores
    };
}

module.exports = { validarContenidoBorrador };
