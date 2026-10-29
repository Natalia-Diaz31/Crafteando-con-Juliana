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

    function consultarPlanillas(url, token) {
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
    try {
        cuerpo.innerHTML = '<tr><td colspan="7" class="text-center">Cargando planillas...</td></tr>';
          
        const { respuesta, resultado } = await consultarPlanillas(
            `${API_URL}/api/planillas`,
            token
        );

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
