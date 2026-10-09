// Victor llama esta función con los empleados recibidos de la API.
window.mostrarResultadosEmpleados = function (empleados) {
    const cuerpo = document.getElementById("resultados-empleados");
    cuerpo.replaceChildren();

    const mensaje = document.getElementById("busqueda-mensaje");

    if (empleados.length === 0) {
        mensaje.textContent = "No se encontraron empleados";
        return;
    }

    mensaje.textContent = "";

    empleados.forEach((empleado) => {
        const fila = document.createElement("tr");

        [
            empleado.codigo,
            empleado.nombre_completo,
            empleado.dui
        ].forEach((valor) => {
            const celda = document.createElement("td");
            celda.textContent = valor;
            fila.appendChild(celda);
        });

        const celdaAccion = document.createElement("td");
        const boton = document.createElement("button");

        boton.type = "button";
        boton.className = "btn btn-outline-primary btn-sm";
        boton.textContent = "Seleccionar";

        boton.addEventListener("click", () => {
            // Natalia implementa la selección y actualización del empleado.
            document.dispatchEvent(new CustomEvent("empleado:seleccionar", {
                detail: empleado
            }));
        });

        celdaAccion.appendChild(boton);
        fila.appendChild(celdaAccion);
        cuerpo.appendChild(fila);
    });
};