
"use strict";

// HU-35: validaciones adicionales para el coordinador.
// Cada regla se ejecuta desde su componente original.

import {
    validarEmpleadoSeleccionado
} from "./empleado-bloqueo.js";

import {
    validarObligatoriosPlanilla
} from "./planilla-obligatorios.js";

import {
    validarDeduccionesLegales
} from "./deducciones-legales.js";

import {
    validarHorasPlanilla
} from "./horas-validacion.js";

import {
    esPlanillaPorDias
} from "./salario-dias.js";

export function validarEmpleadoRevision() {
    return validarEmpleadoSeleccionado();
}

export function validarObligatoriosRevision() {
    return validarObligatoriosPlanilla();
}

export function validarDeduccionesRevision() {
    return validarDeduccionesLegales();
}

export function validarHorasRevision() {
    // HU-19: las planillas por días no requieren validar horas.
    if (esPlanillaPorDias()) {
        return true;
    }

    return validarHorasPlanilla();
}

export const VALIDACIONES_REVISION_COMPONENTES = [
    {
        campo: "datos-pago",
        mensaje: "Seleccione un empleado para continuar",
        validar: validarEmpleadoRevision
    },
    {
        campo: "mes",
        mensaje: "Complete los campos obligatorios de la planilla",
        validar: validarObligatoriosRevision
    },
    {
        campo: "periodo-pago",
        mensaje: "Corrija los datos necesarios para calcular las deducciones legales",
        validar: validarDeduccionesRevision
    },
    {
        campo: "horas-ordinarias",
        mensaje: "Corrija las horas de la planilla",
        validar: validarHorasRevision
    }
];
