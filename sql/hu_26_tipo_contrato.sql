-- HU-26: Tipo de contrato de empleados
-- No modifica los cálculos de nómina.

BEGIN;

-- 1. Agregar columnas
ALTER TABLE public.empleados
ADD COLUMN IF NOT EXISTS tipo_contrato TEXT;

ALTER TABLE public.planillas
ADD COLUMN IF NOT EXISTS tipo_contrato TEXT;

-- 2. Restringir valores permitidos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'empleados_tipo_contrato_check'
          AND conrelid = 'public.empleados'::regclass
    ) THEN
        ALTER TABLE public.empleados
        ADD CONSTRAINT empleados_tipo_contrato_check
        CHECK (
            tipo_contrato IS NULL OR
            tipo_contrato IN (
                'Indefinido',
                'Plazo fijo',
                'Servicios profesionales'
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'planillas_tipo_contrato_check'
          AND conrelid = 'public.planillas'::regclass
    ) THEN
        ALTER TABLE public.planillas
        ADD CONSTRAINT planillas_tipo_contrato_check
        CHECK (
            tipo_contrato IS NULL OR
            tipo_contrato IN (
                'Indefinido',
                'Plazo fijo',
                'Servicios profesionales'
            )
        );
    END IF;
END $$;

-- 3. Completar empleados ficticios
-- No sobrescribir contratos existentes
UPDATE public.empleados
SET tipo_contrato = CASE codigo
    WHEN 'EMP001' THEN 'Indefinido'
    WHEN 'EMP002' THEN 'Plazo fijo'
    WHEN 'EMP003' THEN 'Servicios profesionales'
END
WHERE codigo IN ('EMP001', 'EMP002', 'EMP003')
  AND tipo_contrato IS NULL;

COMMIT;
