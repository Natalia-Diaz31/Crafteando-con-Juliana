
//
// HU-02: INICIO DE SESIÓN CON LA API
//

document.addEventListener("DOMContentLoaded", () => {

    const formulario = document.getElementById("form-login");
    const mensaje = document.getElementById("mensaje-login");
    const boton = formulario.querySelector('button[type="submit"]');

    // Recibir los datos después de que pasan las validaciones del formulario
    formulario.addEventListener("login:validado", async (event) => {

        const correo = event.detail.correo;
        const contrasena = event.detail.password;

        mensaje.textContent = "";

        boton.disabled = true;
        boton.textContent = "Verificando...";

        try {

            // Enviar credenciales a nuestra API publicada
            const respuesta = await fetch(
                "https://sistema-planillas-api.vercel.app/api/auth/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        correo: correo,
                        contrasena: contrasena
                    })
                }
            );

            const resultado = await respuesta.json();

            // Comprobar si el inicio de sesión fue exitoso
            if (!respuesta.ok || (!resultado.ok && !resultado.success) || !resultado.token) {

                mensaje.textContent =
                    respuesta.status === 400 || respuesta.status === 401
                        ? "Correo o contraseña inválidos"
                        : resultado.mensaje || resultado.message || "Error al iniciar sesión";

                return;
            }

            // Guardar la sesión temporalmente
            sessionStorage.setItem("token", resultado.token);

            // Redirigir a la página de plantillas
            window.location.href = "plantilla.html";

        } catch (error) {
            console.error("Error en login:", error);

            mensaje.textContent =
                "No se pudo conectar con el servidor";
        } finally {
            boton.disabled = false;
            boton.textContent = "Ingresar al Sistema";
        }

    });
});
