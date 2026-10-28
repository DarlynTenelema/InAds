# InAds — Plataforma de Adquisición para Indie Devs & Micro-Influencers

Plataforma que conecta a micro-influencers (1,000 a 10,000 seguidores) con desarrolladores de videojuegos y aplicaciones independientes, permitiendo a los creadores monetizar su audiencia mediante recomendaciones reales y a los desarrolladores adquirir usuarios retenidos a un costo por adquisición (CPA) accesible y transparente.

---

## 1. Modelo de Negocio & Flujo Financiero

* **Costo por Usuario Verificado:** \$0.15 USD pagados por el desarrollador.
* **Ganancia del Influencer:** \$0.10 USD por cada usuario válido y verificado.
* **Comisión de la Plataforma (InAds):** \$0.05 USD por conversión completada.
* **Sistema de Fondos Prepagados (Escrow):**
  1. El desarrollador recarga saldo previo en su campaña (mínimo sugerido: \$15 - \$30 USD).
  2. Cada vez que un usuario referido cumple los requisitos de validación, se descuenta del saldo del desarrollador y se acredita al saldo del influencer.
  3. Si el saldo de la app llega a \$0, la campaña pasa automáticamente a estado *Pausada* en el catálogo público.
* **Condiciones de Retiro (Payouts):**
  * Umbral mínimo de retiro para influencers: **\$100.00 USD** (monto seguro que evita pérdidas por comisiones bancarias o de pasarela).
  * Modalidad MVP: **Procesamiento Manual.** El administrador realiza las transferencias y valida las recargas sin depender de APIs complejas como Stripe Atlas.
  * Métodos de cobro/pago soportados: PayPal, Transferencia bancaria o Cripto (USDT).

---

## 2. Flujo Operativo del Sistema

```
[Influencer] 
   └── Selecciona App en InAds -> Obtiene Código único y Pitch de recomendación.
   └── Publica en sus redes (TikTok, Shorts, Twitch, Reels, etc.).

[Seguidor / Jugador]
   └── Descarga la App -> Ingresa el código del influencer dentro del juego.

[Indie Game / App]
   └── Llama a la API de InAds (código + ID de usuario/dispositivo).
   └── InAds registra la conversión en estado "Pendiente".

[Validación de Actividad / Antifraude]
   └── El juego reporta actividad (ej. 7 días de actividad o 3 sesiones en días distintos).
   └── InAds cambia el estado a "Verificado", descuenta del Dev y acredita al Influencer.
```

---

## 3. Política Antifraude & Criterio de Usuario Verificado

Para evitar bots, emuladores y registros falsos:
1. **Identificador de Dispositivo (`device_id_hash`):** Solo se permite un canje de código por dispositivo/instalación.
2. **Criterio de Validación:**
   * **Estado Pendiente:** El usuario ingresó el código en el juego.
   * **Estado Verificado:** El usuario mantiene actividad mínima (ejemplo: al menos 3 sesiones en días distintos dentro de un lapso de 7 a 15 días, o alcanzar un nivel/evento base).
3. **Detección de Anomalías:** Si un código recibe más de 50 registros desde la misma subred IP en 1 hora, el sistema congela temporalmente la acreditación para revisión manual.

---

## 4. Integración Técnica para Desarrolladores (API REST Mínima)

El desarrollador solo necesita integrar 2 llamadas HTTP simples:

### A. Registro de Código Canjeado
* **Endpoint:** `POST https://api.inads.io/v1/referrals/claim`
* **Headers:** `Authorization: Bearer <DEV_API_KEY>`
* **Body:**
  ```json
  {
    "referral_code": "CARLOS_GAMING",
    "player_id": "usr_98127391",
    "device_hash": "a1b2c3d4e5f6g7h8"
  }
  ```
* **Respuesta:** `{ "status": "success", "message": "Code registered as pending" }`

### B. Notificación de Actividad / Cumplimiento
* **Endpoint:** `POST https://api.inads.io/v1/referrals/verify`
* **Headers:** `Authorization: Bearer <DEV_API_KEY>`
* **Body:**
  ```json
  {
    "player_id": "usr_98127391",
    "event": "retention_confirmed"
  }
  ```
* **Respuesta:** `{ "status": "verified", "reward_applied": true }`

---

## 5. Arquitectura de Pantallas del MVP (5 Pantallas Clave)

### 1. Autenticación & Selección de Rol (`/auth`)
* Login con Google OAuth.
* Selección de perfil inicial:
  * **Soy Creador / Influencer** (quiere monetizar su comunidad).
  * **Soy Desarrollador / Empresa** (quiere promocionar su juego o app).

### 2. Dashboard (`/dashboard`)
* **Vista Influencer:**
  * Tarjetas de métricas: Saldo disponible, Saldo pendiente de validación, Total ganado histórico.
  * Gráfico de conversiones (diario, semanal, mensual).
  * Lista de actividad reciente (usuarios referidos y estado: Pendiente / Verificado).
* **Vista Desarrollador:**
  * Métricas: Saldo de campaña restante, usuarios totales adquiridos, tasa de retención.
  * Switch rápido para Pausar / Activar campañas.

### 3. Catálogo & Gestión de Apps (`/apps`)
* **Vista Influencer (Explorar):**
  * Grid de tarjetas de apps disponibles con presupuesto activo.
  * Modal de detalle de App:
    * Enlace de descarga.
    * Recompensa (\$0.10 por usuario verificado).
    * Botón "Copiar mi Código".
    * **Kit de Promoción / Pitch:** Frases clave sugeridas, mecánicas destacadas y ganchos que el creador puede decir en su video.
* **Vista Desarrollador (Mis Apps):**
  * Botón **"+ Publicar Nueva App"**:
    * Nombre, descripción, categoría, link en tiendas (Google Play, Steam, App Store, Web).
    * Guion o sugerencias para los creadores.
  * Visualización y regeneración de su **API Key** para la integración técnica.

### 4. Billetera & Finanzas (`/wallet`)
* **Influencer:**
  * Barra de progreso hacia la meta: `Saldo acumulado / $100.00 USD`.
  * Formulario de configuración de cobro (correo PayPal, CLABE/CBU o wallet USDT).
  * Botón **"Solicitar Retiro"** (se activa automáticamente al llegar a $100 USD).
  * Historial de solicitudes con estados claros:
    * `Pendiente de revisión` (creada por el influencer).
    * `En proceso` (el admin la está transfiriendo).
    * `Pagado` (con comprobante o ID de transacción adjunto por el admin).
* **Desarrollador:**
  * Saldo actual de campaña disponible.
  * Instrucciones de pago manual: Datos de cuenta PayPal / bancaria de InAds a donde transferir los fondos.
  * Botón **"Reportar Recarga"**: Formulario simple donde el dev ingresa monto transferido, fecha y sube o pega el comprobante/ID de transacción.
  * Historial de recargas: `En validación por InAds` -> `Aprobado y Acreditado`.

### 5. Configuración & Perfil (`/settings`)
* Datos del usuario (Nombre, Correo, Avatar).
* Vinculación de redes sociales del influencer (TikTok, YouTube, Twitch, Instagram) para verificación de perfil.
* Preferencias de notificaciones por email (cuando se valida una conversión o se agota el saldo).

---

## 6. Módulo Interno de Administración (Manual para MVP)

Para operar sin pasarelas de pago automáticas, se incluye una vista interna de administración (`/admin` protegida para el administrador):
1. **Aprobación de Recargas (Developers):**
   * Listado de comprobantes reportados por desarrolladores.
   * Botón de 1 click para **"Aprobar y Acreditar Saldo"** (actualiza el balance de la app al instante).
2. **Gestión de Retiros (Influencers):**
   * Listado de solicitudes de retiro de \$100 USD.
   * Muestra los datos de pago del influencer (ej. su PayPal).
   * Botón para **"Marcar como Pagado"** ingresando el código/referencia de la transferencia realizada manualmente.
3. **Control Antifraude Rápido:**
   * Alerta si un influencer tiene una tasa anormal de conversiones en poco tiempo para pausar el pago antes de transferir.

---

## 7. Stack Tecnológico & Infraestructura

* **Frontend:**
  * **Framework:** Next.js (React) con Tailwind CSS.
  * **Animaciones & UI:** Framer Motion (para animaciones fluidas, transiciones de entrada y micro-interacciones en la pantalla de login).
  * **Iconografía:** Lucide React.
  * **Hosting:** **Vercel** (CDN global, carga ultrarrápida y despliegues automáticos desde Git).

* **Backend:**
  * **Lenguaje:** **Golang** (alto rendimiento, tipado estricto y mínima latencia para el procesamiento de canje de códigos y métricas).
  * **Hosting:** **Railway** (ejecución continua de la API REST en contenedor Docker con logs en tiempo real).

* **Base de Datos & Autenticación:**
  * **Motor:** **PostgreSQL** administrado a través de **Supabase**.
  * **Auth:** Google OAuth (configurado mediante Google Cloud Console y autenticado vía Supabase / NextAuth).

* **Plataformas de la nube:**
  * **Google Cloud:** Credenciales de OAuth 2.0 y gestión de accesos.
  * **Supabase:** Base de datos SQL, migraciones y almacenamiento de comprobantes de pago.
  * **Railway:** Servidor del backend en Go.
  * **Vercel:** Despliegue de la aplicación web.

---

## 8. Guía de Estilos & UI/UX

* **Modo:** Theme Claro (Light Theme).
* **Paleta de Colores:**
  * **Fondo Principal:** Blanco puro (`#FFFFFF`) con sutiles fondos seccionales en gris frío (`#F8FAFC`).
  * **Azul de Marca / Acentos:** Azul vibrante (`#2563EB` primario, `#1D4ED8` hover/bordes activos) para botones principales, indicadores y titulares de impacto.
  * **Tipografía & Textos:**
    * Títulos grandes: Azul de marca o Negro carbón profundo con alto contraste.
    * Textos comunes / cuerpo: Negro suave (`#0F172A` y `#334155`) garantizando máxima legibilidad.
* **Pantalla de Login (Foco visual principal):**
  * Diseño inmersivo con animaciones en Framer Motion.
  * Efectos sutiles de fondo (glows azulados, tarjetas flotantes animadas con simulaciones de ganancias).
  * Botón interactivo de "Continuar con Google".
* **Vistas Internas (Dashboard, Apps, Wallet, Settings):**
  * Estilo sobrio, limpio y profesional orientado a datos, tablas claras y tarjetas modulares sin distracciones visuales innecesarias.

