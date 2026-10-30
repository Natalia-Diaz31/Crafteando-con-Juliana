
"use strict";

// HU-31: Deducciones legales, novedades y tipos de celda para Excel.
// Utiliza los datos guardados; no recalcula importes ni modifica la planilla.

// Crear una celda de texto explícita, incluso si comienza con =, +, - o @.
function celdaTexto(valor) {
    return {
        t: "s",
        v: String(valor ?? "No registrado")
    };
}

// Crear una celda numérica con dos decimales.
function celdaImporte(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return celdaTexto("No registrado");
    }

    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        throw new TypeError("Importe de movimiento inválido");
    }

    return {
        t: "n",
        v: numero,
        z: "0.00"
    };
}

// Conservar las fechas como texto para evitar conversiones inesperadas.
function celdaFecha(valor) {
    return celdaTexto(valor);
}

// Los días son cantidades numéricas, no importes monetarios.
function celdaDias(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return celdaTexto("No registrado");
    }

    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        throw new TypeError("Cantidad de días inválida");
    }

    return {
        t: "n",
        v: numero,
        z: "0.##"
    };
}

function prepararLegalesNovedadesExcel(planilla) {
    if (!planilla || typeof planilla !== "object" ||
        Array.isArray(planilla)) {
        throw new TypeError("Datos de exportación inválidos");
    }

    const dato = valor =>
        valor === null || valor === undefined ||
        (typeof valor === "string" && !valor.trim())
            ? "No registrado"
            : valor;

    const reglaLegal = item => {
        const partes = [];

        if (item.tasa != null) {
            partes.push(`${item.tasa} %`);
        }

        if (item.tope != null) {
            partes.push(`Máximo: ${Number(item.tope).toFixed(2)}`);
        }

        if (item.tramo != null) {
            partes.push(`Tramo: ${item.tramo}`);
        }

        if (item.exceso_desde != null) {
            partes.push(`Exceso desde: ${Number(item.exceso_desde).toFixed(2)}`);
        }

        if (item.cuota_fija != null) {
            partes.push(`Cuota fija: ${Number(item.cuota_fija).toFixed(2)}`);
        }

        return partes.length
            ? partes.join("; ")
            : "No registrado";
    };

    const legales = planilla.deducciones_legales;
    const detalleLegales = Array.isArray(legales?.detalle)
        ? legales.detalle
        : [];

    const filasLegales = detalleLegales.map(item => [
        celdaTexto(dato(item.nombre)),
        celdaImporte(item.base),
        celdaTexto(reglaLegal(item)),
        celdaImporte(item.importe)
    ]);

    if (filasLegales.length === 0) {
        filasLegales.push([
            celdaTexto(
                !legales || !Array.isArray(legales.detalle)
                    ? "Detalle no registrado"
                    : "Sin movimientos"
            )
        ]);
    }

    const novedades = Array.isArray(planilla.novedades)
        ? planilla.novedades
        : [];

    const filasNovedades = novedades.map(item => [
        celdaTexto(dato(item.tipo)),
        celdaFecha(item.fecha_inicio),
        celdaFecha(item.fecha_fin),
        celdaTexto(dato(item.condicion_pago)),
        celdaDias(item.dias)
    ]);

    if (filasNovedades.length === 0) {
        filasNovedades.push([
            celdaTexto(
                !Array.isArray(planilla.novedades)
                    ? "Detalle no registrado"
                    : "Sin movimientos"
            )
        ]);
    }

    return [
        {
            nombre: "Deducciones legales",
            encabezados: [
                "Deducción",
                "Base (USD)",
                "Tasa / tramo",
                "Importe (USD)"
            ],
            filas: filasLegales
        },
        {
            nombre: "Novedades",
            encabezados: [
                "Tipo",
                "Inicio",
                "Fin",
                "Condición de pago",
                "Días"
            ],
            filas: filasNovedades
        }
    ];
}

function agregarLegalesNovedadesAlLibro(libro, planilla, XLSX) {
    if (!libro || !XLSX?.utils) {
        throw new TypeError("Libro Excel inválido");
    }

    const hojas = prepararLegalesNovedadesExcel(planilla);

    for (const hoja of hojas) {
        const encabezados = hoja.encabezados.map(celdaTexto);
        const filas = [encabezados, ...hoja.filas];

        const hojaExcel = XLSX.utils.aoa_to_sheet(filas);

        hojaExcel["!cols"] = hoja.encabezados.map(
            encabezado => ({
                wch: Math.max(encabezado.length + 5, 18)
            })
        );

        XLSX.utils.book_append_sheet(
            libro,
            hojaExcel,
            hoja.nombre
        );
    }

    return libro;
}

// Disponible para pruebas automatizadas en Node.js.

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        celdaTexto,
        celdaImporte,
        celdaFecha,
        celdaDias,
        prepararLegalesNovedadesExcel,
        agregarLegalesNovedadesAlLibro
    };
} else {
    window.prepararLegalesNovedadesExcel =
        prepararLegalesNovedadesExcel;

    window.agregarLegalesNovedadesAlLibro =
        agregarLegalesNovedadesAlLibro;
}

