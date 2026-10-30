//
// HU-08: MOSTRAR PLANILLAS GUARDADAS
//
window.mostrarPlanillasGuardadas = function (planillas, empleadoFiltrado = false) {
    const cuerpo = document.getElementById("lista-planillas");
    const mensaje = document.getElementById("consulta-mensaje");

    cuerpo.replaceChildren();

    if (!Array.isArray(planillas)) {
        mensaje.textContent = "No se pudieron cargar las planillas";
        return;
    }

    if (planillas.length === 0) {
        mensaje.textContent = empleadoFiltrado
        ? "Este empleado no tiene planillas guardadas"
        :"No hay planillas guardadas";
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
            planilla.frecuencia,
            planilla.fecha_guardado
                ? new Date(planilla.fecha_guardado).toLocaleString("es-SV")
                : "—",
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

window.mostrarEmpleadoFiltrado = function (empleado) {
    const contenedor = document.getElementById("filtro-empleado-activo");
    const textoEmpleado = document.getElementById("empleado-filtrado");

    if (!contenedor || !textoEmpleado) {
        return;
    }

    if (!empleado) {
        contenedor.hidden = true;
        textoEmpleado.textContent = "—";
        return;
    }

    textoEmpleado.textContent = empleado;
    contenedor.hidden = false;
};

window.mostrarPaginacionPlanillas = function (paginaActual, totalPaginas) {
    const paginacion = document.getElementById("paginacion-planillas");
    const estado = document.getElementById("estado-paginacion");
    const anterior = document.getElementById("pagina-anterior");
    const siguiente = document.getElementById("pagina-siguiente");

    if (!paginacion || !estado || !anterior || !siguiente) {
        return;
    }

    if (
        !Number.isInteger(paginaActual) ||
        !Number.isInteger(totalPaginas) ||
        totalPaginas <= 1
    ) {
        paginacion.hidden = true;
        return;
    }

    estado.textContent = `Página ${paginaActual} de ${totalPaginas}`;

    anterior.disabled = paginaActual <= 1;
    siguiente.disabled = paginaActual >= totalPaginas;

    paginacion.hidden = false;
};

// Este código se ejecuta automáticamente al cargar consultar-planillas.html

(() => {
    // HU-36: evitar solicitudes idénticas simultáneas.
    const solicitudesActivas = new Map();

    function consultarPlanillas(url, token, signal) {
        // Normalizar la URL para identificar los mismos parámetros.
        const urlNormalizada = new URL(url, window.location.href);
        urlNormalizada.searchParams.sort();

        const clave = JSON.stringify({
            metodo: "GET",
            url: urlNormalizada.href,
            token
        });

        // Si ya existe la misma solicitud, reutilizarla.
        const solicitudExistente = solicitudesActivas.get(clave);

        if (solicitudExistente) {
            return solicitudExistente;
        }

        // Crear una sola solicitud para esta combinación.
        const solicitud = fetch(url, {
            method: "GET",
            signal,
            headers: {
                "Authorization": `Bearer ${token}`
            }
        })
            .then(async (respuesta) => {
                const resultado = await respuesta.json();

                return {
                    respuesta,
                    resultado
                };
            })
            .finally(() => {
                // Permitir una nueva consulta cuando termine.
                solicitudesActivas.delete(clave);
            });

        solicitudesActivas.set(clave, solicitud);

        return solicitud;
    }

    async function inicializarConsulta() {
        const pagina = document.querySelector("main");

        if (
            !pagina ||
            pagina.dataset.consultaInicializada === "true"
        ) {
            return;
        }

        pagina.dataset.consultaInicializada = "true";
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
    const mensaje = document.getElementById("consulta-mensaje");
    const cuerpo = document.getElementById("lista-planillas");

    // 1. Validamos que haya sesión iniciada
    const token = sessionStorage.getItem("token");
    if (!token) {
        window.location.replace("index.html");
        return;
    }

    // 2. Pedimos las planillas a la API de Vercel
        const direccion = new URL(window.location.href);

    const empleadoId =
        direccion.searchParams.get("empleado_id")?.trim() || "";

    const paginaTexto =
        direccion.searchParams.get("pagina") ?? "1";

    const paginaActual = Number(paginaTexto);

    if (
        !/^[1-9]\d*$/.test(paginaTexto) ||
        !Number.isSafeInteger(paginaActual)
    ) {
        mensaje.textContent = "Número de página inválido";
        return;
    }

    function navegar(paginaDestino, quitarFiltro = false) {
        const destino = new URL(window.location.href);

        destino.searchParams.set(
            "pagina",
            String(paginaDestino)
        );

        if (quitarFiltro) {
            destino.searchParams.delete("empleado_id");
        }

        window.location.assign(destino.href);
    }

    const anterior =
        document.getElementById("pagina-anterior");

    const siguiente =
        document.getElementById("pagina-siguiente");

    const quitar =
        document.getElementById("quitar-filtro-empleado");

    anterior.disabled = true;
    siguiente.disabled = true;

    anterior.addEventListener(
        "click",
        () => navegar(paginaActual - 1)
    );

    siguiente.addEventListener(
        "click",
        () => navegar(paginaActual + 1)
    );

    quitar.addEventListener(
        "click",
        () => navegar(1, true)
    );

    const url = new URL(
        `${API_URL}/api/planillas`,
        window.location.href
    );

    url.searchParams.set(
        "pagina",
        String(paginaActual)
    );

    if (empleadoId) {
        url.searchParams.set("empleado_id", empleadoId);
    }

    // HU-36: la consulta se cancela al salir y solo la vigente actualiza la tabla.
    const { crearControlVigenciaConsultas } =
        await import("./control-vigencia-consultas.js");

    const control = crearControlVigenciaConsultas();
    const consulta = control.iniciarConsulta(url.href);

    window.addEventListener(
        "pagehide",
        () => control.cancelarConsultaActual(),
        { once: true }
    );

    try {
        mensaje.textContent = "Cargando planillas...";
        cuerpo.replaceChildren();

        const { respuesta, resultado } =
            await consultarPlanillas(url.href, token, consulta.controlador.signal);

        if (!control.estaVigente(consulta)) return;

        window.verificarAccesoApi(respuesta); // HU-32

        if (!respuesta.ok || !resultado.ok) {
            throw new Error(
                resultado.mensaje ||
                "No se pudo cargar el historial. Intente nuevamente"
            );
        }

        const paginacion = resultado.paginacion;

        if (
            !Array.isArray(resultado.planillas) ||
            !Number.isInteger(paginacion?.pagina) ||
            !Number.isInteger(paginacion?.totalPaginas)
        ) {
            throw new Error(
                "La respuesta del historial está incompleta"
            );
        }

        window.mostrarPlanillasGuardadas(
            resultado.planillas,
            Boolean(empleadoId)
        );

        window.mostrarEmpleadoFiltrado(
            empleadoId
                ? resultado.planillas[0]?.nombre_completo ||
                    empleadoId
                : null
        );

        window.mostrarPaginacionPlanillas(
            paginacion.pagina,
            paginacion.totalPaginas
        );

        direccion.searchParams.set(
            "pagina",
            String(paginacion.pagina)
        );

        window.history.replaceState(
            null,
            "",
            direccion.href
        );
    } catch (error) {
        if (!control.estaVigente(consulta)) return;

        cuerpo.replaceChildren();
        mensaje.textContent = error.message;
    } finally {
        control.finalizarConsulta(consulta);
    }
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            inicializarConsulta,
            { once: true }
        );
    } else {
        void inicializarConsulta();
    }
})();
