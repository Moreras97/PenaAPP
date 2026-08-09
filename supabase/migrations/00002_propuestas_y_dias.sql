-- ============================================
-- MIGRACIÓN 00002: Propuestas con tipo/hora + cocineros
-- Ejecutar en: Supabase SQL Editor
-- ============================================

-- 1. Añadir tipo_comida y hora a propuestas_menu
ALTER TABLE propuestas_menu ADD COLUMN IF NOT EXISTS tipo_comida TEXT DEFAULT 'comida' CHECK (tipo_comida IN ('comida', 'cena'));
ALTER TABLE propuestas_menu ADD COLUMN IF NOT EXISTS hora TIME;

-- 2. Tabla de cocineros por propuesta (muchos-a-muchos)
CREATE TABLE IF NOT EXISTS propuestas_cocineros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propuesta_id UUID NOT NULL REFERENCES propuestas_menu(id) ON DELETE CASCADE,
  user_pena_id UUID NOT NULL REFERENCES users_penas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(propuesta_id, user_pena_id)
);

-- 3. RLS para propuestas_cocineros
ALTER TABLE propuestas_cocineros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver cocineros" ON propuestas_cocineros FOR SELECT USING (
  EXISTS (SELECT 1 FROM propuestas_menu pm WHERE pm.id = propuesta_id AND is_pena_member(pm.pena_id))
);
CREATE POLICY "Unirse como cocinero" ON propuestas_cocineros FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM propuestas_menu pm WHERE pm.id = propuesta_id AND is_pena_member(pm.pena_id))
);
CREATE POLICY "Salir como cocinero" ON propuestas_cocineros FOR DELETE USING (
  user_pena_id IN (SELECT id FROM users_penas WHERE user_id = auth.uid())
);

-- 4. Añadir columnas faltantes (por si acaso)
ALTER TABLE fiestas ADD COLUMN IF NOT EXISTS max_dias_sueltos INTEGER DEFAULT 999;
ALTER TABLE fiestas ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT FALSE;
ALTER TABLE asistencias ADD COLUMN IF NOT EXISTS tipo_alcohol TEXT;
ALTER TABLE asistencias ADD COLUMN IF NOT EXISTS marca_alcohol TEXT;
ALTER TABLE asistencias ADD COLUMN IF NOT EXISTS mezcla TEXT;

-- 5. Actualizar constraint de bebida para incluir cubatas
ALTER TABLE asistencias DROP CONSTRAINT IF EXISTS asistencias_bebida_check;
ALTER TABLE asistencias ADD CONSTRAINT asistencias_bebida_check CHECK (bebida IN ('cerveza', 'tinto', 'refresco', 'agua', 'nada', 'cubatas'));

-- 6. Columnas para productos_catalogo
ALTER TABLE productos_catalogo ADD COLUMN IF NOT EXISTS litros_por_unidad NUMERIC(10,3) DEFAULT 0;
ALTER TABLE productos_catalogo ADD COLUMN IF NOT EXISTS precio_referencia NUMERIC(10,2);
ALTER TABLE productos_catalogo ADD COLUMN IF NOT EXISTS precio_manual NUMERIC(10,2);
ALTER TABLE productos_catalogo ADD COLUMN IF NOT EXISTS fuente_precio TEXT DEFAULT 'referencia';
ALTER TABLE productos_catalogo ADD COLUMN IF NOT EXISTS tipo_producto TEXT DEFAULT 'general';

-- 7. requires_approval y pending_members
ALTER TABLE penas ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS pending_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pena_id UUID NOT NULL REFERENCES penas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL,
  apodo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pena_id, user_id)
);

SELECT 'Migracion 00002 completada' AS result;

-- 8. RLS para pending_members (si no existe ya)
ALTER TABLE pending_members ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin ve solicitudes' AND tablename = 'pending_members') THEN
    CREATE POLICY "Admin ve solicitudes" ON pending_members FOR SELECT USING (
      is_pena_admin(pena_id)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Crear solicitud' AND tablename = 'pending_members') THEN
    CREATE POLICY "Crear solicitud" ON pending_members FOR INSERT WITH CHECK (
      user_id = auth.uid()
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin gestiona solicitudes' AND tablename = 'pending_members') THEN
    CREATE POLICY "Admin gestiona solicitudes" ON pending_members FOR DELETE USING (
      is_pena_admin(pena_id)
    );
  END IF;
END
$$;

SELECT 'Migracion 00002 completada' AS result;
