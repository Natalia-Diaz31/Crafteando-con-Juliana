//
// HU-08: Integración del guardado de planilla con API
//




async function guardarPlanilla() {

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


    // Construir objeto que espera la API
    const datosPlanilla = {

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

        descuentos_totales:
            document.getElementById("descuentos").value
    };


    try {

        const token =
            sessionStorage.getItem("token");


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


        const resultado =
            await respuesta.json();


        if (!respuesta.ok) {

            throw new Error(
                resultado.mensaje ||
                "No se pudo guardar la planilla"
            );

        }


        mostrarMensajeGuardado(
            `Planilla guardada correctamente. ID: ${resultado.id}`
        );


    } catch(error) {

        mostrarMensajeGuardado(
            error.message
        );

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
