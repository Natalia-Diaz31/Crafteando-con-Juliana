// ARCHIVO: Protección de páginas con sesión y manejo de errores de la API
// Buscar: sesión, token, HU-02, HU-32

// Qué hace: Manda al inicio de sesión si no hay token
// Buscar: sin sesión, index.html
(() => {
    const token = sessionStorage.getItem("token");

    if (!token) {
        window.location.replace("index.html");
    }
})();

// HU-32: distinguir sesión expirada, acceso denegado y fallo del servidor
// antes de leer la respuesta. Lanza el mensaje para que cada pantalla lo muestre.
// Qué hace: Revisa 401, 403 y 5xx antes de leer una respuesta
// Buscar: verificarAccesoApi, sesión expirada
window.verificarAccesoApi = function (respuesta) {
    if (respuesta.status === 401) {
        sessionStorage.removeItem("token");
        setTimeout(() => window.location.replace("index.html"), 2500);
        throw new Error("La sesión expiró. Inicie sesión nuevamente");
    }

    if (respuesta.status === 403) {
        throw new Error("No tiene permisos para acceder a esta función");
    }

    if (respuesta.status >= 500) {
        throw new Error("El servidor no pudo completar la solicitud. Intente nuevamente");
    }
};

// Qué hace: Conecta el botón «Cerrar sesión»
// Buscar: cerrar-sesion, logout
document.addEventListener("DOMContentLoaded", () => {
    const botonCerrarSesion = document.getElementById("cerrar-sesion");

    botonCerrarSesion?.addEventListener("click", () => {
        sessionStorage.clear();
        window.location.replace("index.html");
    });
});