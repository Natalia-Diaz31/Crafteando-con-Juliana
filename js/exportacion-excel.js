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

export function crearLibroPlanilla(
    generales,
    XLSX
) {
    const libro = XLSX.utils.book_new();

    const texto = valor => ({
        t: "s",
        v: String(valor ?? "No registrado")
    });

    const filas = [
        [
            texto("Campo"),
            texto("Valor")
        ]
    ];

    for (
        const [grupo, valores]
        of Object.entries(generales)
    ) {
        filas.push([
            texto(grupo.replaceAll("_", " ")),
            texto("")
        ]);

        const campos =
            typeof valores === "object" &&
            valores !== null

                ? Object.entries(valores)

                : [["Texto", valores]];

        for (const [campo, valor] of campos) {
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
                    z: campo === "dias_remunerados"
                        ? "0"
                        : "0.00"
                }

                : texto(valor);

            filas.push([
                texto(campo.replaceAll("_", " ")),
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