// ARCHIVO: Crea el libro de Excel con la hoja «Resumen»
// Buscar: Excel, libro, HU-31

// Mismos títulos e importes que el PDF.
import { IMPORTES, etiqueta } from "./exportacion-pdf.js";

// Qué hace: Crea el libro y su hoja de resumen
// Buscar: crearLibroPlanilla
export function crearLibroPlanilla(
    generales,
    XLSX
) {
    const libro = XLSX.utils.book_new();

    // Qué hace: Crea una celda de texto
    // Buscar: texto, celda
    const texto = valor => ({
        t: "s",
        v: String(valor ?? "No registrado")
    });

    // Encabezado y secciones como en el PDF: título de la sección en mayúsculas
    // y una tabla «Campo / Valor» debajo de cada una.
    const filas = [
        [texto("BANCO HIPOTECARIO"), texto("DETALLE DE PLANILLA")],
        [texto("Sistema de Gestión de Planillas")]
    ];

    for (
        const [grupo, valores]
        of Object.entries(generales)
    ) {
        filas.push([], [texto(etiqueta(grupo).toUpperCase())]);

        if (typeof valores !== "object" || valores === null) {
            filas.push([texto("Detalle")], [texto(valores)]);
            continue;
        }

        filas.push([texto("Campo"), texto("Valor")]);

        for (const [campo, valor] of Object.entries(valores)) {
            const numero = Number(valor);

            const esNumero =
                valor !== null &&
                valor !== "" &&
                Number.isFinite(numero) &&
                (
                    IMPORTES.has(campo) ||
                    campo === "dias_remunerados"
                );

            const celda = esNumero
                ? {
                    t: "n",
                    v: numero,
                    // «* » rellena con espacios a la derecha: el número queda a la izquierda,
                    // alineado con los textos, sin dejar de ser numérico.
                    z: campo === "dias_remunerados"
                        ? "0* "
                        : '"$ "0.00* '
                }

                : texto(valor);

            filas.push([
                texto(etiqueta(campo)),
                celda
            ]);
        }
    }

    const resumen =
        XLSX.utils.aoa_to_sheet(filas);

    resumen["!cols"] = [
        { wch: 30 },
        { wch: 70 }
    ];

    XLSX.utils.book_append_sheet(
        libro,
        resumen,
        "Resumen"
    );

    return libro;
}