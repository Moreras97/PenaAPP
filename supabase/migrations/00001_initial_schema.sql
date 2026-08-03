-- ============================================
-- PEÑA APP — Esquema inicial de base de datos
-- ============================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLAS PRINCIPALES
-- ============================================

-- 1. Peñas (clubes/grupos de fiestas)
CREATE TABLE penas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  escudo_url TEXT,
  color_primary TEXT NOT NULL DEFAULT '#6366F1',
  color_secondary TEXT NOT NULL DEFAULT '#F59E0B',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Miembros de peña con roles
CREATE TABLE users_penas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pena_id UUID NOT NULL REFERENCES penas(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL,
  apodo TEXT,
  rol TEXT NOT NULL DEFAULT 'miembro' CHECK (rol IN ('admin', 'mod', 'miembro')),
  cuota_pagada BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, pena_id)
);

-- 3. Fiestas (eventos)
CREATE TABLE fiestas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pena_id UUID NOT NULL REFERENCES penas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fechas_validas CHECK (fecha_fin >= fecha_inicio)
);

-- 4. Días individuales de cada fiesta
CREATE TABLE dias_fiesta (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fiesta_id UUID NOT NULL REFERENCES fiestas(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  nombre TEXT
);

-- 5. Registro de asistencia
CREATE TABLE asistencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_pena_id UUID NOT NULL REFERENCES users_penas(id) ON DELETE CASCADE,
  fiesta_id UUID NOT NULL REFERENCES fiestas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('semana_completa', 'dias_sueltos')),
  bebida TEXT DEFAULT 'cerveza' CHECK (bebida IN ('cerveza', 'tinto', 'refresco', 'agua', 'nada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_pena_id, fiesta_id)
);

-- 6. Días seleccionados para asistencia tipo dias_sueltos
CREATE TABLE asistencia_dias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asistencia_id UUID NOT NULL REFERENCES asistencias(id) ON DELETE CASCADE,
  dia_fiesta_id UUID NOT NULL REFERENCES dias_fiesta(id) ON DELETE CASCADE,
  UNIQUE(asistencia_id, dia_fiesta_id)
);

-- 7. Gastos (bote común y adelantos personales)
CREATE TABLE gastos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pena_id UUID NOT NULL REFERENCES penas(id) ON DELETE CASCADE,
  fiesta_id UUID REFERENCES fiestas(id) ON DELETE SET NULL,
  creado_por UUID NOT NULL REFERENCES users_penas(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('bote_comun', 'adelanto_personal')),
  concepto TEXT NOT NULL,
  importe NUMERIC(10,2) NOT NULL CHECK (importe > 0),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  beneficiario_id UUID REFERENCES users_penas(id),
  saldado BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Propuestas de menú (comidas y cenas)
CREATE TABLE propuestas_menu (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pena_id UUID NOT NULL REFERENCES penas(id) ON DELETE CASCADE,
  fiesta_id UUID NOT NULL REFERENCES fiestas(id) ON DELETE CASCADE,
  dia_fiesta_id UUID NOT NULL REFERENCES dias_fiesta(id) ON DELETE CASCADE,
  propuesto_por UUID NOT NULL REFERENCES users_penas(id),
  menu TEXT NOT NULL,
  se_encarga BOOLEAN NOT NULL DEFAULT FALSE,
  aprobado BOOLEAN NOT NULL DEFAULT FALSE,
  aprobado_por UUID REFERENCES users_penas(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Catálogo de productos (calculadora de bote)
CREATE TABLE productos_catalogo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pena_id UUID NOT NULL REFERENCES penas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'general',
  precio_estimado NUMERIC(10,2) NOT NULL CHECK (precio_estimado >= 0),
  unidad TEXT NOT NULL DEFAULT 'ud',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Chat en tiempo real
CREATE TABLE chat_mensajes (
  id BIGSERIAL PRIMARY KEY,
  pena_id UUID NOT NULL REFERENCES penas(id) ON DELETE CASCADE,
  user_pena_id UUID REFERENCES users_penas(id) ON DELETE SET NULL,
  mensaje TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'chat' CHECK (tipo IN ('chat', 'sistema')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX idx_users_penas_user ON users_penas(user_id);
CREATE INDEX idx_users_penas_pena ON users_penas(pena_id);
CREATE INDEX idx_fiestas_pena ON fiestas(pena_id);
CREATE INDEX idx_dias_fiesta_fiesta ON dias_fiesta(fiesta_id);
CREATE INDEX idx_asistencias_fiesta ON asistencias(fiesta_id);
CREATE INDEX idx_asistencias_user_pena ON asistencias(user_pena_id);
CREATE INDEX idx_asistencia_dias_asistencia ON asistencia_dias(asistencia_id);
CREATE INDEX idx_gastos_pena ON gastos(pena_id);
CREATE INDEX idx_gastos_fiesta ON gastos(fiesta_id);
CREATE INDEX idx_gastos_beneficiario ON gastos(beneficiario_id);
CREATE INDEX idx_propuestas_pena ON propuestas_menu(pena_id);
CREATE INDEX idx_propuestas_dia ON propuestas_menu(dia_fiesta_id);
CREATE INDEX idx_productos_pena ON productos_catalogo(pena_id);
CREATE INDEX idx_chat_pena ON chat_mensajes(pena_id);
CREATE INDEX idx_chat_created ON chat_mensajes(created_at DESC);

-- ============================================
-- FUNCIONES AUXILIARES PARA RLS
-- ============================================

-- Obtener el rol de un usuario en una peña
CREATE OR REPLACE FUNCTION get_user_role(pena_uuid UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT rol FROM users_penas
  WHERE user_id = auth.uid() AND pena_id = pena_uuid;
$$;

-- Verificar si un usuario es admin de una peña
CREATE OR REPLACE FUNCTION is_pena_admin(pena_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users_penas
    WHERE user_id = auth.uid() AND pena_id = pena_uuid AND rol = 'admin'
  );
$$;

-- Verificar si un usuario es admin o mod de una peña
CREATE OR REPLACE FUNCTION is_pena_admin_or_mod(pena_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users_penas
    WHERE user_id = auth.uid() AND pena_id = pena_uuid AND rol IN ('admin', 'mod')
  );
$$;

-- Verificar si un usuario pertenece a una peña
CREATE OR REPLACE FUNCTION is_pena_member(pena_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users_penas
    WHERE user_id = auth.uid() AND pena_id = pena_uuid
  );
$$;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- penas
ALTER TABLE penas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver penas propias" ON penas FOR SELECT USING (is_pena_member(id));
CREATE POLICY "Crear peña" ON penas FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin edita su peña" ON penas FOR UPDATE USING (is_pena_admin(id));
CREATE POLICY "Admin borra su peña" ON penas FOR DELETE USING (is_pena_admin(id));

-- users_penas
ALTER TABLE users_penas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver miembros de tu peña" ON users_penas FOR SELECT USING (is_pena_member(pena_id));
CREATE POLICY "Unirse a peña" ON users_penas FOR INSERT WITH CHECK (user_id = auth.uid() AND rol = 'miembro');
CREATE POLICY "Admin gestiona miembros" ON users_penas FOR UPDATE USING (is_pena_admin(pena_id));
CREATE POLICY "Admin gestiona roles" ON users_penas FOR UPDATE USING (is_pena_admin(pena_id));
CREATE POLICY "Admin elimina miembros" ON users_penas FOR DELETE USING (is_pena_admin(pena_id));
-- El propio usuario puede editar su perfil (nombre, apodo)
CREATE POLICY "Usuario edita su propio perfil" ON users_penas FOR UPDATE USING (user_id = auth.uid());

-- fiestas
ALTER TABLE fiestas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver fiestas de tu peña" ON fiestas FOR SELECT USING (is_pena_member(pena_id));
CREATE POLICY "Admin crea fiesta" ON fiestas FOR INSERT WITH CHECK (is_pena_admin(pena_id));
CREATE POLICY "Admin edita fiesta" ON fiestas FOR UPDATE USING (is_pena_admin(pena_id));
CREATE POLICY "Admin borra fiesta" ON fiestas FOR DELETE USING (is_pena_admin(pena_id));

-- dias_fiesta
ALTER TABLE dias_fiesta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver días de fiesta" ON dias_fiesta FOR SELECT
  USING (is_pena_member((SELECT pena_id FROM fiestas WHERE id = fiesta_id)));
CREATE POLICY "Admin gestiona días" ON dias_fiesta FOR INSERT WITH CHECK
  (is_pena_admin((SELECT pena_id FROM fiestas WHERE id = fiesta_id)));
CREATE POLICY "Admin edita días" ON dias_fiesta FOR UPDATE USING
  (is_pena_admin((SELECT pena_id FROM fiestas WHERE id = fiesta_id)));
CREATE POLICY "Admin borra días" ON dias_fiesta FOR DELETE USING
  (is_pena_admin((SELECT pena_id FROM fiestas WHERE id = fiesta_id)));

-- asistencias
ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver asistencias de tu peña" ON asistencias FOR SELECT
  USING (is_pena_member((SELECT pena_id FROM fiestas WHERE id = fiesta_id)));
CREATE POLICY "Crear tu asistencia" ON asistencias FOR INSERT
  WITH CHECK (is_pena_member((SELECT pena_id FROM fiestas WHERE id = fiesta_id)));
CREATE POLICY "Editar tu asistencia o admin/mod" ON asistencias FOR UPDATE
  USING (
    user_pena_id IN (SELECT id FROM users_penas WHERE user_id = auth.uid())
    OR is_pena_admin_or_mod((SELECT pena_id FROM fiestas WHERE id = fiesta_id))
  );
CREATE POLICY "Borrar tu asistencia o admin/mod" ON asistencias FOR DELETE
  USING (
    user_pena_id IN (SELECT id FROM users_penas WHERE user_id = auth.uid())
    OR is_pena_admin_or_mod((SELECT pena_id FROM fiestas WHERE id = fiesta_id))
  );

-- asistencia_dias
ALTER TABLE asistencia_dias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver días de asistencia" ON asistencia_dias FOR SELECT
  USING (is_pena_member(
    (SELECT fi.pena_id FROM asistencias a JOIN fiestas fi ON a.fiesta_id = fi.id WHERE a.id = asistencia_id)
  ));
CREATE POLICY "Gestionar días de tu asistencia" ON asistencia_dias FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM asistencias WHERE id = asistencia_id
    AND user_pena_id IN (SELECT id FROM users_penas WHERE user_id = auth.uid())
  ));
CREATE POLICY "Borrar días de tu asistencia" ON asistencia_dias FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM asistencias WHERE id = asistencia_id
    AND user_pena_id IN (SELECT id FROM users_penas WHERE user_id = auth.uid())
  ));

-- gastos
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver gastos de tu peña" ON gastos FOR SELECT USING (is_pena_member(pena_id));
CREATE POLICY "Crear gasto (admin/mod)" ON gastos FOR INSERT WITH CHECK (is_pena_admin_or_mod(pena_id));
CREATE POLICY "Admin edita gasto" ON gastos FOR UPDATE USING (is_pena_admin(pena_id));
CREATE POLICY "Admin borra gasto" ON gastos FOR DELETE USING (is_pena_admin(pena_id));

-- propuestas_menu
ALTER TABLE propuestas_menu ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver propuestas de tu peña" ON propuestas_menu FOR SELECT USING (is_pena_member(pena_id));
CREATE POLICY "Crear propuesta" ON propuestas_menu FOR INSERT WITH CHECK (is_pena_member(pena_id));
CREATE POLICY "Editar tu propuesta o admin/mod" ON propuestas_menu FOR UPDATE
  USING (propuesto_por IN (SELECT id FROM users_penas WHERE user_id = auth.uid()) OR is_pena_admin_or_mod(pena_id));
CREATE POLICY "Borrar tu propuesta o admin/mod" ON propuestas_menu FOR DELETE
  USING (propuesto_por IN (SELECT id FROM users_penas WHERE user_id = auth.uid()) OR is_pena_admin_or_mod(pena_id));

-- productos_catalogo
ALTER TABLE productos_catalogo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver catálogo de tu peña" ON productos_catalogo FOR SELECT USING (is_pena_member(pena_id));
CREATE POLICY "Admin gestiona catálogo" ON productos_catalogo FOR INSERT WITH CHECK (is_pena_admin(pena_id));
CREATE POLICY "Admin edita catálogo" ON productos_catalogo FOR UPDATE USING (is_pena_admin(pena_id));
CREATE POLICY "Admin borra catálogo" ON productos_catalogo FOR DELETE USING (is_pena_admin(pena_id));

-- chat_mensajes
ALTER TABLE chat_mensajes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver chat de tu peña" ON chat_mensajes FOR SELECT USING (is_pena_member(pena_id));
CREATE POLICY "Enviar mensaje al chat" ON chat_mensajes FOR INSERT WITH CHECK (is_pena_member(pena_id));

-- ============================================
-- TRIGGERS Y FUNCIONES
-- ============================================

-- Actualizar updated_at en penas
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_penas_updated_at
  BEFORE UPDATE ON penas FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_asistencias_updated_at
  BEFORE UPDATE ON asistencias FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- FUNCIÓN: Notificar cambios de asistencia al chat
-- ============================================
CREATE OR REPLACE FUNCTION notify_asistencia_change()
RETURNS TRIGGER AS $$
DECLARE
  v_pena_id UUID;
  v_nombre TEXT;
  v_bebida TEXT;
  v_tipo TEXT;
  v_fiesta_nombre TEXT;
  v_mensaje TEXT;
BEGIN
  SELECT up.nombre_completo, up.pena_id
  INTO v_nombre, v_pena_id
  FROM users_penas up WHERE up.id = NEW.user_pena_id;

  SELECT nombre INTO v_fiesta_nombre FROM fiestas WHERE id = NEW.fiesta_id;

  v_tipo := CASE WHEN NEW.tipo = 'semana_completa' THEN 'la semana completa'
                 ELSE 'días sueltos' END;

  v_bebida := CASE WHEN NEW.bebida IS NOT NULL AND NEW.bebida != 'nada' THEN ' (bebida: ' || NEW.bebida || ')'
                   ELSE '' END;

  IF TG_OP = 'INSERT' THEN
    v_mensaje := v_nombre || ' se ha inscrito para ' || v_fiesta_nombre || ' (' || v_tipo || ')' || v_bebida;
  ELSIF TG_OP = 'UPDATE' THEN
    v_mensaje := v_nombre || ' ha modificado su inscripción en ' || v_fiesta_nombre || ' (' || v_tipo || ')' || v_bebida;
  ELSIF TG_OP = 'DELETE' THEN
    v_mensaje := v_nombre || ' ha cancelado su inscripción en ' || v_fiesta_nombre;
  END IF;

  INSERT INTO chat_mensajes (pena_id, user_pena_id, mensaje, tipo)
  VALUES (v_pena_id, NULL, v_mensaje, 'sistema');

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_asistencia_chat_insert
  AFTER INSERT ON asistencias FOR EACH ROW EXECUTE FUNCTION notify_asistencia_change();

CREATE TRIGGER trg_asistencia_chat_update
  AFTER UPDATE ON asistencias FOR EACH ROW EXECUTE FUNCTION notify_asistencia_change();

CREATE TRIGGER trg_asistencia_chat_delete
  AFTER DELETE ON asistencias FOR EACH ROW EXECUTE FUNCTION notify_asistencia_change();

-- ============================================
-- FUNCIÓN: Notificar gastos al chat
-- ============================================
CREATE OR REPLACE FUNCTION notify_gasto_chat()
RETURNS TRIGGER AS $$
DECLARE
  v_nombre TEXT;
  v_mensaje TEXT;
BEGIN
  SELECT nombre_completo INTO v_nombre FROM users_penas WHERE id = NEW.creado_por;

  IF NEW.tipo = 'bote_comun' THEN
    v_mensaje := v_nombre || ' ha registrado un gasto del bote: ' || NEW.concepto || ' (' || NEW.importe || '€)';
  ELSE
    v_mensaje := v_nombre || ' ha registrado un adelanto personal: ' || NEW.concepto || ' (' || NEW.importe || '€)';
  END IF;

  INSERT INTO chat_mensajes (pena_id, user_pena_id, mensaje, tipo)
  VALUES (NEW.pena_id, NULL, v_mensaje, 'sistema');

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_gasto_chat
  AFTER INSERT ON gastos FOR EACH ROW EXECUTE FUNCTION notify_gasto_chat();

-- ============================================
-- FUNCIÓN: Auto-marcar semana completa si >=3 días sueltos
-- (Se implementará en la lógica de aplicación, pero dejamos
--  la constraint preparada)
-- ============================================

-- ============================================
-- STORAGE BUCKET: Escudos de peñas
-- ============================================
-- NOTA: Ejecutar esto desde el dashboard de Supabase o vía SQL:
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('escudos', 'escudos', true);
--
-- CREATE POLICY "Escudos públicos" ON storage.objects
--   FOR SELECT USING (bucket_id = 'escudos');
-- CREATE POLICY "Admin sube escudo" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'escudos' AND auth.role() = 'authenticated');

-- ============================================
-- REALTIME: Habilitar para chat
-- ============================================
-- NOTA: Ejecutar desde el dashboard de Supabase:
-- ALTER PUBLICATION supabase_realtime ADD TABLE chat_mensajes;

