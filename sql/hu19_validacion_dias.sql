CREATE OR REPLACE FUNCTION public.guardar_planilla_con_descuentos(p_registro jsonb, p_descuentos jsonb, p_operacion_id uuid, p_novedades jsonb)
 RETURNS TABLE(id uuid, fecha_guardado timestamp with time zone, total_pagar numeric, creada_nueva boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
    v_item JSONB;
    v_novedades_limpias JSONB := '[]'::jsonb;
    v_tipo TEXT;
    v_condicion TEXT;
    v_inicio DATE;
    v_fin DATE;
    v_mes INTEGER;
    v_anio INTEGER;
    v_dias_sin_goce INTEGER := 0;
    v_rangos DATERANGE[] := ARRAY[]::daterange[];

    v_id UUID;
    v_fecha TIMESTAMPTZ;
    v_total NUMERIC;
    v_creada BOOLEAN;
BEGIN
    -- 1. Validar los datos recibidos
    IF p_registro IS NULL
       OR jsonb_typeof(p_registro) <> 'object' THEN
        RAISE EXCEPTION 'Registro de planilla invalido';
    END IF;

    IF p_novedades IS NULL
       OR jsonb_typeof(p_novedades) <> 'array' THEN
        RAISE EXCEPTION 'Las novedades deben ser una lista';
    END IF;

    v_mes := (p_registro->>'mes')::INTEGER;
    v_anio := (p_registro->>'anio')::INTEGER;

    IF v_mes IS NULL OR v_anio IS NULL
       OR v_mes NOT BETWEEN 1 AND 12
       OR v_anio NOT BETWEEN 1 AND 9999 THEN
        RAISE EXCEPTION 'Periodo de planilla invalido';
    END IF;

    -- 2. Validar cada novedad
    FOR v_item IN
        SELECT value
        FROM jsonb_array_elements(p_novedades)
    LOOP

        IF jsonb_typeof(v_item) <> 'object' THEN
            RAISE EXCEPTION 'Novedad invalida';
        END IF;

        v_tipo := CASE lower(trim(v_item->>'tipo'))
            WHEN 'incapacidad' THEN 'Incapacidad'
            WHEN 'permiso' THEN 'Permiso'
            WHEN 'ausencia' THEN 'Ausencia'
            ELSE NULL
        END;

        IF v_tipo IS NULL THEN
            RAISE EXCEPTION 'Tipo de novedad invalido';
        END IF;

        v_condicion := CASE lower(trim(
            COALESCE(
                v_item->>'condicion_pago',
                v_item->>'condicion',
                ''
            )
        ))
            WHEN 'con goce' THEN 'Con goce'
            WHEN 'sin goce' THEN 'Sin goce'
            ELSE NULL
        END;

        IF v_condicion IS NULL THEN
            RAISE EXCEPTION 'Condicion de pago invalida';
        END IF;

        -- Validar formato de fechas
        IF COALESCE(v_item->>'fecha_inicio', '') !~
           '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
           OR COALESCE(v_item->>'fecha_fin', '') !~
           '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        THEN
            RAISE EXCEPTION 'Formato de fechas invalido';
        END IF;

        v_inicio := (v_item->>'fecha_inicio')::DATE;
        v_fin := (v_item->>'fecha_fin')::DATE;

        IF v_fin < v_inicio THEN
            RAISE EXCEPTION
            'La fecha final no puede ser anterior a la inicial';
        END IF;

        -- Ambas fechas deben pertenecer al periodo
        IF EXTRACT(MONTH FROM v_inicio) <> v_mes
           OR EXTRACT(YEAR FROM v_inicio) <> v_anio
           OR EXTRACT(MONTH FROM v_fin) <> v_mes
           OR EXTRACT(YEAR FROM v_fin) <> v_anio THEN

            RAISE EXCEPTION
            'Las fechas deben pertenecer al periodo de la planilla';
        END IF;

        -- Evitar fechas superpuestas en la misma planilla
        IF EXISTS (
            SELECT 1
            FROM unnest(v_rangos) AS r(rango)
            WHERE r.rango &&
                  daterange(v_inicio, v_fin, '[]')
        ) THEN
            RAISE EXCEPTION
            'Las fechas se superponen con otra novedad';
        END IF;

        v_rangos := array_append(
            v_rangos,
            daterange(v_inicio, v_fin, '[]')
        );

        -- Contar dias sin goce
        IF v_condicion = 'Sin goce' THEN
            v_dias_sin_goce :=
                v_dias_sin_goce + (v_fin - v_inicio + 1);
        END IF;

        IF v_dias_sin_goce > 30 THEN
            RAISE EXCEPTION
            'Los dias sin goce no pueden superar 30';
        END IF;

        -- Preparar novedad validada
        v_novedades_limpias :=
            v_novedades_limpias ||
            jsonb_build_array(
                jsonb_build_object(
                    'tipo', v_tipo,
                    'fecha_inicio', v_inicio,
                    'fecha_fin', v_fin,
                    'condicion_pago', v_condicion
                )
            );

    END LOOP;

    -- HU-19: comprobar que los días coincidan con las novedades.
IF p_registro->>'modo_calculo' = 'dias' THEN
    IF COALESCE(p_registro->>'dias_remunerados', '') !~ '^[0-9]+$'
        OR (p_registro->>'dias_remunerados')::numeric
            <> 30 - v_dias_sin_goce
    THEN
        RAISE EXCEPTION
            'Los dias remunerados no coinciden con las novedades';
    END IF;
END IF;

    -- 3. Guardar la planilla mediante HU-17
    SELECT
        r.id,
        r.fecha_guardado,
        r.total_pagar,
        r.creada_nueva
    INTO
        v_id,
        v_fecha,
        v_total,
        v_creada
    FROM public.guardar_planilla_con_descuentos(
        p_registro,
        p_descuentos,
        p_operacion_id
    ) AS r;

    IF v_id IS NULL THEN
        RAISE EXCEPTION 'No se pudo guardar la planilla';
    END IF;

    -- 4. Guardar novedades solo si la planilla es nueva
    IF v_creada THEN

        -- HU-18: guardar los dias remunerados calculados
        UPDATE public.planillas
        SET dias_remunerados = 30 - v_dias_sin_goce
        WHERE id = v_id;

        INSERT INTO public.planilla_novedades (
            planilla_id,
            tipo,
            fecha_inicio,
            fecha_fin,
            condicion_pago
        )
        SELECT
            v_id,
            n.tipo,
            n.fecha_inicio,
            n.fecha_fin,
            n.condicion_pago
        FROM jsonb_to_recordset(v_novedades_limpias)
        AS n(
            tipo TEXT,
            fecha_inicio DATE,
            fecha_fin DATE,
            condicion_pago TEXT
        );

    END IF;

    -- 5. Devolver resultado
    RETURN QUERY
    SELECT v_id, v_fecha, v_total, v_creada;

END;
$function$;