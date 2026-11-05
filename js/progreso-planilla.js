// ARCHIVO: Barra de pasos del formulario de planilla
// Buscar: progreso, pasos

// Qué hace: Prepara la barra de pasos cuando carga la página
// Buscar: inicio progreso
document.addEventListener("DOMContentLoaded", () => {
    const pasos = document.querySelectorAll(".steps-bar .step");

    // Secciones reales del formulario
    const seccionDatos = document.getElementById("titulo-busqueda")?.closest("section");
    const seccionMontos = document.getElementById("salario")?.closest(".form-section");
    const seccionDescuentos = document.getElementById("titulo-legales")?.closest(".descuentos-card");
    const seccionNovedades = document.getElementById("titulo-importacion-csv")?.closest(".form-section");
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

    // Qué hace: Marca el paso activo
    // Buscar: activarPaso
    function activarPaso(numero) {
        pasos.forEach((paso, indice) => {
            paso.classList.toggle("active", indice === numero - 1);
            paso.classList.toggle("completed", indice < numero - 1);
        });
    }

    // Qué hace: Indica si un campo tiene valor
    // Buscar: tieneValor
    function tieneValor(campo) {
        return campo && campo.value.trim() !== "";
    }

    // Qué hace: Indica si los datos generales están completos
    // Buscar: datosGeneralesCompletos
    function datosGeneralesCompletos() {
        return (
            tieneValor(mes) &&
            tieneValor(anio) &&
            tieneValor(horasOrdinarias) &&
            tieneValor(horasExtras)
        );
    }

    // Qué hace: Indica si los montos están completos
    // Buscar: montosCompletos
    function montosCompletos() {
        return tieneValor(salario) && tieneValor(ingresos);
    }

    // Qué hace: Actualiza el estado de cada paso
    // Buscar: actualizarProgreso
    function actualizarProgreso() {
        // Si la revisión está visible, siempre es paso 4
        if (seccionRevision && !seccionRevision.hidden) {
            activarPaso(5);
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

    // Qué hace: Desplaza la página hasta una sección
    // Buscar: irASeccion, scroll
    function irASeccion(elemento, ajuste = 100) {
        if (!elemento) return;

        const posicion =
            elemento.getBoundingClientRect().top +
            window.scrollY -
            ajuste;

        window.scrollTo({
            top: posicion,
            behavior: "smooth"
        });
    }

    // Qué hace: Marca el paso según la parte visible de la página
    // Buscar: actualizarPasoPorScroll
    function actualizarPasoPorScroll() {
    // Si la revisión está abierta y llegamos a ella, es paso 5
        if (
            seccionRevision &&
            !seccionRevision.hidden &&
            seccionRevision.getBoundingClientRect().top <= 220
        ) {
            activarPaso(5);
            return;
        }

        // Novedades y observaciones
        if (
            seccionNovedades &&
            seccionNovedades.getBoundingClientRect().top <= 220
        ) {
            activarPaso(4);
            return;
        }

        // Deducciones legales y descuentos
        if (
            seccionDescuentos &&
            seccionDescuentos.getBoundingClientRect().top <= 220
        ) {
            activarPaso(3);
            return;
        }

        // Salario, bonos e ingresos
        if (
            seccionMontos &&
            seccionMontos.getBoundingClientRect().top <= 220
        ) {
            activarPaso(2);
            return;
        }

        activarPaso(1);
    }

    // Navegación al hacer clic en la barra
    pasos[0]?.addEventListener("click", () => {
        activarPaso(1);
        irASeccion(seccionDatos,330);
    });

    pasos[1]?.addEventListener("click", () => {
        activarPaso(2);
        irASeccion(seccionMontos,120);
    });

    pasos[2]?.addEventListener("click", () => {
        activarPaso(3);
        irASeccion(seccionDescuentos,120);
    });

    pasos[3]?.addEventListener("click", () => {
        activarPaso(4);
        irASeccion(seccionNovedades, 120);
    });

    pasos[4]?.addEventListener("click", () => {
        // Solo puede ir a revisión si ya está abierta
        if (seccionRevision && !seccionRevision.hidden) {
            activarPaso(5);
            const posicion =
                seccionRevision.getBoundingClientRect().top +
                window.scrollY -
                180;

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
                activarPaso(5);
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
                activarPaso(5);
                const posicion =
                    seccionRevision.getBoundingClientRect().top +
                    window.scrollY -
                    180;

                window.scrollTo({
                    top: posicion,
                    behavior: "smooth"
                });
            }
        }, 50);
    });

    editarDatos?.addEventListener("click", () => {
        setTimeout(actualizarProgreso, 50);
    });

    // Qué hace: Actualiza el paso al desplazarse
    // Buscar: scroll
    window.addEventListener("scroll", actualizarPasoPorScroll, {
        passive: true
    });
    actualizarProgreso();
});