import {
    validarObservacionesFormulario
} from "./observaciones.js";

import {
    validarNovedadesFormulario
} from "./novedades.js";

import {
    validarIngresosPendientes
} from "./ingresos-detalle.js";

import {
    validarAjusteFormulario
} from "./salario-ajuste.js";

const VALIDACIONES_COMPONENTES = [
    {
        campo: "novedad-tipo",
        mensaje: "Corrija o confirme las novedades de la planilla",
        validar: validarNovedadesFormulario
    },
    {
        campo: "ingreso-tipo",
        mensaje: "Agregue o confirme el ingreso pendiente",
        validar: validarIngresosPendientes
    },
    {
        campo: "salario",
        mensaje: "Corrija el salario o el motivo de ajuste",
        validar: validarAjusteFormulario
    },
    {
    campo: "observaciones",
    mensaje: "La observación no puede superar 500 caracteres",
    validar: validarObservacionesFormulario
    }
];

export function validarRevision(
    validacionesAdicionales = []
) {
    const errores = [];

    for (const regla of [
        ...VALIDACIONES_COMPONENTES,
        ...validacionesAdicionales
    ]) {
        if (!regla.validar()) {
            errores.push({
                campo: regla.campo,
                mensaje: regla.mensaje
            });
        }
    }

    return {
        valido: errores.length === 0,
        errores
    };
}