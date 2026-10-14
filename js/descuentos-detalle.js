document.addEventListener("DOMContentLoaded", () => {
    const conceptoInput = document.getElementById("descuento-concepto");
    const importeInput = document.getElementById("descuento-importe");
    const agregarBtn = document.getElementById("agregar-descuento");
    const detalle = document.getElementById("detalle-descuentos");

    let descuentos = [];
    let indiceEdicion = null;

    function mostrarDescuentos() {
        detalle.innerHTML = "";

        descuentos.forEach((descuento, indice) => {
            const fila = document.createElement("tr");

            fila.innerHTML = `
                <td>${descuento.concepto}</td>
                <td>$${descuento.importe}</td>
                <td>
                    <button
                        type="button"
                        class="btn btn-outline-primary btn-sm editar-descuento"
                        data-indice="${indice}">
                        Editar
                    </button>

                    <button
                        type="button"
                        class="btn btn-outline-danger btn-sm eliminar-descuento"
                        data-indice="${indice}">
                        Eliminar
                    </button>
                </td>
            `;

            detalle.appendChild(fila);
        });
    }

    agregarBtn.addEventListener("click", () => {
        const concepto = conceptoInput.value.trim();
        const importe = importeInput.value.trim();

        if (!concepto && !importe) {
            return;
        }

        if (indiceEdicion === null) {
            descuentos.push({
                concepto: concepto,
                importe: importe
            });
        } else {
            descuentos[indiceEdicion] = {
                concepto: concepto,
                importe: importe
            };

            indiceEdicion = null;
            agregarBtn.textContent = "Agregar";
        }

        conceptoInput.value = "";
        importeInput.value = "";

        mostrarDescuentos();
    });

    detalle.addEventListener("click", (event) => {
        const botonEditar = event.target.closest(".editar-descuento");
        const botonEliminar = event.target.closest(".eliminar-descuento");

        if (botonEditar) {
            const indice = Number(botonEditar.dataset.indice);

            conceptoInput.value = descuentos[indice].concepto;
            importeInput.value = descuentos[indice].importe;

            indiceEdicion = indice;
            agregarBtn.textContent = "Guardar cambio";
        }

        if (botonEliminar) {
            const indice = Number(botonEliminar.dataset.indice);

            descuentos.splice(indice, 1);

            if (indiceEdicion === indice) {
                indiceEdicion = null;
                conceptoInput.value = "";
                importeInput.value = "";
                agregarBtn.textContent = "Agregar";
            }

            mostrarDescuentos();
        }
    });
});

