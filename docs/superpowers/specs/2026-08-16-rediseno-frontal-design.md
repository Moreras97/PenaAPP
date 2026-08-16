# Peña App v2 — Rediseño del frontal

Fecha: 2026-08-16
Estado: aprobado (diseño), pendiente de plan de implementación

## Contexto y problema

La Peña App funciona correctamente (backend Supabase + server actions OK, verificado en
producción), pero el frontal actual es difícil de usar para personas que no conocen la app:

- **Copy técnico en minúsculas** ("asistencia", "finanzas", "cambiar de peña", "bote común").
- **7 módulos en grid sin explicación** — el usuario no sabe qué hace cada uno ni por dónde empezar.
- **Doble navegación** (top bar desktop + bottom nav móvil) + selector de fiestas + botones
  admin mezclados en la cabecera.
- **Concepto peña ↔ fiesta** confuso para quien entra por primera vez.
- **Sin flujo guiado**: un miembro normal ve controles de admin que no le sirven.

## Objetivo

Rehacer por completo el frontal de la Peña App priorizando **facilidad de uso y sencillez**:
un usuario nuevo debe entender la app sin explicaciones y sin que la app suponga un problema
para nadie. El backend, la base de datos y las server actions se mantienen **intactos**; solo
cambia la capa visual (páginas, componentes, navegación y textos).

## Decisiones de alcance (confirmadas con el usuario)

| Decisión | Valor |
|---|---|
| Identidad visual | **Diseño limpio y moderno** (abandono del neobrutalism pesado) |
| Backend / rutas | **Intacto**: mismas rutas, mismas server actions, mismo modelo de datos |
| Usuario objetivo | **Miembro normal primero** (apuntarse, comida, gastos, chat) |
| Estructura de la fiesta | **Home guiada por tareas** (checklist) |
| Gestión de peñas / admin | **Perfil limpio + admin oculto** (solo admin/mods ven Configuración) |
| Principio rector | Facilidad de uso: que la app **nunca suponga un problema** para el usuario |

## 1. Sistema de diseño

- **Tokens en `src/app/globals.css`**: se reemplazan los tokens neobrutalism actuales
  (`--border-color`, `--bg-page`, etc.) por una paleta limpia:
  - Fondo neutro claro (blanco/gris muy claro).
  - Un color primario (verde/teal suave) para acciones y estados; acentos suaves
    (warning, danger, success).
  - Radios moderados (8–12px), sombras suaves y difusas, sin bordes de 2px.
  - Tipografía del sistema (`system-ui`), tamaños legibles, **texto en español con
    mayúsculas normales**.
- **Accesibilidad**: foco visible, contraste AA, `lang="es"`, jerarquía de headings correcta
  (cada página con su `h1`).
- **Componentes UI reutilizables** en `src/components/ui/`:
  - `Button` (variants: primary, secondary/outline, ghost, danger; sizes sm/md/lg).
  - `Card`, `Badge`, `Spinner`, `EmptyState`, `PageHeader`, `Modal`, `BottomSheet` (móvil),
    `Input`, `Select`, `Textarea`, `Label`, `ConfirmDialog`.
  - Todos con `aria-*` correctos y comportamiento accesible.

## 2. Cabecera y navegación

- **Header global limpio**: escudo + nombre de peña + nombre de fiesta actual (breadcrumb).
  A la derecha **solo el avatar** → menú de perfil desplegable con:
  - Cambiar de peña (si hay más de una).
  - Crear peña / Unirme a una peña.
  - Salir de la peña.
  - Cerrar sesión.
- **Tabs de fiesta** (nombres claros):
  - Inicio · ¿Vengo? · Comida · Gastos · Charlar · La compra · Presupuesto
  - **Configuración**: solo visible para admin/mods.
- **Móvil**: bottom nav con 4-5 acciones principales (Inicio, ¿Vengo?, Comida, Gastos,
  Charlar) + botón "Más" para el resto (La compra, Presupuesto, Configuración).
- **Selector de fiestas**: se simplifica; la fiesta activa se elige desde Inicio o desde el
  menú de perfil, sin duplicar botones en la cabecera.

## 3. Home guiada por tareas (portada de fiesta)

La portada de la fiesta (`/fiesta/[id]`) deja de ser un grid de módulos y pasa a ser un
**flujo guiado**:

- **Hero**: nombre de la fiesta, fechas, estado (Abierta / Finalizada).
- **Tarjeta protagonista "¿Vas a venir?"** con botón grande **"Me apunto"** (y estado actual
  del usuario: apuntado con qué bebida).
- **Checklist de pasos** (cada uno enlaza a su módulo y se marca según datos reales):
  1. ¿Me apunto? → `¿Vengo?`
  2. ¿Qué se come? → `Comida`
  3. ¿He aportado dinero? → `Gastos`
  4. ¿Qué hay que comprar? → `La compra`
- **Accesos secundarios**: Charlar, Gastos, La compra.
- **Estados vacíos amigables**: si no hay fiesta todavía, mensaje claro
  ("Todavía no hay fiesta. Pídele al organizador que la cree.").

## 4. Módulos — lenguaje claro

| Ruta actual | Nombre actual | Nuevo nombre |
|---|---|---|
| `asistencia` | Asistencia | **¿Vengo?** |
| `chat` | Chat | **Charlar** |
| `finanzas` | Finanzas | **Gastos** |
| `propuestas` | Propuestas | **Comida** |
| `calculadora` | Calculadora | **Presupuesto** |
| `lista-compra` | Lista de compra | **La compra** |
| `admin` | Admin | **Configuración** (solo admin/mods) |

Cada módulo se reescribe con el nuevo sistema de diseño, **copy claro en español** y
explicación breve en la cabecera de lo que hace y cuándo usarlo:

- **¿Vengo?**: opciones claras (fiesta completa / días sueltos / bebida) con textos
  descriptivos, no jerga técnica.
- **Gastos**: distingue "Dinero de la peña" vs "Dinero personal" con explicaciones sencillas.
- **Comida**: tipo comida/cena con hora y apuntarse a cocinar, sin ambigüedad.
- **La compra**: lista generada, con cantidades y coste estimado, claramente explicado.
- **Presupuesto**: catálogo + cálculo con auto-relleno, sin términos confusos.
- **Configuración**: solo para admin/mods: fiestas, miembros, aprobaciones,
  personalización y consumo.

## 5. Onboarding

- **Primer acceso sin sesión**: pantalla de login limpia (Google) con copy claro.
- **Sin peña todavía**: pantalla de bienvenida con dos acciones grandes:
  "Crear una peña" / "Unirme con un ID".
- **Primeros pasos**: tras el primer login o al crear la peña, guía breve de qué hacer
  (crear la primera fiesta, invitar con el ID).

## 6. Verificación y despliegue

- **QA con Playwright** (subagente `qa`): flujos de login, portada de fiesta, ¿Vengo?,
  Gastos, Comida; comprobar 0 errores de consola y responsive (375/768/1280px).
- **Review de UX/UI** (subagente `ui-ux-review`) contra local y producción.
- **Despliegue local**: `npx next build` + `rc-service pena-app restart`.
- **Despliegue producción**: `git push` → Vercel auto-deploy.
- **Backend intacto**: no se tocan migraciones ni server actions salvo que el rediseño
  lo requiera estrictamente (evitar).

## No-goals

- No se cambian rutas de la app ni el modelo de datos.
- No se toca auth ni Supabase.
- No se añaden funcionalidades nuevas (solo reordenar/renombrar lo existente para claridad).
