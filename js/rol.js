//
// HU-09: ROL DE LA CUENTA AUTENTICADA
//

// Acuerdo del equipo: el login devuelve usuario.rol con este valor exacto
// y el frontend lo guarda en sessionStorage con la clave "rol".
const ROL_ENCARGADO_NOMINA = "Encargado de nómina";
const CLAVE_ROL = "rol";

// Rol guardado al iniciar sesión (null si la cuenta no tiene rol)
function obtenerRol() {
    return sessionStorage.getItem(CLAVE_ROL);
}

// Para el menú y las páginas protegidas: ¿la cuenta puede crear y consultar planillas?
// Solo sirve para mostrar u ocultar opciones; la API vuelve a comprobar el rol.
function esEncargadoNomina() {
    return obtenerRol() === ROL_ENCARGADO_NOMINA;
}

// Páginas que cargan rol.js con data-requiere-rol: sin el rol requerido
// se muestra el aviso y no se ejecuta el resto de la página.
if (document.currentScript?.hasAttribute("data-requiere-rol")) {
    // Se registra en fase de captura sobre window para ejecutarse antes
    // que los scripts de la página y detener sus DOMContentLoaded.
    window.addEventListener("DOMContentLoaded", (evento) => {
        if (esEncargadoNomina()) return;

        evento.stopImmediatePropagation();

        const aviso = document.createElement("div");
        aviso.className = "container py-5";

        const mensaje = document.createElement("p");
        mensaje.className = "alert alert-danger";
        mensaje.setAttribute("role", "alert");
        mensaje.textContent = "No tiene permisos para acceder a esta función";

        const volver = document.createElement("a");
        volver.href = "plantilla.html";
        volver.className = "btn btn-primary";
        volver.textContent = "Volver";

        aviso.append(mensaje, volver);

        const contenido = document.querySelector("main");
        (contenido || document.body).replaceChildren(aviso);

        // El menú no se oculta en el listener de abajo porque la propagación se detuvo.
        document.getElementById("menu-crear-planilla")?.setAttribute("hidden", "");
        document.getElementById("menu-consultar-planillas")?.setAttribute("hidden", "");
    }, true);
}

// Oculta las opciones de crear y consultar planillas
// cuando la cuenta autenticada no tiene el rol requerido.
document.addEventListener("DOMContentLoaded", () => {
    const crearPlanilla = document.getElementById("menu-crear-planilla");
    const consultarPlanillas = document.getElementById("menu-consultar-planillas");

    if (!esEncargadoNomina()) {
        if (crearPlanilla) crearPlanilla.hidden = true;
        if (consultarPlanillas) consultarPlanillas.hidden = true;
    }
});