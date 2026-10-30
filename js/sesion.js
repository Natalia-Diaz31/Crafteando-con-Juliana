(() => {
    const token = sessionStorage.getItem("token");

    if (!token) {
        window.location.replace("index.html");
    }
})();

// HU-32: distinguir sesión expirada, acceso denegado y fallo del servidor
// antes de leer la respuesta. Lanza el mensaje para que cada pantalla lo muestre.
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
