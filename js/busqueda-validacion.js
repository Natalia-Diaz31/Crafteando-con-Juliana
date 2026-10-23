document.addEventListener("DOMContentLoaded", () => {
    const formulario =
        document.getElementById("form-busqueda-empleado");

    const campo =
        document.getElementById("buscar-empleado");

    const mensaje =
        document.getElementById("busqueda-mensaje");

    let temporizador = null;
    let controlador = null;
    let versionBusqueda = 0;

    function cancelarBusqueda() {
        versionBusqueda++;

        clearTimeout(temporizador);
        temporizador = null;

        controlador?.abort();
        controlador = null;
    }

    function limpiarSeleccion() {
        document.dispatchEvent(
            new CustomEvent("empleado:limpiar")
        );
    }

    function obtenerFiltros() {
        return {
            departamento:
                document.getElementById("filtro-departamento")
                    ?.value ?? "",

            sucursal:
                document.getElementById("filtro-sucursal")
                    ?.value ?? ""
        };
    }

    async function consultar(termino, filtros, version) {
        const solicitud = new AbortController();
        controlador = solicitud;

        mensaje.textContent = "Consultando base de datos...";

        const parametros = new URLSearchParams({
            q: termino
        });

        if (filtros.departamento) {
            parametros.set(
                "departamento_id",
                filtros.departamento
            );
        }

        if (filtros.sucursal) {
            parametros.set(
                "sucursal_id",
                filtros.sucursal
            );
        }

        try {
            const respuesta = await fetch(
                `${API_URL}/api/empleados/buscar?${parametros}`,
                {
                    signal: solicitud.signal,
                    headers: {
                        Authorization:
                            `Bearer ${sessionStorage.getItem("token")}`
                    }
                }
            );

            const resultado = await respuesta.json();

            if (version !== versionBusqueda) return;

            if (
                !respuesta.ok ||
                !resultado.ok ||
                !Array.isArray(resultado.empleados)
            ) {
                throw new Error("La consulta falló");
            }

            const empleados = [...resultado.empleados]
                .sort((a, b) =>
                    a.nombre_completo.localeCompare(
                        b.nombre_completo,
                        "es"
                    ) ||
                    a.codigo.localeCompare(b.codigo, "es")
                )
                .slice(0, 10);

            window.mostrarResultadosEmpleados(empleados);

            mensaje.textContent = empleados.length
                ? ""
                : "No se encontraron empleados";
        } catch (error) {
            if (
                version !== versionBusqueda ||
                error.name === "AbortError"
            ) {
                return;
            }

            window.mostrarResultadosEmpleados([]);

            mensaje.textContent =
                "No se pudo consultar empleados. Intente nuevamente";
        }
    }

    function buscar(inmediata = false) {
        cancelarBusqueda();
        limpiarSeleccion();

        window.mostrarResultadosEmpleados([]);

        const termino = campo.value.trim();

        if (!termino) {
            mensaje.textContent = inmediata
                ? "Ingrese un nombre, DUI o código"
                : "";

            return;
        }

        if (!inmediata && termino.length < 2) {
            mensaje.textContent =
                "Escriba al menos dos caracteres";

            return;
        }

        const version = versionBusqueda;
        const filtros = obtenerFiltros();

        if (inmediata) {
            consultar(termino, filtros, version);
        } else {
            temporizador = setTimeout(() => {
                consultar(termino, filtros, version);
            }, 300);
        }
    }

    campo.addEventListener("input", () => buscar());

    formulario.addEventListener("submit", evento => {
        evento.preventDefault();
        buscar(true);
    });

    [
        "filtro-departamento",
        "filtro-sucursal"
    ].forEach(id => {
        document.getElementById(id)?.addEventListener(
            "change",
            () => buscar()
        );
    });

    document.getElementById("limpiar-filtros")
        ?.addEventListener("click", () => {
            [
                "filtro-departamento",
                "filtro-sucursal"
            ].forEach(id => {
                const filtro = document.getElementById(id);

                if (filtro) filtro.value = "";
            });

            buscar();
        });

    document.addEventListener(
        "empleado:seleccionar",
        cancelarBusqueda
    );
});