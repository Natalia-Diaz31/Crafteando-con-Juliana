document.addEventListener("DOMContentLoaded", () => {
    const pasos = document.querySelectorAll(".steps-bar .step");

    const salario = document.getElementById("salario");
    const ingresos = document.getElementById("ingresos");

    const conceptoDescuento = document.getElementById("descuento-concepto");
    const importeDescuento = document.getElementById("descuento-importe");
    const descuentos = document.getElementById("descuentos");

    const revisarPlanilla = document.getElementById("revisar-planilla");
    const editarDatos = document.getElementById("editar-datos");

    function activarPaso(numero) {
        pasos.forEach((paso, indice) => {
            paso.classList.toggle("active", indice === numero - 1);
        });
    }

    // Paso 1: Datos generales
    activarPaso(1);

    // Paso 2: Montos
    [salario, ingresos].forEach((campo) => {
        campo?.addEventListener("focus", () => activarPaso(2));
    });

    // Paso 3: Descuentos
    [conceptoDescuento, importeDescuento, descuentos].forEach((campo) => {
        campo?.addEventListener("focus", () => activarPaso(3));
    });

    // Paso 4: Revisión
    revisarPlanilla?.addEventListener("click", () => {
        setTimeout(() => {
            const resumen = document.getElementById("resumen-planilla");

            if (resumen && !resumen.hidden) {
                activarPaso(4);
            }
        }, 0);
    });

    // Si regresa a editar, vuelve al paso 1
    editarDatos?.addEventListener("click", () => {
        activarPaso(1);
    });
});