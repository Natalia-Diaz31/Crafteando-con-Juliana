
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
