
"use strict";

// HU-36: control de cancelación y vigencia de consultas.
//
// Este módulo no realiza peticiones ni modifica la interfaz.
// El componente que consulta la API conserva esas responsabilidades.

export function crearControlVigenciaConsultas() {
    let consultaActual = null;
    let siguienteVersion = 0;

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

    function estaVigente(consulta) {
        return Boolean(
            consulta &&
            consultaActual === consulta &&
            !consulta.finalizada &&
            !consulta.controlador.signal.aborted
        );
    }

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
