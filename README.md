# BitLab

Web para resolver conversiones entre bases numéricas y tablas de verdad,
con el proceso completo mostrado paso a paso. Sitio 100% estático
(HTML + CSS + JS puro), sin backend ni build: se puede abrir `index.html`
directamente o subirlo tal cual a cualquier hosting.

## Estructura

```
bitlab/
├── index.html       → estructura de la página (tabs: conversor, tabla de verdad, acerca)
├── style.css         → identidad visual (tema oscuro estilo circuito/terminal)
├── converters.js      → lógica de conversión de bases (fácil de ampliar)
├── logic.js          → parser y evaluador de expresiones lógicas
├── app.js            → cablea la interfaz con la lógica
├── assets/
│   └── favicon.ico   → ícono de la pestaña
└── vercel.json        → config mínima para Vercel
```

## Conversiones incluidas

- Binario → Decimal / Decimal → Binario
- Decimal → Hexadecimal / Hexadecimal → Decimal
- Decimal → Octal / Octal → Decimal
- Binario ↔ Hexadecimal, Binario ↔ Octal (usando el decimal como puente, mostrando ambos pasos)

Las conversiones "hacia decimal" se muestran como expansión posicional
(dígito × base^posición). Las conversiones "desde decimal" se muestran
como divisiones sucesivas en escalerita, leyendo los restos de abajo
hacia arriba — igual a como se resuelve a mano.

## Tabla de verdad

Acepta expresiones con paréntesis, cualquier cantidad de variables (hasta 6)
y los operadores NOT, AND, OR, XOR, → (implica) y ↔ (doble implicación),
en varias notaciones (`!`, `¬`, `~`; `&`, `∧`, `*`; `|`, `∨`, `+`; palabras
en español/inglés también funcionan: AND, OR, NOT, IMPLICA, SII).

La tabla muestra una columna por cada subexpresión, en el orden en que se
resuelve (de adentro hacia afuera), terminando en la expresión completa
resaltada.

## Cómo agregar una conversión o herramienta nueva

- **Nueva base numérica**: agregá una entrada al objeto `CONVERSION_MODES`
  en `converters.js` y un botón `<button class="chip" data-mode="...">`
  en `index.html`. El resto (formulario, render) ya es genérico.
- **Nueva herramienta** (mapas de Karnaugh, IEEE 754, código Gray, etc.):
  agregá un nuevo `<section class="panel">` en `index.html`, su pestaña
  en `.tabs`, y un archivo JS propio. `app.js` ya tiene el patrón de
  cableado de tabs que podés reusar.

## Desplegar en Vercel

### Opción A — Sin usar la terminal (recomendada para la primera vez)

1. Subí esta carpeta a un repositorio de GitHub (podés arrastrar los
   archivos directamente desde github.com → "Add file" → "Upload files").
2. Entrá a [vercel.com](https://vercel.com) e iniciá sesión con tu cuenta
   de GitHub.
3. Click en **Add New… → Project**, elegí el repositorio de BitLab.
4. Vercel detecta que es un sitio estático (Framework Preset: *Other*).
   No hace falta tocar nada más: dejá el **Build Command** vacío y el
   **Output Directory** en `.` (raíz).
5. Click en **Deploy**. En menos de un minuto te da una URL tipo
   `bitlab.vercel.app` que ya podés usar en la facultad.

### Opción B — Con la CLI de Vercel

```bash
npm install -g vercel   # una sola vez
cd bitlab
vercel                  # sigue las preguntas (crea el proyecto)
vercel --prod           # publica la versión definitiva
```

No se necesita ninguna variable de entorno ni configuración adicional:
`vercel.json` ya está incluido para servir todos los archivos tal cual.
