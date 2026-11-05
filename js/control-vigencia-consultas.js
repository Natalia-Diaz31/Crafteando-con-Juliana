// ARCHIVO: Control para descartar respuestas viejas de consultas
// Buscar: vigencia, cancelar consulta, HU-36

"use strict";

// HU-36: control de cancelación y vigencia de consultas.
//
// Este módulo no realiza peticiones ni modifica la interfaz.
// El componente que consulta la API conserva esas responsabilidades.

// Qué hace: Crea el control de consultas vigentes
// Buscar: crearControlVigenciaConsultas
export function crearControlVigenciaConsultas() {
    let consultaActual = null;
    let siguienteVersion = 0;

    // Qué hace: Inicia una consulta y cancela la anterior
    // Buscar: iniciarConsulta, AbortController
    function iniciarConsulta(clave) {
        if (typeof clave !== "string" || !clave.trim()) {
            throw new Error("La consulta necesita una clave válida");
        }

        // Una consulta con los mismos parámetros sigue vigente.
        if (
            consultaActual &&
            consultaActual.clave === clave &&
            !consultaActual.finalizada
        ) {
            return consultaActual;
        }

        // Una consulta diferente sustituye a la anterior.
        if (consultaActual && !consultaActual.finalizada) {
            consultaActual.controlador.abort();
            consultaActual.finalizada = true;
        }

        const consulta = {
            clave,
            version: ++siguienteVersion,
            controlador: new AbortController(),
            finalizada: false
        };

        consultaActual = consulta;

        return consulta;
    }

    // Qué hace: Indica si una respuesta sigue siendo la vigente
    // Buscar: estaVigente
    function estaVigente(consulta) {
        return Boolean(
            consulta &&
            consultaActual === consulta &&
            !consulta.finalizada &&
            !consulta.controlador.signal.aborted
        );
    }

    // Qué hace: Libera la consulta al terminar
    // Buscar: finalizarConsulta
    function finalizarConsulta(consulta) {
        if (!consulta || consulta.finalizada) {
            return false;
        }

        const vigente = estaVigente(consulta);

        consulta.finalizada = true;

        if (consultaActual === consulta) {
            consultaActual = null;
        }

        return vigente;
    }

    // Qué hace: Cancela la consulta en curso
    // Buscar: cancelarConsultaActual
    function cancelarConsultaActual() {
        if (!consultaActual) {
            return false;
        }

        const consulta = consultaActual;

        consultaActual = null;
        consulta.finalizada = true;

        if (!consulta.controlador.signal.aborted) {
            consulta.controlador.abort();
        }

        return true;
    }

    return {
        iniciarConsulta,
        estaVigente,
        finalizarConsulta,
        cancelarConsultaActual
    };
}
