document.addEventListener("DOMContentLoaded", () => {
    const pasos = document.querySelectorAll(".steps-bar .step");

    // Secciones reales del formulario
    const seccionDatos = document.getElementById("mes")?.closest(".form-section");
    const seccionMontos = document.getElementById("salario")?.closest(".form-section");
    const seccionDescuentos = document.querySelector(".descuentos-card");
    const seccionRevision = document.getElementById("resumen-planilla");

    // Campos
    const mes = document.getElementById("mes");
    const anio = document.getElementById("anio");
    const horasOrdinarias = document.getElementById("horas-ordinarias");
    const horasExtras = document.getElementById("horas-extras");
    const salario = document.getElementById("salario");
    const ingresos = document.getElementById("ingresos");

    const revisarPlanilla = document.getElementById("revisar-planilla");
    const editarDatos = document.getElementById("editar-datos");

    function activarPaso(numero) {
        pasos.forEach((paso, indice) => {
            paso.classList.toggle("active", indice === numero - 1);
            paso.classList.toggle("completed", indice < numero - 1);
        });
    }

    function tieneValor(campo) {
        return campo && campo.value.trim() !== "";
    }

    function datosGeneralesCompletos() {
        return (
            tieneValor(mes) &&
            tieneValor(anio) &&
            tieneValor(horasOrdinarias) &&
            tieneValor(horasExtras)
        );
    }

    function montosCompletos() {
        return tieneValor(salario) && tieneValor(ingresos);
    }

    function actualizarProgreso() {
        // Si la revisión está visible, siempre es paso 4
        if (seccionRevision && !seccionRevision.hidden) {
            activarPaso(4);
            return;
        }

        if (datosGeneralesCompletos() && montosCompletos()) {
            activarPaso(3);
            return;
        }

        if (datosGeneralesCompletos()) {
            activarPaso(2);
            return;
        }

        activarPaso(1);
    }

    function irASeccion(elemento) {
        if (!elemento) return;

        const posicion =
            elemento.getBoundingClientRect().top +
            window.scrollY -
            110;

        window.scrollTo({
            top: posicion,
            behavior: "smooth"
        });
    }

    // Navegación al hacer clic en la barra
    pasos[0]?.addEventListener("click", () => {
        activarPaso(1);
        if (!seccionDatos) return;
        const posicion =
            seccionDatos.getBoundingClientRect().top +
            window.scrollY -
            160;

        window.scrollTo({
            top: posicion,
            behavior: "smooth"
        });
    });

    pasos[1]?.addEventListener("click", () => {
        activarPaso(2);
        irASeccion(seccionMontos);
    });

    pasos[2]?.addEventListener("click", () => {
        activarPaso(3);
        irASeccion(seccionDescuentos);
    });

    pasos[3]?.addEventListener("click", () => {
        // Solo puede ir a revisión si ya está abierta
        if (seccionRevision && !seccionRevision.hidden) {
            activarPaso(4);
            const barra = document.querySelector(".steps-bar");
            const alturaBarra = barra ? barra.offsetHeight : 0;

            const posicion =
                seccionRevision.getBoundingClientRect().top +
                window.scrollY -
                alturaBarra -
                15;

            window.scrollTo({
                top: posicion,
                behavior: "smooth"
            });
        }
    });

    [
        mes,
        anio,
        horasOrdinarias,
        horasExtras,
        salario,
        ingresos
    ].forEach((campo) => {
        campo?.addEventListener("input", actualizarProgreso);
        campo?.addEventListener("change", actualizarProgreso);
    });

    // Detectar correctamente cuando se abre la revisión
    if (seccionRevision) {
        const observadorRevision = new MutationObserver(() => {
            if (!seccionRevision.hidden) {
                activarPaso(4);
            } else {
                actualizarProgreso();
            }
        });

        observadorRevision.observe(seccionRevision, {
            attributes: true,
            attributeFilter: ["hidden"]
        });
    }

    revisarPlanilla?.addEventListener("click", () => {
        setTimeout(() => {
            actualizarProgreso();
            // Solo baja a Revisión si las validaciones permitieron abrirla
            if (seccionRevision && !seccionRevision.hidden) {
                activarPaso(4);
                irASeccion(seccionRevision);
            }
        }, 50);
    });

    editarDatos?.addEventListener("click", () => {
        setTimeout(actualizarProgreso, 50);
    });

    actualizarProgreso();
});