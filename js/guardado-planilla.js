import {
    obtenerNovedades,
    validarNovedadesFormulario
} from "./novedades.js";

import {
    obtenerIngresos,
    validarIngresosPendientes
} from "./ingresos-detalle.js";

import {
    obtenerAjusteSalario,
    validarAjusteFormulario
} from "./salario-ajuste.js";

import { esPlanillaPorDias } from "./salario-dias.js";

import {
    finalizarBorrador,
    obtenerBorradorActual
} from "./borradores-api.js";

let operacionActual = null;
let guardando = false;
let guardadoConfirmado = false;

document.addEventListener("planilla:nueva", () => {
    if (guardando) return;

    operacionActual = null;
    guardadoConfirmado = false;
});
//
// HU-08: Integración del guardado de planilla con API
// HU-17: Estados del botón durante el guardado de planilla
//

async function guardarPlanilla() {
    if (guardando) return;

    if (guardadoConfirmado) {
        mostrarMensajeGuardado(
            "Esta planilla ya fue guardada. Cree otra planilla"
        );
        return;
    }

    if (
        !validarNovedadesFormulario() ||
        !validarIngresosPendientes() ||
        !validarAjusteFormulario()
    ) {
        return;
    }

    const resumen = document.getElementById("resumen-planilla");
    if (resumen.hidden || !document.getElementById("confirmacion-revisado").checked) {
        mostrarMensajeGuardado("Revise y confirme la planilla antes de guardar.");
        return;
    }
    if (!window.validarDeduccionesLegales()) {
        mostrarMensajeGuardado("Corrija las deducciones legales antes de guardar.");
        return;
    }
    // Obtener datos previamente seleccionados
    const empleado = JSON.parse(
        sessionStorage.getItem("empleadoSeleccionado")
    );

    const plantilla = JSON.parse(
        sessionStorage.getItem("plantillaSeleccionada")
    );


    // Validar que existan los datos necesarios
    if (!empleado || !plantilla) {

        mostrarMensajeGuardado(
            "Debe seleccionar un empleado y una plantilla antes de guardar."
        );

        return;
    }

    if (
    !(esPlanillaPorDias() || window.validarHorasPlanilla()) ||
    !window.validarDetalleDescuentos()
) {
    mostrarMensajeGuardado(
        "Corrija los datos antes de guardar."
    );
    return;
}

    const ajuste = obtenerAjusteSalario(false);

    // Construir objeto que espera la API
    const datosPlanilla = {

        periodo_pago: document.getElementById("periodo-pago").value,
        version_regla: window.ReglasNomina.VERSION,
        empleado_id: empleado.id,

        plantilla_id: plantilla.id,

        mes: convertirMesANumero(
            document.getElementById("mes").value
        ),

        anio:
            document.getElementById("anio").value,

        salario_base:
            document.getElementById("salario").value,

        ingresos_adicionales:
            document.getElementById("ingresos").value,

        horas_ordinarias:
            document.getElementById("horas-ordinarias").value,

        horas_extras:
            document.getElementById("horas-extras").value,

        descuentos:
            window.obtenerDetalleDescuentos(),

        descuentos_totales:
            document.getElementById("descuentos").value,
        // HU-18, HU-20 y HU-21: formato acordado en docs/contrato-integracion-sprint3.md.
        // Los campos de formularios todavía no integrados quedan undefined y no se envían.
        novedades: obtenerNovedades(),

        ingresos_detalle: obtenerIngresos()?.detalle,

        salario_original: ajuste?.salario_original,
        motivo_ajuste: ajuste?.motivo_ajuste,

        // HU-19: la API recalcula días y salario proporcional a partir de las novedades.
        ...(esPlanillaPorDias() && {
            modo_calculo: "dias",
            salario_base_mensual: document.getElementById("salario").value
        })
    };

    const contenidoOperacion = JSON.stringify(datosPlanilla);

if (
    !operacionActual ||
    operacionActual.contenido !== contenidoOperacion
) {
    operacionActual = {
        id: crypto.randomUUID(),
        contenido: contenidoOperacion
    };
}

datosPlanilla.operacion_id = operacionActual.id;

    const botonGuardar = document.getElementById("btn-guardar-planilla");
    const contenidoOriginal = botonGuardar.innerHTML;

    botonGuardar.disabled = true;
    botonGuardar.innerHTML = "Guardando…";

    let guardadoExitoso = false;
    guardando = true;

    try {

        const token =
            sessionStorage.getItem("token");


        if (!token) {

            mostrarMensajeGuardado(
                "La sesión expiró. Inicie sesión nuevamente."
            );

            return;
        }


        // HU-23: con un borrador abierto, guardar la planilla es finalizar ese borrador.
        const resultado = obtenerBorradorActual()
            ? await finalizarBorrador()
            : await enviarPlanilla(token, datosPlanilla);

        guardadoExitoso = true;
        guardadoConfirmado = true;

        mostrarConfirmacion(
            resultado.id,
            `${empleado.nombre_completo} · ${document.getElementById("mes").value} ${datosPlanilla.anio}`
        );

    } catch(error) {

        mostrarMensajeGuardado(
            error.message
        );
    } finally {
    guardando = false;

    const confirmacion =
        document.getElementById("confirmacion-revisado");

    if (guardadoExitoso) {
        botonGuardar.innerHTML = "Planilla guardada";
        botonGuardar.disabled = true;
    } else {
        botonGuardar.innerHTML = contenidoOriginal;
        botonGuardar.disabled = !confirmacion.checked;
    }

}
    

}


// Convierte el nombre del mes del formulario al número que espera la API
function convertirMesANumero(mes) {

    const meses = {
        Enero: 1,
        Febrero: 2,
        Marzo: 3,
        Abril: 4,
        Mayo: 5,
        Junio: 6,
        Julio: 7,
        Agosto: 8,
        Septiembre: 9,
        Octubre: 10,
        Noviembre: 11,
        Diciembre: 12
    };


    return meses[mes];

}


async function enviarPlanilla(token, datosPlanilla) {
    const respuesta = await fetch(
        `${API_URL}/api/planillas`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },

            body: JSON.stringify(datosPlanilla)
        }
    );

    const resultado = await respuesta.json();

    if (!respuesta.ok || !resultado.ok || !resultado.id) {
        // Incluye el motivo de cada campo rechazado por la API.
        throw new Error(
            [resultado.mensaje, ...Object.values(resultado.errores ?? {})]
                .filter(Boolean)
                .join(". ") ||
            "No se pudo guardar la planilla"
        );
    }

    return resultado;
}

// HU-17: confirmación con acceso al detalle y a una planilla nueva.
// «Crear otra planilla» recarga la página: así se reinicia todo el estado,
// incluido el identificador de operación, sin limpiar campo por campo.
function mostrarConfirmacion(id, empleadoYPeriodo) {
    const enlace = (texto, href, clase) => Object.assign(
        document.createElement("a"),
        { textContent: texto, href, className: `btn btn-sm ms-2 ${clase}` }
    );

    const ver = enlace(
        "Ver planilla",
        `detalle-planilla.html?id=${encodeURIComponent(id)}`,
        "btn-outline-primary"
    );
    const otra = enlace("Crear otra planilla", "planilla.html", "btn-primary");

    otra.addEventListener("click", () =>
        sessionStorage.removeItem("empleadoSeleccionado")
    );

    document.getElementById("mensaje-guardado").replaceChildren(
        `Planilla guardada correctamente. ID: ${id} · ${empleadoYPeriodo}`, ver, otra
    );
}

// Mostrar mensajes al usuario
function mostrarMensajeGuardado(mensaje) {

    const mensajeGuardar =
        document.getElementById("mensaje-guardado");


    if (mensajeGuardar) {

        mensajeGuardar.textContent = mensaje;

    } else {

        console.log(mensaje);

    }

}


// Conectar botón de guardar con la función HU-08
document.addEventListener("DOMContentLoaded", () => {

    const botonGuardar =
        document.getElementById("btn-guardar-planilla");


    if (botonGuardar) {

        botonGuardar.addEventListener(
            "click",
            guardarPlanilla
        );

    }

});
