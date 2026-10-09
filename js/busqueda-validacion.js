document.addEventListener("DOMContentLoaded", () => {
    const formulario = document.getElementById("form-busqueda-empleado");
    const campo = document.getElementById("buscar-empleado");
    const mensaje = document.getElementById("busqueda-mensaje");

    formulario.addEventListener("submit", (event) => {
        event.preventDefault();

        const termino = campo.value.trim();

        if (!termino) {
            mensaje.textContent = "Ingrese un nombre, DUI o código";
            return;
        }

        mensaje.textContent = "";

        // Victor conectará este evento con la API.
        formulario.dispatchEvent(
            new CustomEvent("busqueda:validada", {
                detail: { termino }
            })
        );
    });
});