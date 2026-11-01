const LIMITE = 500;

export function normalizarObservacion(valor = "") {
    const texto = valor.trim();

    return {
        valor: texto,
        error: texto.length > LIMITE
            ? "La observación no puede superar 500 caracteres"
            : ""
    };
}

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

function inicializarObservaciones() {
    const campo = document.getElementById("observaciones");

    campo.addEventListener("input", validarObservacionesFormulario);

    campo.addEventListener("blur", () => {
        campo.value = normalizarObservacion(campo.value).valor;
        validarObservacionesFormulario();
    });

    // La recuperación de borradores ya utiliza este evento.
    document.addEventListener(
        "planilla:modificada",
        validarObservacionesFormulario
    );

    validarObservacionesFormulario();
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        inicializarObservaciones,
        { once: true }
    );
} else {
    inicializarObservaciones();
}