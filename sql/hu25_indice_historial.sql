-- ARCHIVO: Índice para acelerar el historial de planillas
-- Buscar: índice, historial, HU-25

-- HU-25: Índice para consultar el historial
-- de planillas por empleado y período.

-- Qué hace: Crea el índice por empleado, período y fecha de guardado
-- Buscar: CREATE INDEX, historial
CREATE INDEX IF NOT EXISTS
    idx_planillas_empleado_periodo_guardado
ON public.planillas (
    empleado_id,
    anio DESC,
    mes DESC,
    fecha_guardado DESC,
    id DESC
);
