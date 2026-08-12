## Fix: Onboarding arranca desde cualquier entrada

El commit anterior (435872b, mergeado en PR #120) **no incluía** la corrección completa: el `GuideManager.maybeStart()` seguía comprobando `route === onboarding.route && tab === onboarding.tab` (líneas 694-703), lo que limitaba el arranque del onboarding a solo cuando se entraba por **Ganadería > Zonas**.

La validación en dispositivo real (Xiaomi) pasó porque el APK de prueba se construyó desde el directorio de trabajo local, que **sí tenía** la corrección (quita el filtro route/tab). El commit pusheado a GitHub no la incluía.

### Cambio
Quita la comprobación de `route` y `tab` para que el onboarding prioritario en finca vacía arranque desde **cualquier punto de entrada** (ExPro, CoMer, Inicio, etc.). Las `launch functions` de la guía ya navegan al módulo/pestaña adecuado en cada paso.

```diff
- if (onboarding && !visto(onboarding) && route === onboarding.route && tab === onboarding.tab && await _checkDisponible(onboarding)) {
+ if (onboarding && !visto(onboarding) && await _checkDisponible(onboarding)) {
```

### Validación
- ✅ Entrada directa ExPro (`#/explotacion`) en finca vacía → arranca onboarding
- ✅ Entrada directa CoMer (`#/comercializacion`) en finca vacía → arranca onboarding  
- ✅ Eager-load: `GuideRegistry.getAll()` incluye onboarding tras arranque en Inicio