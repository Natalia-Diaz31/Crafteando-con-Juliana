// HU-14: presentación compartida del cálculo actual y del registro histórico.
window.pintarDeduccionesLegales = function (contenedor, calculo) {
    contenedor.replaceChildren();
    if (!calculo) {
        contenedor.textContent = 'Este registro no conserva un detalle de deducciones legales.';
        return;
    }
    const titulo = document.createElement('p');
    titulo.textContent = `Frecuencia: ${calculo.periodo_pago}`;
    const tabla = document.createElement('table');
    tabla.className = 'table table-striped align-middle';
    const thead = document.createElement('thead');
    const encabezado = document.createElement('tr');
    ['Deducción', 'Base (USD)', 'Tasa / tramo', 'Importe (USD)'].forEach(texto => {
        const th = document.createElement('th'); th.scope = 'col'; th.textContent = texto; encabezado.append(th);
    });
    thead.append(encabezado); tabla.append(thead);
    const tbody = document.createElement('tbody');
    calculo.detalle.forEach(item => {
        const fila = document.createElement('tr');
        let regla = `${item.tasa} %`;
        if (item.tope) regla += `; máximo $${item.tope}`;
        if (item.tramo) regla += `; tramo ${item.tramo}${item.tramo === 'I' ? ' (sin retención)' : `; exceso de $${item.exceso_desde} + cuota $${item.cuota_fija}`}`;
        [item.nombre, `$${item.base}`, regla, `$${item.importe}`].forEach(texto => {
            const celda = document.createElement('td'); celda.textContent = texto; fila.append(celda);
        });
        tbody.append(fila);
    });
    tabla.append(tbody);
    const total = document.createElement('p');
    total.className = 'fw-bold'; total.textContent = `Total de deducciones legales: $${calculo.total}`;
    contenedor.append(titulo, tabla, total);
};

document.addEventListener('DOMContentLoaded', () => {
    const contenedor = document.getElementById('detalle-deducciones-legales');
    if (!contenedor) return;
    const mensaje = document.getElementById('deducciones-legales-error');
    const frecuencia = document.getElementById('periodo-pago');
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    let actual = null;
    function calcular() {
        actual = null;
        try {
            if (!window.ReglasNomina) throw new Error('No se pueden calcular las deducciones legales: falta configurar una regla');
            actual = window.ReglasNomina.calcular({
                salario_base: document.getElementById('salario').value,
                ingresos_adicionales: document.getElementById('ingresos').value,
                periodo_pago: frecuencia.value,
                mes: meses.indexOf(document.getElementById('mes').value) + 1,
                anio: document.getElementById('anio').value
            });
            window.pintarDeduccionesLegales(contenedor, actual);
            mensaje.textContent = '';
            frecuencia.classList.remove('is-invalid');
            frecuencia.setAttribute('aria-invalid', 'false');
        } catch (error) {
            contenedor.replaceChildren();
            mensaje.textContent = error.message;
        }
        return actual;
    }
    window.obtenerDeduccionesLegales = () => actual ? JSON.parse(JSON.stringify(actual)) : null;
    window.validarDeduccionesLegales = function () {
        const valido = Boolean(calcular());
        if (!valido) {
            frecuencia.classList.toggle('is-invalid', !frecuencia.value);
            frecuencia.setAttribute('aria-invalid', String(!frecuencia.value));
            mensaje.scrollIntoView({ block: 'center' });
        }
        return valido;
    };
    ['salario','ingresos','periodo-pago','mes','anio'].forEach(id => {
        ['input','change'].forEach(evento => document.getElementById(id).addEventListener(evento, () => {
            calcular();
            window.actualizarDescuentosTotales?.();
        }));
    });
    calcular();
});
