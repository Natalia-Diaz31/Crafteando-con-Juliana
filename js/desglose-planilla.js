//
// HU-12 y HU-13: PRESENTACIÓN COMPARTIDA DEL RESUMEN Y DEL DETALLE
//

(() => {
    const formatoUSD = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    });

    function aCentavos(valor) {
        const numero = Number(valor);
        return Number.isFinite(numero) ? Math.round(numero * 100) : 0;
    }

    // HU-13: cantidad de horas con dos decimales.
    // Los registros anteriores a la HU-13 no tienen horas: no se presentan como 0.00.
    window.formatoHoras = function (valor) {
        if (valor === null || valor === undefined || valor === "") {
            return "No registradas";
        }

        const numero = Number(valor);

        return Number.isFinite(numero)
            ? `${numero.toFixed(2)} h`
            : "No registradas";
    };

    // HU-12: la API guarda las deducciones legales junto al detalle de descuentos.
    // Para presentar solo los descuentos autorizados, se quita una vez cada deducción legal.
    window.separarDescuentosAutorizados = function (descuentos, deduccionesLegales) {
        const pendientes = (deduccionesLegales?.detalle || [])
            .filter(item => aCentavos(item.importe) > 0)
            .map(item => ({
                concepto: item.nombre,
                centavos: aCentavos(item.importe)
            }));

        return (descuentos || []).filter((descuento) => {
            const indice = pendientes.findIndex(item =>
                item.concepto === descuento.concepto &&
                item.centavos === aCentavos(descuento.importe)
            );

            if (indice === -1) return true;

            pendientes.splice(indice, 1);
            return false;
        });
    };

    // HU-12: tabla con cada concepto, su importe y la suma del detalle.
    // Con null (planillas anteriores a la HU-12) indica que no hay detalle guardado.
    window.pintarDescuentosAutorizados = function (contenedor, descuentos) {
        contenedor.replaceChildren();

        if (descuentos === null) {
            contenedor.textContent =
                "Este registro no conserva un detalle de descuentos autorizados.";
            return;
        }

        const lista = descuentos || [];
        const suma = lista.reduce((total, d) => total + aCentavos(d.importe), 0);

        if (lista.length > 0) {
            const tabla = document.createElement("table");
            tabla.className = "table table-striped align-middle";

            const encabezado = document.createElement("tr");
            ["Concepto", "Importe (USD)"].forEach((texto) => {
                const th = document.createElement("th");
                th.scope = "col";
                th.textContent = texto;
                encabezado.append(th);
            });

            const thead = document.createElement("thead");
            thead.append(encabezado);

            const tbody = document.createElement("tbody");
            lista.forEach((descuento) => {
                const fila = document.createElement("tr");

                [descuento.concepto, formatoUSD.format(aCentavos(descuento.importe) / 100)]
                    .forEach((texto) => {
                        const celda = document.createElement("td");
                        celda.textContent = texto;
                        fila.append(celda);
                    });

                tbody.append(fila);
            });

            tabla.append(thead, tbody);
            contenedor.append(tabla);
        } else {
            const vacio = document.createElement("p");
            vacio.textContent = "Sin descuentos autorizados";
            contenedor.append(vacio);
        }

        const total = document.createElement("p");
        total.className = "fw-bold";
        total.textContent =
            `Suma de descuentos autorizados: ${formatoUSD.format(suma / 100)}`;
        contenedor.append(total);
    };
})();
