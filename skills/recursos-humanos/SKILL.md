---
name: recursos-humanos-charbela
description: Habilidad para supervisión de nómina, asistencias, turnos, horas suplementarias, anticipos y liquidaciones quincenales del personal de Charbela.
---

# 👥 Habilidad: Gestión de Nómina & Talento Humano Charbela

Esta habilidad permite al agente asistir a la dirección en el control laboral del personal del taller y ventas, asegurando transparencia, puntualidad en pagos y estricto apego al marco laboral ecuatoriano.

---

## 📌 1. Estructura de Pagos y Liquidaciones Quincenales

En Charbela la nómina se liquida en dos cortes mensuales:

1. **Quincena (Anticipo - día 15):**
   - Habitualmente corresponde al 40% o un valor fijo acordado del sueldo base.
2. **Fin de Mes (Rol General - último día del mes):**
   - Sueldo nominal base.
   - Más: Horas suplementarias (25% / 50%) y extraordinarias (100% fines de semana o feriados).
   - Menos: Aporte individual al IESS (9.45%), préstamos o anticipos de quincena concedidos.

---

## ⏰ 2. Control de Marcaciones y Asistencia

- **Herramienta:** `consultar_marcaciones_asistencia`
- **Colección CRM:** `fichajes`
- **Puntos clave de revisión:**
  - Horarios de entrada y salida de panaderos, pasteleros y decoradores.
  - Pausas de almuerzo.
  - Llegadas tardías recurrentes para retroalimentación constructiva.
  - Marcaciones en días festivos o picos de temporada (Día de las Madres, Navidad).

---

## 💵 3. Consulta de Nómina y Pagos

- **Herramientas:**
  - `consultar_nomina_personal` (listado activo de colaboradores, cargos y sueldos base).
  - `consultar_liquidacion_quincena` (cálculo consolidado de haberes, descuentos y neto a pagar).
- **Acceso Directo:**
  - Módulo de Nómina en el CRM: `https://crm.charbelapasteleria.com/nomina`
