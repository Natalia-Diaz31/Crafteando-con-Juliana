
//
// HU-08: MOSTRAR PLANILLAS GUARDADAS
//

window.mostrarPlanillasGuardadas = function (planillas) {
    const cuerpo = document.getElementById("lista-planillas");
    const mensaje = document.getElementById("consulta-mensaje");

    cuerpo.replaceChildren();

    if (!Array.isArray(planillas)) {
        mensaje.textContent = "No se pudieron cargar las planillas";
        return;
    }

    if (planillas.length === 0) {
        mensaje.textContent = "No hay planillas guardadas";
        return;
    }

    mensaje.textContent = "";

    const formatoUSD = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    });

    planillas.forEach((planilla) => {
        const fila = document.createElement("tr");

        const valores = [
            planilla.id,
            planilla.periodo,
            planilla.nombre_completo,
            formatoUSD.format(planilla.total_pagar)
        ];

        valores.forEach((valor) => {
            const celda = document.createElement("td");
            celda.textContent = valor ?? "—";
            fila.appendChild(celda);
        });

        const celdaAccion = document.createElement("td");
        const enlace = document.createElement("a");

        enlace.className = "btn btn-outline-primary btn-sm";
        enlace.textContent = "Ver detalle";
        enlace.href =
            `detalle-planilla.html?id=${encodeURIComponent(planilla.id)}`;

        celdaAccion.appendChild(enlace);
        fila.appendChild(celdaAccion);
        cuerpo.appendChild(fila);
    });
};

// Este código se ejecuta automáticamente al cargar consultar-planillas.html
document.addEventListener("DOMContentLoaded", async () => {
    const mensaje = document.getElementById("consulta-mensaje");
    const cuerpo = document.getElementById("lista-planillas");

    // 1. Validamos que haya sesión iniciada
    const token = sessionStorage.getItem("token");
    if (!token) {
        window.location.replace("index.html");
        return;
    }

    // 2. Pedimos las planillas a la API de Vercel
    try {
        cuerpo.innerHTML = '<tr><td colspan="4" class="text-center">Cargando planillas...</td></tr>';
        
        const respuesta = await fetch(`${API_URL}/api/planillas`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const resultado = await respuesta.json();

        // 3. Pasamos los datos a la función visual (la que ya tienes arriba)
        if (respuesta.ok && resultado.ok) {
            window.mostrarPlanillasGuardadas(resultado.planillas);
        } else {
            window.mostrarPlanillasGuardadas([]); // Array vacío para que muestre "No hay planillas"
            if (mensaje) mensaje.textContent = resultado.mensaje || "Error al cargar las planillas";
        }

    } catch (error) {
        console.error("Error al consultar:", error);
        window.mostrarPlanillasGuardadas([]);
        if (mensaje) mensaje.textContent = "Error de conexión con el servidor";
    }
});
