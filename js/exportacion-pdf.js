const IMPORTES = new Set([
    "salario_base",
    "salario_original",
    "salario_base_mensual",
    "salario_proporcional",
    "ingresos_adicionales",
    "total_ingresos",
    "descuentos_totales",
    "total_pagar"
]);

    salario_original: "Salario original",
export function generarPDFPlanilla(
    generales,
    movimientos,
    {
        jsPDF,
        autoTable,
        estilos = {}
    }
) {
    const doc = new jsPDF({
        unit: "mm",
        format: "a4"
    });

    const margen = 14;
    const alto = doc.internal.pageSize.getHeight();

    // Encabezado visual del PDF
    const anchoPagina = doc.internal.pageSize.getWidth();
    const limiteDerecho = anchoPagina - margen;

    doc.setFont(undefined, "bold");
    doc.setFontSize(15);
    doc.text("BANCO HIPOTECARIO", margen, 18);

    doc.setFontSize(11);
    doc.text(
        "DETALLE DE PLANILLA",
        limiteDerecho,
        18,
        { align: "right" }
    );

    doc.setFont(undefined, "normal");
    doc.setFontSize(8.5);
    doc.text(
        "Sistema de Gestión de Planillas",
        margen,
        24
    );

    doc.line(
        margen,
        29,
        limiteDerecho,
        29
    );

    let y = 38;

    function agregarTabla(
        titulo,
        encabezados,
        filas,
        filaDestacada = null
    ) {
        if (y > alto - 40) {
            doc.addPage();
            y = 18;
        }

        doc.setFont(undefined, "bold");
        doc.setFontSize(10);
        doc.text(titulo.toUpperCase(), margen, y);

        doc.setFont(undefined, "normal");

        autoTable(doc, {
            startY: y + 4,
            head: [encabezados],
            body: filas,

            margin: {
                top: 14,
                bottom: 14,
                left: margen,
                right: margen
            },

            styles: {
                fontSize: 8.5,
                cellPadding: 3,
                overflow: "linebreak",
                valign: "middle",
                lineWidth: 0.1,
                ...estilos
            },

            headStyles: {
                fontStyle: "bold",
                halign: "left",
                fillColor: [235, 238, 242],
                textColor: [45, 55, 65],
                lineWidth: 0
            },

            bodyStyles: {
                textColor: [45, 45, 45],
                lineColor: [225, 225, 225]
            },

            alternateRowStyles: {
                fillColor: [248, 249, 250]
            },

            showHead: "everyPage",
            rowPageBreak: "avoid",

            didParseCell: function (data) {
                if (
                    filaDestacada !== null &&
                    data.section === "body" &&
                    data.row.index === filaDestacada
                ) {
                    data.cell.styles.fontStyle = "bold";
                    data.cell.styles.fillColor = [235, 238, 242];
                }
            }

        });

        y = doc.lastAutoTable.finalY + 12;
    }

    for (
        const [grupo, valores]
        of Object.entries(generales)
    ) {
        const filas =
            typeof valores === "object" &&
            valores !== null

                ? Object.entries(valores).map(
                    ([campo, valor]) => {
                        const numero = Number(valor);

                        const texto =
                            IMPORTES.has(campo) &&
                            valor !== null &&
                            valor !== "" &&
                            Number.isFinite(numero)

                                ? `$ ${numero.toFixed(2)}`

                                : String(
                                    valor ?? "No registrado"
                                );

                        return [
                            etiqueta(campo),
                            texto
                        ];
                    }
                )

                : [[
                    String(
                        valores ?? "No registrado"
                    )
                ]];
        
        const filaDestacada =
            grupo === "datos_salariales" &&
            typeof valores === "object" &&
            valores !== null
                 ? Object.keys(valores).indexOf("total_pagar")
                : null;

        agregarTabla(
            etiqueta(grupo),
            grupo === "observaciones"
            ? ["Detalle"]
            : ["Campo", "Valor"],
            filas,
            filaDestacada >= 0 ? filaDestacada : null
        );
    }

    for (const seccion of movimientos) {
        agregarTabla(
            seccion.nombre,
            seccion.encabezados,
            seccion.filas
        );
    }

    return doc;
}