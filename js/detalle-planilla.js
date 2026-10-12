
//
// HU-08: MOSTRAR DETALLE DE UNA PLANILLA
//

window.mostrarDetallePlanilla = function (planilla) {
    const mensaje = document.getElementById("detalle-mensaje");
    const contenido = document.getElementById("contenido-detalle");

    if (!planilla || typeof planilla !== "object") {
        contenido.hidden = true;
        mensaje.textContent = "No se pudo cargar el detalle de la planilla";
        return;
    }

    const formatoUSD = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    });

    function mostrar(id, valor) {
        document.getElementById(id).textContent = valor ?? "—";
    }

    function dinero(valor) {
        if (valor === null || valor === undefined || valor === "") {
            return "—";
        }

        const numero = Number(valor);

        return Number.isFinite(numero)
            ? formatoUSD.format(numero)
            : "—";
    }

    const fecha = planilla.fecha_guardado
        ? new Date(planilla.fecha_guardado)
        : null;

    const fechaTexto = fecha && !Number.isNaN(fecha.getTime())
        ? fecha.toLocaleString("es-SV")
        : "—";

    mostrar("detalle-id", planilla.id);
    mostrar("detalle-plantilla", planilla.plantilla);
    mostrar("detalle-periodo", planilla.periodo);
    mostrar("detalle-fecha", fechaTexto);

    mostrar("detalle-codigo", planilla.codigo);
    mostrar("detalle-nombre", planilla.nombre_completo);
    mostrar("detalle-dui", planilla.dui);
    mostrar("detalle-cargo", planilla.cargo);

    mostrar("detalle-salario", dinero(planilla.salario_base));
    mostrar("detalle-ingresos", dinero(planilla.ingresos_adicionales));
    mostrar("detalle-descuentos", dinero(planilla.descuentos_totales));
    mostrar("detalle-total", dinero(planilla.total_pagar));

    mensaje.textContent = "";
    contenido.hidden = false;
};


// --- INICIO CÓDIGO DE VÍCTOR: CONEXIÓN CON LA API ---

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Validamos que haya sesión iniciada
    const token = sessionStorage.getItem("token");
    if (!token) {
        window.location.replace("index.html");
        return;
    }

    const mensajeError = document.getElementById("detalle-mensaje"); 

    // 2. Extraemos el ID de la URL (ej: detalle-planilla.html?id=3)
    const parametros = new URLSearchParams(window.location.search);
    const idPlanilla = parametros.get("id");

    if (!idPlanilla) {
        if (mensajeError) mensajeError.textContent = "ID de planilla no válido.";
        window.mostrarDetallePlanilla(null); // Oculta la vista
        return;
    }

    try {
        // 3. Consultamos el endpoint de Sara para traer los detalles
        const respuesta = await fetch(`${API_URL}/api/planillas/${idPlanilla}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const resultado = await respuesta.json();

        // 4. Se lo pasamos a la función de tu compañera
        if (respuesta.ok && resultado.ok) {
            window.mostrarDetallePlanilla(resultado.planilla);
        } else {
            window.mostrarDetallePlanilla(null);
            if (mensajeError) mensajeError.textContent = resultado.mensaje || "Error al obtener el detalle de la planilla.";
        }

    } catch (error) {
        console.error("Error al consultar el detalle:", error);
        window.mostrarDetallePlanilla(null);
        if (mensajeError) mensajeError.textContent = "Error de conexión con el servidor.";
    }
});

// --- FIN CÓDIGO DE VÍCTOR ---