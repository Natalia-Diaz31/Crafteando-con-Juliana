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

document.getElementById("form-busqueda-empleado").addEventListener("busqueda:validada", async (evento) => {
    // 1. Recibimos el texto que el usuario quiere buscar
    const termino = evento.detail.termino;
    const mensaje = document.getElementById("busqueda-mensaje");
    
    mensaje.textContent = "Consultando base de datos...";

    try {
        // 2. Definimos la URL de la API (ajustándose si estás en local o en Vercel)
        //const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        //const API_URL = isLocal ? 'http://localhost:3000' : 'https://sistema-planillas-api.vercel.app';
        //Al final, solo lo ejecutamos con la API subida en Vercel, ya que la API local no está disponible para todos los usuarios.       
        
        // Obtenemos el token de la sesión para tener permiso de buscar
        const token = sessionStorage.getItem("token");
        
        // 3. Hacemos la consulta a la API de Sara
        const respuesta = await fetch(`${API_URL}/api/empleados/buscar?q=${encodeURIComponent(termino)}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        
        const resultado = await respuesta.json();
        
        if (respuesta.ok && resultado.ok) {
            // 4. Si todo salió bien, le pasamos los datos a la función visual que hizo tu compañera
            window.mostrarResultadosEmpleados(resultado.empleados);
        } else {
            // Si la API no encuentra nada o da error
            window.mostrarResultadosEmpleados([]);
            mensaje.textContent = resultado.mensaje || "Error al buscar empleados";
        }

    } catch (error) {
        console.error("Error en la búsqueda:", error);
        window.mostrarResultadosEmpleados([]);
        mensaje.textContent = "Error de conexión con el servidor";
    }
});
