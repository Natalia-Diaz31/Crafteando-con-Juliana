// HU-02: sin sesión, redirigir al inicio de sesión
(function () {
    if (!sessionStorage.getItem("token")) {
        window.location.replace("index.html");
    }
})();

