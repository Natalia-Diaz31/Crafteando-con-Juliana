
//
// HU-02: INICIO DE SESIÓN CON LA API
//

document.addEventListener("DOMContentLoaded", () => {

    const formulario = document.getElementById("form-login");
    const mensaje = document.getElementById("mensaje-login");
    const boton = formulario.querySelector('button[type="submit"]');

    formulario.addEventListener("submit", async (event) => {

        // Evitar que el formulario recargue la página
        event.preventDefault();

        // Obtener los datos ingresados
        const correo = document.getElementById("usuario").value.trim();
        const contrasena = document.getElementById("password").value;

        mensaje.textContent = "";

        // Validar campos obligatorios
        if (!correo || !contrasena) {
            mensaje.textContent = "Debe ingresar correo y contraseña";
            return;
        }

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
            if (!respuesta.ok || !resultado.ok || !resultado.token) {
                mensaje.textContent =
                    resultado.mensaje || "Credenciales incorrectas";
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
