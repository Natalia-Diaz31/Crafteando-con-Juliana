// ARCHIVO: Validación del formulario de inicio de sesión
// Buscar: login, validación

// Qué hace: Prepara la validación cuando carga la página
// Buscar: inicio login
document.addEventListener("DOMContentLoaded", () => {
    const formulario = document.getElementById("form-login");
    const correo = document.getElementById("usuario");
    const password = document.getElementById("password");

    // Qué hace: Muestra u oculta el error de un campo
    // Buscar: mostrarError
    function mostrarError(campo, mensaje) {
        const error = document.getElementById(`${campo.id}-error`);

        error.textContent = mensaje;
        campo.classList.toggle("is-invalid", mensaje !== "");
        campo.setAttribute("aria-invalid", String(mensaje !== ""));
        campo.setAttribute("aria-describedby", error.id);
    }

    // Qué hace: Revisa que correo y contraseña no estén vacíos
    // Buscar: validarCamposLogin, obligatorio
    function validarCamposLogin() {
        const errorCorreo = correo.value.trim() === ""
            ? "Este campo es obligatorio"
            : "";

        const errorPassword = password.value === ""
            ? "Este campo es obligatorio"
            : "";

        mostrarError(correo, errorCorreo);
        mostrarError(password, errorPassword);

        return errorCorreo === "" && errorPassword === "";
    }

    // Qué hace: Valida y avisa a login.js para iniciar sesión
    // Buscar: submit, login:validado
    formulario.addEventListener("submit", (evento) => {
        // Evita que el navegador recargue la página.
        evento.preventDefault();

        if (!validarCamposLogin()) {
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

    // Qué hace: Borra el error del correo al escribir
    // Buscar: input correo
    correo.addEventListener("input", () => mostrarError(correo, ""));
    // Qué hace: Borra el error de la contraseña al escribir
    // Buscar: input contraseña
    password.addEventListener("input", () => mostrarError(password, ""));
});