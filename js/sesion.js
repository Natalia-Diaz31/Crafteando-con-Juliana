// HU-09: proteger las páginas de creación y consulta.
(function () {
    const token = sessionStorage.getItem("token");

    if (!token) {
        document.documentElement.style.visibility = "hidden";
        window.location.replace("index.html");
        return;
    }

    // Evitar mostrar el contenido antes de comprobar el rol.
    document.documentElement.style.visibility = "hidden";

    document.addEventListener("DOMContentLoaded", (evento) => {
        const permitido =
            typeof esEncargadoNomina === "function" &&
            esEncargadoNomina();

        if (permitido) {
            document.documentElement.style.visibility = "";
            return;
        }

        // Impedir que los demás manejadores de carga inicien
        // formularios o consultas de esta página.
        evento.stopImmediatePropagation();

        const contenedor = document.createElement("main");
        contenedor.className = "container py-5";

        const titulo = document.createElement("h1");
        titulo.textContent = "Acceso denegado";

        const mensaje = document.createElement("p");
        mensaje.textContent =
            "No tiene permisos para acceder a esta función";

        const enlace = document.createElement("a");
        enlace.href = "index.html";
        enlace.textContent = "Volver al inicio de sesión";

        enlace.addEventListener("click", () => {
            sessionStorage.removeItem("token");
            sessionStorage.removeItem("rol");
            sessionStorage.removeItem("empleadoSeleccionado");
            sessionStorage.removeItem("plantillaSeleccionada");
        });

        contenedor.append(titulo, mensaje, enlace);
        document.body.replaceChildren(contenedor);

        document.documentElement.style.visibility = "";
    }, { capture: true });
})();