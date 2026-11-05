// ARCHIVO: Campo de observaciones con límite de 500 caracteres
// Buscar: observaciones, HU-29

const LIMITE = 500;

// Qué hace: Recorta espacios y revisa el largo de la observación
// Buscar: normalizarObservacion
export function normalizarObservacion(valor = "") {
    const texto = valor.trim();

    return {
        valor: texto,
        error: texto.length > LIMITE
            ? "La observación no puede superar 500 caracteres"
            : ""
    };
}

// Qué hace: Valida la observación y actualiza su contador
// Buscar: validarObservacionesFormulario, contador
export function validarObservacionesFormulario() {
    const campo = document.getElementById("observaciones");
    const contador = document.getElementById("observaciones-contador");
    const mensaje = document.getElementById("observaciones-error");

    const resultado = normalizarObservacion(campo.value);
    const invalido = resultado.error !== "";

    contador.textContent = `${resultado.valor.length} / ${LIMITE}`;
    mensaje.textContent = resultado.error;
    campo.classList.toggle("is-invalid", invalido);
    campo.setAttribute("aria-invalid", String(invalido));

    return !invalido;
}

// Qué hace: Prepara el campo de observaciones
// Buscar: inicializarObservaciones
function inicializarObservaciones() {
    const campo = document.getElementById("observaciones");

    // Qué hace: Valida mientras se escribe
    // Buscar: input observaciones
    campo.addEventListener("input", validarObservacionesFormulario);

    campo.addEventListener("blur", () => {
        campo.value = normalizarObservacion(campo.value).valor;
        validarObservacionesFormulario();
    });

    // La recuperación de borradores ya utiliza este evento.
    // Qué hace: Actualiza el contador al recuperar un borrador
    // Buscar: planilla:modificada
    document.addEventListener(
        "planilla:modificada",
        validarObservacionesFormulario
    );

    validarObservacionesFormulario();
}

if (document.readyState === "loading") {
    // Qué hace: Recorta espacios al salir del campo
    // Buscar: focusout, blur
    document.addEventListener(
        "DOMContentLoaded",
        inicializarObservaciones,
        { once: true }
    );
} else {
    inicializarObservaciones();
}