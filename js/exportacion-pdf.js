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

    let y = 18;

    function agregarTabla(
        titulo,
        encabezados,
        filas
    ) {
        if (y > alto - 40) {
            doc.addPage();
            y = 18;
        }

        doc.setFontSize(12);
        doc.text(titulo, margen, y);

        autoTable(doc, {
            startY: y + 4,
            head: [encabezados],
            body: filas,

            margin: {
                top: 14,
                bottom: 14,
                left: 14,
                right: 14
            },

            styles: {
                fontSize: 8,
                overflow: "linebreak",
                ...estilos
            },

            showHead: "everyPage",
            rowPageBreak: "avoid"
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

                                ? numero.toFixed(2)

                                : String(
                                    valor ?? "No registrado"
                                );

                        return [
                            campo.replaceAll("_", " "),
                            texto
                        ];
                    }
                )

                : [[
                    "Texto",
                    String(
                        valores ?? "No registrado"
                    )
                ]];

        agregarTabla(
            grupo.replaceAll("_", " "),
            ["Campo", "Valor"],
            filas
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