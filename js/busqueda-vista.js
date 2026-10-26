// HU-24 - Interfaz de búsqueda, filtros y selección de empleados.

document.addEventListener("DOMContentLoaded", () => {
    const campoBusqueda =
        document.getElementById("buscar-empleado");

    const cuerpoResultados =
        document.getElementById("resultados-empleados");

    const mensaje =
        document.getElementById("busqueda-mensaje");

    const filtroDepartamento =
        document.getElementById("filtro-departamento");

    const filtroSucursal =
        document.getElementById("filtro-sucursal");

    let empleadosMostrados = [];
    let indiceActivo = -1;

    function crearCelda(valor) {
        const celda = document.createElement("td");
        celda.textContent = valor || "—";
        return celda;
    }

    function obtenerNombreRelacion(relacion) {
        if (!relacion) {
            return "—";
        }

        if (typeof relacion === "string") {
            return relacion;
        }

        return relacion.nombre || "—";
    }

    function actualizarSeleccionVisual() {
        const filas =
            cuerpoResultados.querySelectorAll("tr[data-indice]");

        filas.forEach((fila, indice) => {
            const activa = indice === indiceActivo;

            fila.classList.toggle("table-active", activa);
            fila.setAttribute(
                "aria-selected",
                String(activa)
            );
        });
    }

    function seleccionarEmpleado(indice) {
        const empleado = empleadosMostrados[indice];

        if (!empleado) {
            return;
        }

        document.dispatchEvent(
            new CustomEvent("empleado:seleccionar", {
                detail: empleado
            })
        );
    }

    function cerrarSugerencias() {
        cuerpoResultados.replaceChildren();
        empleadosMostrados = [];
        indiceActivo = -1;
    }

    // Victor llama esta función con los empleados recibidos de la API.
    window.mostrarResultadosEmpleados = function (empleados) {
        cuerpoResultados.replaceChildren();

        empleadosMostrados =
            Array.isArray(empleados) ? empleados : [];

        indiceActivo = -1;

        if (empleadosMostrados.length === 0) {
            return;
        }

        empleadosMostrados.forEach((empleado, indice) => {
            const fila = document.createElement("tr");

            fila.dataset.indice = indice;
            fila.setAttribute("aria-selected", "false");

            fila.append(
                crearCelda(empleado.nombre_completo),
                crearCelda(empleado.codigo),
                crearCelda(
                    obtenerNombreRelacion(
                        empleado.departamentos
                        ?? empleado.departamento
                    )
                ),
                crearCelda(
                    obtenerNombreRelacion(
                        empleado.sucursales
                        ?? empleado.sucursal
                    )
                )
            );

            const celdaAccion =
                document.createElement("td");

            const boton =
                document.createElement("button");

            boton.type = "button";
            boton.className =
                "btn btn-outline-primary btn-sm";
            boton.textContent = "Seleccionar";

            boton.addEventListener("click", () => {
                seleccionarEmpleado(indice);
            });

            fila.addEventListener("click", evento => {
                if (evento.target.closest("button")) {
                    return;
                }

                seleccionarEmpleado(indice);
            });

            celdaAccion.append(boton);
            fila.append(celdaAccion);
            cuerpoResultados.append(fila);
        });
    };

    campoBusqueda.addEventListener("keydown", evento => {
        if (evento.key === "Escape") {
            cerrarSugerencias();
            mensaje.textContent = "";
            return;
        }

        if (empleadosMostrados.length === 0) {
            return;
        }

        if (evento.key === "ArrowDown") {
            evento.preventDefault();

            indiceActivo =
                indiceActivo < empleadosMostrados.length - 1
                    ? indiceActivo + 1
                    : 0;

            actualizarSeleccionVisual();
            return;
        }

        if (evento.key === "ArrowUp") {
            evento.preventDefault();

            indiceActivo =
                indiceActivo > 0
                    ? indiceActivo - 1
                    : empleadosMostrados.length - 1;

            actualizarSeleccionVisual();
            return;
        }

        if (
            evento.key === "Enter" &&
            indiceActivo >= 0
        ) {
            evento.preventDefault();
            seleccionarEmpleado(indiceActivo);
        }
    });

    async function cargarCatalogo(ruta, propiedad, select) {
        try {
            const respuesta = await fetch(
                `${API_URL}/api/empleados/${ruta}`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${sessionStorage.getItem("token")}`
                    }
                }
            );

            const resultado = await respuesta.json();

            if (
                !respuesta.ok ||
                !resultado.ok ||
                !Array.isArray(resultado[propiedad])
            ) {
                throw new Error(
                    "No se pudo cargar el catálogo"
                );
            }

            resultado[propiedad].forEach(item => {
                const opcion =
                    document.createElement("option");

                opcion.value = item.id;
                opcion.textContent = item.nombre;

                select.append(opcion);
            });
        } catch (error) {
            console.error(
                `Error al cargar ${propiedad}:`,
                error
            );
        }
    }

    cargarCatalogo(
        "departamentos",
        "departamentos",
        filtroDepartamento
    );

    cargarCatalogo(
        "sucursales",
        "sucursales",
        filtroSucursal
    );

    document.addEventListener(
        "empleado:seleccionar",
        cerrarSugerencias
    );
});
