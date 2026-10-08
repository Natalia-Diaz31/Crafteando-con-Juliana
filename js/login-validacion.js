document.addEventListener("DOMContentLoaded", () => {
    const formulario = document.getElementById("form-login");
    const correo = document.getElementById("usuario");
    const password = document.getElementById("password");

    function mostrarError(campo, mensaje) {
        const error = document.getElementById(`${campo.id}-error`);

        error.textContent = mensaje;
        campo.classList.toggle("is-invalid", mensaje !== "");
        campo.setAttribute("aria-invalid", String(mensaje !== ""));
        campo.setAttribute("aria-describedby", error.id);
    }

    window.validarCamposLogin = function () {
        const errorCorreo = correo.value.trim() === ""
            ? "Este campo es obligatorio"
            : "";

        const errorPassword = password.value === ""
            ? "Este campo es obligatorio"
            : "";

        mostrarError(correo, errorCorreo);
        mostrarError(password, errorPassword);

        return errorCorreo === "" && errorPassword === "";
    };

    formulario.addEventListener("submit", (evento) => {
        // Evita que el navegador recargue la página.
        evento.preventDefault();

        if (!window.validarCamposLogin()) {
            formulario.querySelector(".is-invalid")?.focus();
            return;
        }

        // La conexión con la API corresponde a Nathaly.
        // Este evento permite conectar su función sin duplicar el envío.
        formulario.dispatchEvent(new CustomEvent("login:validado", {
            detail: {
                correo: correo.value.trim(),
                password: password.value
            }
        }));
    });

    correo.addEventListener("input", () => mostrarError(correo, ""));
    password.addEventListener("input", () => mostrarError(password, ""));
});