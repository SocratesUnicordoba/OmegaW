# ω · OmegaW

Simulador interactivo de sistemas oscilatorios (Capítulo 4: *Oscillations*). Reúne 18 módulos ejecutables —movimiento armónico simple, péndulo simple y no lineal, osciladores amortiguados y forzados con resonancia, superposición de ondas y figuras de Lissajous, evolución en el espacio de fases y teorema de Liouville, circuitos oscilantes RC y RLC con factor de calidad, análisis de exactitud y estabilidad numérica, y oscilaciones químicas (Brusselator)—, cada uno con su simulación animada, curvas interactivas, panel de ecuaciones y exportación de reportes.

**Autores:** Nicolas de la Espriella Vélez Ph. D., Daniel José Salas Álvarez M. Sc., Pierre Augusto Peña salgado M. Sc.

## Cómo ejecutarlo

No necesita compilación ni dependencias externas. Basta con abrir `index.html` en el navegador.

Para servirlo por HTTP (recomendado, evita restricciones de seguridad en navegadores con `file://`):

```bash
python -m http.server 8000
# y abrir http://localhost:8000
```

## Qué incluye

| Grupo | Módulos | Descripción temático-computacional |
|---|---|---|
| **4.1 Movimiento armónico simple** | P4.1, P4.2, P4.3, P4.4 | Conservación de la energía con Euler, Euler–Cromer, Euler–Richardson y Verlet; teorema del virial; figuras de Lissajous y superposición de ondas (viajeras, estacionarias y batimientos). |
| **4.2 El péndulo** | L4.1–4.2, P4.5 | Implementación de las clases `Pendulum` y `PendulumApp`; aproximación de ángulos pequeños frente a la solución exacta con integrales elípticas completas $K(k)$ y series de potencias. |
| **4.3 Oscilador amortiguado** | P4.6, P4.7 | Regímenes subamortiguado, crítico y sobreamortiguado; envolvente $e^{-\gamma t/2}$ y tiempo de relajación; péndulo no lineal amortiguado con espacio de fases acotado a $(-\pi, \pi]$. |
| **4.4 Respuesta a fuerzas externas** | P4.8, P4.9 | Fuerza periódica $A_0\cos(\omega t)$; separación de régimen transitorio y estacionario; curvas de resonancia y desfasaje; forzamiento no sinusoidal (cuadrada, triangular, pulsos) y filtrado de armónicos por Fourier. |
| **4.4 Espacio de fases** | P4.10, P4.11 | Dinámica de ensambles de $N$ osciladores y $N$ péndulos simultáneos; unicidad de trayectorias; separatriz a $E = 2\omega_0^2$; verificación geométrica del teorema de Liouville (conservación del área del espacio de fases). |
| **4.5 Oscilaciones en circuitos eléctricos** | P4.12, P4.13, P4.14 | Filtros RC en frecuencia (capacitor como pasa-bajos, resistencia como pasa-altos); respuesta temporal a onda cuadrada (carga y descarga exponencial); circuito RLC en resonancia y medición del factor de calidad $Q$. |
| **4.6 Exactitud y estabilidad** | P4.15, P4.16 | Error de truncamiento local y global en $dy/dx = 2x$; determinación del orden numérico mediante ajuste log–log; estabilidad del método de Euler en circuitos RC ($\Delta t < 2\tau$) y divergencia numérica. |
| **4.7 Proyectos** | Proy. 4.17 | Cinética química no lineal del modelo Brusselator; bifurcación de Hopf al variar el parámetro $B$; transición entre punto fijo estable y ciclo límite auto-sostenido. |

### Funciones transversales

- **Soporte bilingüe completo (Español / English):** Conmutador interactivo con banderas en la barra superior que traduce dinámicamente toda la interfaz, etiquetas de control, ecuaciones, leyendas de gráficas y reportes generados.
- **Inicio de sesión de estudiante:** Registro de nombre, materia, carrera (con el listado oficial de pregrados de la Universidad de Córdoba), grupo y cálculo automático del semestre académico según la fecha actual. La sesión se almacena temporalmente y se limpia al cerrar la pestaña.
- **Control de velocidad:** Selector de paso temporal de animación de 0.1× a 2× (cámara lenta a rápida) con sincronización fluida a 60 fps mediante `requestAnimationFrame`.
- **Reportes `.txt` por módulo:** Generación y descarga instantánea de informes que contienen los datos del estudiante, enunciado del problema, parámetros seleccionados, ecuaciones analíticas, resultados calculados y series completas de datos graficados.
- **Evaluación de usabilidad (ISO/IEC 25010:2011):** Instrumento psicométrico de 24 ítems en escala Likert de 5 puntos clasificados en 7 dimensiones de calidad de software (reconocimiento de adecuación, capacidad de aprendizaje, operabilidad, protección frente a errores, estética, accesibilidad y satisfacción), inversión de ítems negativos (Q3, Q6, Q9, Q14) y exportación de informe tabulado con métricas de desempeño.

## Estructura del proyecto

```
index.html          Estructura de la aplicación, formularios modales y barra de navegación
styles.css          Diseño visual responsivo, paleta temática oscura y tipografías Outfit / JetBrains Mono
i18n.js             Diccionario de internacionalización (español e inglés) y textos del instrumento ISO
core.js             Núcleo matemático: interfaz ODE, solucionadores (Euler, Euler-Richardson, RK4, Verlet), motor de trazado 2D/3D en canvas, gestión de sesión, exportación de reportes y modal de evaluación
mod_a.js            Módulos interactivos de las secciones 4.1 a 4.3 (P4.1 a P4.7 y L4.1–4.2)
mod_b.js            Módulos interactivos de las secciones 4.4 a 4.7 (P4.8 a Proy. 4.17)
pruebas/            Suites automatizadas de validación en Node.js (sin dependencias)
  ├── humo.js       Arnés de pruebas de interfaz: ejecuta los 18 módulos y prueba todos sus controles y botones
  └── fisica.js     Validación analítica: verifica integrales elípticas, teorema del virial, Liouville, resonancia, filtros RC/RLC, estabilidad de Euler y umbral de Hopf
```

## Pruebas automatizadas

El proyecto incluye suites de prueba automatizadas para ejecutar con Node.js sin necesidad de instalar paquetes externos (`node_modules`):

```bash
node pruebas/humo.js      # Ejecuta y comprueba los 18 módulos en un entorno DOM/canvas simulado
node pruebas/fisica.js    # Valida numéricamente los principios físicos y resultados teóricos
```

- **`humo.js`**: Monta un entorno virtual simulado (DOM, canvas 2D, listeners y temporizadores) y recorre secuencialmente los 18 módulos registrados, ejecutando sus funciones `run()` y disparando todos sus botones interactivos para certificar la ausencia de excepciones en tiempo de ejecución.
- **`fisica.js`**: Comprueba con tolerancias analíticas estrictas:
  - Crecimiento descontrolado de energía con Euler simple vs conservación acotada en Euler–Cromer y Verlet simplécticos.
  - Teorema del virial en el oscilador armónico ($\langle K \rangle = \langle U \rangle = E/2$).
  - Variación monótona del periodo del péndulo frente a la amplitud comparado contra la integral elíptica $K(k)$.
  - Periodo amortiguado $\omega_1 = \sqrt{\omega_0^2 - \gamma^2/4}$ y cese de oscilaciones para $\gamma \ge 2\omega_0$.
  - Resonancia forzada en amplitud $A(\omega)$ y frecuencia óptima $\omega_{\text{res}} = \sqrt{\omega_0^2 - \gamma^2/2}$.
  - Conservación estricta del área en el espacio de fases por el teorema de Liouville (desviaciones $< 10^{-14}$).
  - Frecuencia de corte y ganancias teóricas en filtros RC, así como la corriente máxima y factor $Q = (\omega_0 L)/R$ en el circuito RLC.
  - Orden 1 en el método de Euler mediante regresión log–log de errores.
  - Criterio de estabilidad numérica de Euler en circuitos RC ($\Delta t < 2\tau$) frente a regímenes inestables ($\Delta t > 2\tau$).
  - Umbral de bifurcación de Hopf en el Brusselator ($B > 1 + A^2$) para el surgimiento del ciclo límite.
