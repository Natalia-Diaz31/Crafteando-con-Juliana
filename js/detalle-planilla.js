
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
    mostrar(
        "detalle-contrato",
        planilla.tipo_contrato ?? "No registrado"
    );

    // HU-29: textContent evita interpretar HTML dentro de la observación
    mostrar("detalle-observaciones", planilla.observaciones?.trim() || "Sin observaciones");

    mostrar("detalle-salario", dinero(planilla.salario_base));
    mostrar("detalle-ingresos", dinero(planilla.ingresos_adicionales));
    // HU-16: lo calcula la API a partir de los montos guardados (muestra «—» si no lo envía)
    mostrar("detalle-total-ingresos", dinero(planilla.total_ingresos));
    mostrar("detalle-descuentos", dinero(planilla.descuentos_totales));
    mostrar("detalle-total", dinero(planilla.total_pagar));

    // HU-13: horas guardadas («No registradas» en planillas anteriores a la HU-13)
    mostrar("detalle-horas-ordinarias", window.formatoHoras(planilla.horas_ordinarias));
    mostrar("detalle-horas-extras", window.formatoHoras(planilla.horas_extras));

    // HU-12: descuentos autorizados guardados, sin las deducciones legales.
    // Las planillas anteriores a la HU-12 tienen descuentos totales pero ningún detalle.
    const sinDetalle =
        !(planilla.descuentos?.length) && Number(planilla.descuentos_totales) > 0;

    window.pintarDescuentosAutorizados(
        document.getElementById("detalle-descuentos-autorizados"),
        sinDetalle
            ? null
            : window.separarDescuentosAutorizados(planilla.descuentos, planilla.deducciones_legales)
    );

    // HU-14: deducciones legales tal como se guardaron
    window.pintarDeduccionesLegales(
        document.getElementById("historico-deducciones"),
        planilla.deducciones_legales
    );

    // HU-18, HU-20 y HU-21: cada bloque aparece solo cuando la API envía el dato
    // (formato en docs/contrato-integracion-sprint3.md).
    const complementos = document.getElementById("detalle-complementos");
    complementos.replaceChildren();
    complementos.hidden = true;

    // HU-19: las planillas por días muestran su cálculo en lugar de las horas;
    // las anteriores conservan sus horas tal como se guardaron.
    const porDias = planilla.salario_proporcional != null;
    document.getElementById("detalle-horas-ordinarias").closest(".detalle-bloque").hidden = porDias;

    if (porDias) {
        window.pintarSeccion(complementos, {
            titulo: "Salario por días remunerados",
            columnas: ["Salario base mensual", "Días remunerados", "Salario proporcional"],
            filas: [[
                dinero(planilla.salario_base_mensual),
                planilla.dias_remunerados ?? "—",
                dinero(planilla.salario_proporcional)
            ]]
        });
    }

    if (planilla.novedades?.length) {
        window.pintarSeccion(complementos, {
            titulo: "Novedades",
            columnas: ["Tipo", "Inicio", "Fin", "Condición de pago", "Días"],
            filas: planilla.novedades.map(n =>
                [n.tipo, n.fecha_inicio, n.fecha_fin, n.condicion_pago, n.dias]
            ),
            nota: `Días remunerados: ${planilla.dias_remunerados ?? "—"}`
        });
    }

    // Las planillas anteriores a la HU-20 tienen el total pero no el desglose.
    const ingresos = planilla.ingresos_detalle ?? [];
    if (ingresos.length || Number(planilla.ingresos_adicionales) > 0) {
        window.pintarSeccion(complementos, {
            titulo: "Bonos e incentivos",
            columnas: ["Tipo", "Concepto", "Importe (USD)"],
            filas: ingresos.map(i => [i.tipo, i.concepto, dinero(i.importe)]),
            vacio: "Detalle de ingresos no registrado"
        });
    }

    if (planilla.motivo_ajuste) {
        window.pintarSeccion(complementos, {
            titulo: "Salario ajustado para esta planilla",
            columnas: ["Salario registrado", "Salario utilizado", "Motivo"],
            filas: [[
                dinero(planilla.salario_original),
                // En la planilla por días, salario_base es el proporcional.
                dinero(planilla.salario_base_mensual ?? planilla.salario_base),
                planilla.motivo_ajuste
            ]]
        });
    }

    mensaje.textContent = "";
    contenido.hidden = false;
};


// --- INICIO CÓDIGO DE VÍCTOR: CONEXIÓN CON LA API ---

document.addEventListener("DOMContentLoaded", async () => {
        if (!esEncargadoNomina()) {
        const contenido = document.querySelector("main");

        const aviso = document.createElement("div");
        aviso.className = "container py-5";

        const mensaje = document.createElement("p");
        mensaje.className = "alert alert-danger";
        mensaje.setAttribute("role", "alert");
        mensaje.textContent =
            "No tiene permisos para acceder a esta función";

        const volver = document.createElement("a");
        volver.href = "plantilla.html";
        volver.className = "btn btn-primary";
        volver.textContent = "Volver";

        aviso.append(mensaje, volver);

        if (contenido) {
            contenido.replaceChildren(aviso);
        } else {
            document.body.replaceChildren(aviso);
        }

        return;
    }
    // 1. Validamos que haya sesión iniciada
    const token = sessionStorage.getItem("token");
    if (!token) {
        window.location.replace("index.html");
        return;
    }

    const mensajeError = document.getElementById("detalle-mensaje");

    // HU-25: «Volver al listado» regresa al mismo empleado y página del historial.
    const volver = document.querySelector('main a[href="consultar-planillas.html"]');
    const anterior = document.referrer ? new URL(document.referrer) : null;

    if (
        volver &&
        anterior?.origin === window.location.origin &&
        anterior.pathname.endsWith("/consultar-planillas.html")
    ) {
        volver.href = anterior.href;
    }

    // Duplicar y exportar solo se habilitan con un detalle cargado y autorizado.
    const botonDuplicar = document.getElementById("duplicar-planilla");
    const botonPdf = document.getElementById("descargar-pdf");
    botonDuplicar.disabled = true;
    botonPdf.disabled = true;

    // 2. Extraemos el ID de la URL (ej: detalle-planilla.html?id=3)
    const parametros = new URLSearchParams(window.location.search);
    const idPlanilla = parametros.get("id");

    if (!idPlanilla) {
        if (mensajeError) mensajeError.textContent = "ID de planilla no válido.";
        window.mostrarDetallePlanilla(null); // Oculta la vista
        return;
    }

    let planilla;

    try {
        // 3. Consultamos el endpoint de Sara para traer los detalles
        const respuesta = await fetch(`${API_URL}/api/planillas/${idPlanilla}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        window.verificarAccesoApi(respuesta); // HU-32

        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.ok) {
            throw new Error(resultado.mensaje || "Error al obtener el detalle de la planilla.");
        }

        // 4. Se lo pasamos a la función de tu compañera
        planilla = resultado.planilla;
        window.mostrarDetallePlanilla(planilla);
    } catch (error) {
        console.error("Error al consultar el detalle:", error);
        window.mostrarDetallePlanilla(null);
        if (mensajeError) {
            mensajeError.textContent = error instanceof TypeError
                ? "Error de conexión con el servidor."
                : error.message;
        }
        return;
    }

    botonDuplicar.disabled = false;
    botonPdf.disabled = false;

    // HU-27: la API comprueba si se puede duplicar; el formulario recupera los datos.
    botonDuplicar.addEventListener("click", async () => {
        const aviso = document.getElementById("duplicacion-detalle-mensaje");

        botonDuplicar.disabled = true;
        aviso.hidden = true;

        try {
            const respuesta = await fetch(
                `${API_URL}/api/planillas/${encodeURIComponent(idPlanilla)}/duplicar`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            window.verificarAccesoApi(respuesta);

            const resultado = await respuesta.json();

            if (!respuesta.ok || !resultado.ok) {
                throw new Error(resultado.mensaje || "No se pudo preparar la duplicación de la planilla");
            }

            sessionStorage.setItem("planillaDuplicada", JSON.stringify({
                origen: idPlanilla,
                datos: resultado.duplicacion
            }));

            window.location.href = "planilla.html";
        } catch (error) {
            aviso.textContent = error.message;
            aviso.hidden = false;
            botonDuplicar.disabled = false;
        }
    });

    // HU-30: el PDF se genera con el detalle ya cargado, sin otra consulta.
    botonPdf.addEventListener("click", async () => {
        const aviso = document.getElementById("pdf-mensaje");

        botonPdf.disabled = true;
        aviso.textContent = "Generando PDF...";
        aviso.hidden = false;

        try {
            const { generarPDFPlanilla } = await import("./exportacion-pdf.js");

            const documento = generarPDFPlanilla(
                window.prepararDatosGeneralesExportacion(planilla),
                window.prepararMovimientosPDF(planilla, window.separarDescuentosAutorizados),
                { jsPDF: window.jspdf.jsPDF, autoTable: window.autoTable }
            );

            documento.save(nombreExportacion(planilla, "pdf"));
            aviso.hidden = true;
        } catch (error) {
            console.error("Error al generar el PDF:", error);
            aviso.textContent = "No se pudo generar el PDF. Intente nuevamente";
        } finally {
            botonPdf.disabled = false;
        }
    });
});

// HU-30 y HU-31: planilla_CODIGO_AAAA-MM_ID.extensión
function nombreExportacion(planilla, extension) {
    const [mes, anio] = String(planilla.periodo).split(" ");
    const numeroMes = String(window.ReglasNomina.numeroMes(mes)).padStart(2, "0");

    return `planilla_${planilla.codigo}_${anio}-${numeroMes}_${planilla.id}.${extension}`;
}

// --- FIN CÓDIGO DE VÍCTOR ---