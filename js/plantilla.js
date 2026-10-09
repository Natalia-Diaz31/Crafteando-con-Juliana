document.addEventListener("DOMContentLoaded", async () => {
    const radio = document.getElementById("plantilla-basica");
    const boton = document.getElementById("usar-plantilla");
    const mensaje = document.getElementById("plantilla-error");

    const titulo = document.querySelector(".plantilla-header h1");
    const descripcion = document.querySelector(".plantilla-header p");
    const encabezados = document.querySelectorAll(".planilla thead th");

    const API_URL = "https://sistema-planillas-api.vercel.app";
    const token = sessionStorage.getItem("token");

    let plantilla = null;

    // Consultar la plantilla registrada en la API
    try {
        if (!token) {
            throw new Error("Debe iniciar sesión");
        }

        const respuesta = await fetch(`${API_URL}/api/plantillas`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.ok || !resultado.plantilla) {
            throw new Error(
                resultado.mensaje || "No se pudo cargar la plantilla"
            );
        }

        plantilla = resultado.plantilla;

        // Mostrar la información recibida de la API
        titulo.textContent = plantilla.nombre;
        descripcion.textContent = plantilla.descripcion;
        radio.value = String(plantilla.id);

        const campos = plantilla.campos || [];

        if (campos.length !== encabezados.length) {
            throw new Error("La plantilla no tiene los nueve campos esperados");
        }

        campos.forEach((campo, indice) => {
            encabezados[indice].textContent = campo.nombre;
        });

    } catch (error) {
        console.error("Error al consultar plantilla:", error);
        mensaje.textContent = error.message;
        boton.disabled = true;
        return;
    }

    // Limpiar el error cuando se selecciona la plantilla
    radio.addEventListener("change", () => {
        mensaje.textContent = "";
    });

    // Validar la selección al presionar el botón
    boton.addEventListener("click", () => {
        if (!radio.checked) {
            mensaje.textContent = "Seleccione una plantilla para continuar";
            return;
        }

        mensaje.textContent = "";

        // Conservar los datos para el flujo de creación
        sessionStorage.setItem(
            "plantillaSeleccionada",
            JSON.stringify({
                id: plantilla.id,
                nombre: plantilla.nombre
            })
        );

        // Evento para que Victor conecte la creación de la planilla
        document.dispatchEvent(
            new CustomEvent("plantilla:seleccionada", {
                detail: {
                    id: plantilla.id,
                    nombre: plantilla.nombre
                }
            })
        );
    });
});
