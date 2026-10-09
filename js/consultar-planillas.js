
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
