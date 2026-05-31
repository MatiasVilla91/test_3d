# Seismic Array — Sismógrafo Global 3D

Visualizador interactivo de actividad sísmica global en tiempo real, con vientos atmosféricos y un modelo de inteligencia artificial para estimación de riesgo sísmico. Todo funciona en el navegador sin servidor backend.

---

## Características

| Módulo | Descripción |
|---|---|
| **Globo 3D** | Planeta con textura real, inclinación axial 23.5°, rotación automática, 1800 estrellas, anillos orbitales, graticule radar con ecuador destacado |
| **Sismos en tiempo real** | Datos del catálogo USGS · hasta 5000 eventos · filtro por magnitud y período |
| **Alertas push** | Notificación del navegador cuando ocurre un sismo por encima de la magnitud configurada, verificando cada 5 minutos |
| **Vientos globales** | Flechas vectoriales en el globo con datos en tiempo real de Open-Meteo (77 puntos de grilla) |
| **Riesgo sísmico · IA** | Mapa de calor de probabilidad de M≥5.0 en los próximos 7 días, calculado con modelo ETAS en el browser o con XGBoost entrenado en Python |

---

## Cómo ejecutar

```bash
npx live-server
```

Abre `http://localhost:8080` en el navegador. No requiere instalación de dependencias de frontend.

---

## Estructura de archivos

```
proyecto-planeta/
├── index.html                  # Estructura HTML: HUD, panel de control, leyendas
├── planeta.js                  # Lógica principal Three.js (módulo ES)
├── style.css                   # Estética radar de nave espacial
├── earth.jpg                   # Textura del planeta
├── train_seismic_model.py      # Pipeline Python: descarga → entrena XGBoost → exporta predicciones
├── requirements_seismic.txt    # Dependencias Python
├── seismic_predictions.json    # (generado) Predicciones del modelo ML
├── usgs_cache.csv              # (generado) Caché del catálogo sísmico
└── README.md                   # Este archivo
```

---

## Modelo de IA sísmico

### Modo browser (siempre disponible)

Al activar el toggle **Riesgo sísmico · IA** en el panel, el sistema calcula en tiempo real la probabilidad de ocurrencia de un sismo M≥5.0 en los próximos 7 días para cada celda de 5°×5°, usando los datos de USGS ya cargados.

El modelo implementa tres leyes sísmicas establecidas combinadas como proceso de Poisson:

#### 1. Estimador de b-value de Aki (1965)

```
b = log₁₀(e) / (M̄ - Mc + 0.05)
```

Donde `M̄` es la magnitud media y `Mc = 2.5` es la magnitud de completitud. Un b-value bajo indica mayor concentración de estrés tectónico.

#### 2. Ley de Omori-Utsu (decaimiento de réplicas)

```
λ_omori = Σ  K · 10^[α(Mᵢ - Mc)] / (t + c)^p
```

Parámetros estándar: `K=0.08`, `α=0.8`, `c=0.001`, `p=1.1`. Suma sobre todos los eventos M≥4.0, donde `t` es el tiempo en días desde cada evento.

#### 3. Extrapolación Gutenberg-Richter + Poisson

```
λ_total = λ_background + λ_omori        (eventos/día sobre Mc)
N_esperados(M≥5, 7d) = λ_total · 7 · 10^[-b · (5.0 - Mc)]
P(al menos 1 evento M≥5) = 1 - e^(-N_esperados)
```

**Referencia científica:** Este enfoque es equivalente al modelo STEP (Short-Term Earthquake Probability) del USGS y al modelo ETAS (Epidemic Type Aftershock Sequence) de Ogata (1988).

---

### Modo XGBoost con Python (más preciso, AUC ~0.84–0.87)

El script `train_seismic_model.py` descarga 2 años del catálogo USGS, construye un dataset de entrenamiento con ventana deslizante y entrena un clasificador XGBoost.

#### Instalación

```bash
pip install -r requirements_seismic.txt
```

#### Entrenamiento y exportación

```bash
python train_seismic_model.py
```

El script hace cuatro pasos:

1. **Descarga** el catálogo USGS M≥2.5 en chunks de 90 días (con caché en `usgs_cache.csv`)
2. **Construye features** para cada celda 5°×5° en ventanas de 14 días
3. **Entrena XGBoost** con validación cruzada de 5 pliegues
4. **Exporta** `seismic_predictions.json` — el globo lo carga automáticamente al recargar la página

Al re-ejecutar el script, reutiliza el caché y solo descarga datos nuevos. Se recomienda ejecutarlo semanalmente.

#### Features del modelo

| Feature | Descripción |
|---|---|
| `n_eq_30d` | Cantidad de sismos últimos 30 días |
| `max_mag` | Magnitud máxima |
| `mean_mag` | Magnitud media |
| `b_value` | Estimador MLE de Aki (1965) |
| `mean_depth_km` | Profundidad focal media |
| `days_since_last` | Días desde el último evento |
| `log_energy` | Log₁₀ de la energía sísmica acumulada |
| `rate_trend` | Razón tasa reciente / tasa anterior (aceleración) |
| `n_eq_90d` | Conteo de fondo 90 días |
| `omori_rate` | Contribución Omori de eventos M≥4 |

**Target:** `P(M≥5.0 en los próximos 7 días)` (clasificación binaria)

#### Formato de seismic_predictions.json

```json
{
  "generated": "2026-05-30T12:00:00",
  "model": "xgboost",
  "auc": 0.856,
  "target": "P(M≥5.0 in next 7 days)",
  "n_cells": 724,
  "predictions": [
    {
      "lat": -37.5,
      "lng": -72.5,
      "risk": 0.74,
      "n_recent": 38,
      "max_mag": 5.8,
      "b_value": 0.87
    }
  ]
}
```

El browser detecta automáticamente si el archivo existe. Si no existe, usa el modelo ETAS calculado en el browser. El panel muestra la fuente activa (`XGBoost AUC 0.856` o `ETAS · tiempo real`).

---

## APIs externas

### USGS Earthquake Hazards Program
- **Endpoint:** `https://earthquake.usgs.gov/fdsnws/event/1/query`
- **Formato:** GeoJSON (browser) / CSV (Python)
- **Sin API key.** Rate limit: no documentado formalmente; el script hace pausas de 0.5s entre chunks.
- **Campos usados:** `time`, `latitude`, `longitude`, `depth`, `mag`, `place`, `id`

### Open-Meteo
- **Endpoint:** `https://api.open-meteo.com/v1/forecast`
- **Sin API key.** Soporta hasta 1000 ubicaciones por request.
- **Campos usados:** `wind_speed_10m`, `wind_direction_10m` (corriente a 10m de altura)
- **Grilla de muestreo:** 77 puntos cada 30° de lat/lng entre ±75°/±165°

---

## Arquitectura Three.js

### Jerarquía de la escena

```
scene
├── AmbientLight
├── DirectionalLight (sol)
├── atmosphere (SphereGeometry r=3.18, verde semitransparente)
├── stars (Points, 1800 puntos)
├── ring × 3 (Line, anillos orbitales a r=4.4, 6.2, 8.5)
└── planet (Mesh, r=3, escala (1, 0.96, 1), rotación.z = 23.5°)
    ├── graticule × N (Line, hijos del planeta → rotan con él)
    │   └── ecuador (color distinto, opacidad 0.55)
    ├── markers[] (SphereGeometry × sismo, escalan con zoom)
    ├── windArrows[] (ArrowHelper × punto de grilla)
    └── riskMeshes[] (CircleGeometry × celda de riesgo)
```

Todos los hijos del planeta rotan automáticamente con `planet.rotation.y += 0.0015` por frame.

### Conversión de coordenadas geográficas a 3D

```javascript
function latLngAVec3(lat, lng, r = RADIO + 0.06) {
  const phi   = (90 - lat) * (Math.PI / 180);  // colatitud
  const theta = (lng + 180) * (Math.PI / 180); // azimut
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
}
```

El signo negativo en X compensa la orientación de Three.js para que el mapa quede alineado geográficamente correctamente.

### Orientación de flechas de viento

Los vectores de viento se proyectan sobre el plano tangente de la esfera en cada punto. Los vectores tangentes Norte y Este en coordenadas locales son:

```
N = (cos φ · cos θ,  sin φ,  -cos φ · sin θ)
E = (sin θ,           0,      cos θ)
```

La dirección meteorológica indica "desde dónde sopla" → se convierte a "hacia dónde va" sumando 180°:

```javascript
const toRad = ((direction + 180) % 360) * Math.PI / 180;
const dir = N.scale(cos(toRad)).add(E.scale(sin(toRad))).normalize();
```

### Orientación de celdas de riesgo

Cada celda es un `CircleGeometry` que debe quedar tangente a la superficie esférica. Se rota para que su normal local apunte radialmente hacia afuera:

```javascript
mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
```

---

## Limitaciones científicas

La predicción de terremotos es uno de los problemas abiertos más difíciles de la geofísica. Este modelo **no predice sismos específicos** — proporciona estimaciones probabilísticas de actividad sísmica elevada basadas en patrones históricos.

Lo que el modelo puede hacer:
- Identificar zonas con alta tasa de sismicidad reciente
- Cuantificar el efecto de réplicas esperadas después de sismos grandes (Omori)
- Estimar la distribución de magnitudes esperadas (Gutenberg-Richter)
- Aprender patrones espaciotemporales recurrentes (XGBoost)

Lo que el modelo **no puede hacer**:
- Predecir el tiempo exacto, lugar o magnitud de un sismo futuro
- Detectar precursores físicos no observables en catálogos sísmicos
- Capturar toda la física del ciclo sísmico

**Referencias:**
- Aki, K. (1965). Maximum likelihood estimate of b in the formula log N = a − bM. *Bull. Earthquake Res. Inst.*, 43, 237–239.
- Omori, F. (1894). On the aftershocks of earthquakes. *J. Coll. Sci. Imp. Univ. Tokyo*, 7, 111–200.
- Ogata, Y. (1988). Statistical models for earthquake occurrences. *JASA*, 83(401), 9–27.
- DeVries, P. et al. (2018). Deep learning of aftershock patterns following large earthquakes. *Nature*, 560, 632–634.

---

## Paleta de colores del globo

| Elemento | Color hex | Rol |
|---|---|---|
| Fondo | `#000805` | Negro con tinte verde muy sutil |
| Verde primario | `#00ff88` | Títulos, valores activos |
| Verde dim | `#005533` | Labels, texto secundario |
| Graticule | `#00ff44` op 0.11 | Grilla latitud/longitud |
| Ecuador | `#00ffaa` op 0.55 | Línea destacada |
| Atmósfera | `#00ff44` op 0.055 | Halo verde |
| Alerta | `#ffaa00` | Notificaciones sísmicas |
| Riesgo bajo | `#003311` | < 15% |
| Riesgo leve | `#66cc00` | 15–30% |
| Riesgo moderado | `#ffdd00` | 30–50% |
| Riesgo alto | `#ff7700` | 50–70% |
| Riesgo crítico | `#ff1111` | > 70% |
