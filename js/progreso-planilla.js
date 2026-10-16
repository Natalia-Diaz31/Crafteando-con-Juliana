document.addEventListener("DOMContentLoaded", () => {
    const pasos = document.querySelectorAll(".steps-bar .step");

    const seccionPeriodo = document.getElementById("mes")?.closest(".form-section");
    const seccionMontos = document.getElementById("salario")?.closest(".form-section");
    const seccionDescuentos = document.querySelector(".descuentos-card");
    const seccionRevision = document.getElementById("resumen-planilla");

    let pasoActual = 1;

    function activarPaso(numero) {
        pasoActual = numero;

        pasos.forEach((paso, indice) => {
            paso.classList.toggle("active", indice === numero - 1);
            paso.classList.toggle("completed", indice < numero - 1);
        });
    }

    function elementoVisible(elemento) {
        if (!elemento || elemento.hidden) return false;

        const rect = elemento.getBoundingClientRect();
        const referencia = 180;

        return rect.top <= referencia && rect.bottom > referencia;
    }

    function actualizarPorScroll() {
        // Si la revisión está abierta y llegamos a ella
        if (seccionRevision && !seccionRevision.hidden &&
            elementoVisible(seccionRevision)) {
            activarPaso(4);
            return;
        }

        // Descuentos
        if (elementoVisible(seccionDescuentos)) {
            activarPaso(3);
            return;
        }

        // Montos
        if (elementoVisible(seccionMontos)) {
            activarPaso(2);
            return;
        }

        // Datos generales
        if (elementoVisible(seccionPeriodo)) {
            activarPaso(1);
        }
    }

    // Estado inicial
    activarPaso(1);

    window.addEventListener("scroll", actualizarPorScroll, {
        passive: true
    });

    // Cuando se abre la revisión
    const revisarPlanilla = document.getElementById("revisar-planilla");

    revisarPlanilla?.addEventListener("click", () => {
        setTimeout(() => {
            if (seccionRevision && !seccionRevision.hidden) {
                activarPaso(4);
            }
        }, 0);
    });

    // Cuando vuelve a editar
    const editarDatos = document.getElementById("editar-datos");

    editarDatos?.addEventListener("click", () => {
        setTimeout(actualizarPorScroll, 0);
    });
});