import {
    validarResultadoGuardado
} from "./resultado-guardado.js";

// HU-23: conecta la recopilación y recuperación del borrador (borradores.js)
// con las rutas /api/borradores. La interfaz solo llama a estas funciones.
import { capturarBorrador, recuperarBorrador } from "./borradores.js";

// Borrador abierto en el formulario; al guardar la planilla se finaliza este borrador.
let borradorActual = null;

export const obtenerBorradorActual = () => borradorActual;

async function pedir(ruta, opciones = {}) {
    const respuesta = await fetch(`${API_URL}${ruta}`, {
        ...opciones,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionStorage.getItem("token")}`
        }
    });
    window.verificarAccesoApi(respuesta); // HU-32
    const resultado = await respuesta.json();

    if (!respuesta.ok || !resultado.ok) {
        throw new Error(
            [resultado.mensaje, ...Object.values(resultado.errores ?? {})]
                .filter(Boolean)
                .join(". ") || "No se pudo completar la operación"
        );
    }

    return resultado;
}

// Guarda un borrador nuevo o actualiza el abierto, sin crear otro.
export async function guardarBorrador() {
    const { valido, errores, contenido } = capturarBorrador();

    if (!valido) throw new Error(Object.values(errores).join(". "));

    // La API recibe el mes como número; el formulario lo tiene como nombre.
    contenido.mes = globalThis.ReglasNomina.numeroMes(contenido.mes) ?? "";

    const { borrador } = await pedir(
        borradorActual ? `/api/borradores/${borradorActual}` : "/api/borradores",
        {
            method: borradorActual ? "PUT" : "POST",
            body: JSON.stringify({ contenido })
        }
    );

    borradorActual = borrador.id;
    return borrador;
}

// Borradores de la cuenta: [{ id, contenido, estado, creado_en, actualizado_en, ... }].
export async function listarBorradores() {
    return (await pedir("/api/borradores")).borradores;
}

export async function abrirBorrador(id) {
    const { borrador } = await pedir(`/api/borradores/${encodeURIComponent(id)}`);

    await recuperarBorrador(borrador.contenido);
    borradorActual = borrador.id;
}

// Paso final: guarda lo revisado en el borrador y lo convierte en una sola planilla.
// Devuelve { id, borrador_id, total_pagar } igual que el guardado normal.
export async function finalizarBorrador() {
    await guardarBorrador();

    const resultado = await pedir(
        `/api/borradores/${borradorActual}/finalizar`,
        { method: "POST", body: JSON.stringify({ confirmar_revision: true }) }
    );

    validarResultadoGuardado(resultado);

    borradorActual = null;
    return resultado;
}
