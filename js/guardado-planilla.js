async function guardarPlanilla() {

    const datosPlanilla = {
        empleado_id: empleadoSeleccionado.id,
        plantilla_id: plantillaSeleccionada.id,
        mes: document.getElementById("mes").value,
        anio: document.getElementById("anio").value,
        salario_base: document.getElementById("salario").value,
        ingresos_adicionales: document.getElementById("ingresos").value,
        descuentos_totales: document.getElementById("descuentos").value
    };

    try {

        const token = sessionStorage.getItem("token");

        const respuesta = await fetch(
            "URL_DEL_ENDPOINT_DE_GUARDADO",
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

        if (!respuesta.ok) {
            throw new Error(resultado.mensaje);
        }

        mostrarMensajeGuardado(
            "Planilla guardada correctamente"
        );

    } catch(error) {

        mostrarMensajeGuardado(
            "Error al guardar la planilla: " + error.message
        );

    }
}


// Función para mostrar mensajes al usuario
function mostrarMensajeGuardado(mensaje){

    const mensajeGuardar =
        document.getElementById("mensaje-guardado");

    if(mensajeGuardar){
        mensajeGuardar.textContent = mensaje;
    }

}
    }
}
