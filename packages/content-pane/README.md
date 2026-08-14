# TrunkJS Content-Pane

Das `<tj-content-pane>` Element übernimmt zwei Aufgaben:

1. Es baut aus einer flachen HTML-Struktur (`h1`–`h6`, `p`, `hr`, …) anhand des **Layout-Indexes `i`** eine verschachtelte Section-Struktur auf.
2. Es transformiert die erzeugten Sections anhand ihrer `layout`-Attribute in die gewünschten Layout-Elemente.

## Schritt 1: Baumstruktur aufbauen

### Der Layout-Index `i`

`i` beschreibt die Schachteltiefe einer Section: **kleiner = weiter außen, größer = tiefer verschachtelt**.

Standardmäßig wird `i` aus der Überschrift abgeleitet:

| Element | `i` |
| --- | ---: |
| `h1`, `h2` | `2` |
| `h3` | `3` |
| `h4` | `4` |
| `h5` | `5` |
| `h6` | `6` |
| `hr[layout]` ohne explizites `i` | letzter fester Index + `0.5` |

`h1` wird absichtlich wie `h2` behandelt. Der normale Content-Baum beginnt damit bei `i = 2`.

Ein Element mit größerem `i` wird unter dem vorherigen Element mit kleinerem `i` einsortiert. Ein neues Element auf derselben oder einer kleineren Ebene beendet die vorherige Verschachtelung entsprechend.

```text
i=2
  i=2.5
    i=3
    i=3
  i=3
i=2
```

### Layouts bevorzugt an Überschriften setzen

Layouts sollten standardmäßig direkt an die Überschrift gehängt werden, deren Section sie ersetzen sollen. Dadurch bleibt die semantische Überschriftenstruktur auch in der Layout-Struktur sichtbar.

```html
<h2 layout="page-section">Products</h2>
<h3>Product A</h3>
<h3>Product B</h3>
```

`page-section` liegt hier auf `i = 2`; die beiden `h3`-Sections auf `i = 3` werden darunter verschachtelt.

### Zusätzliche Layout-Ebene mit `<hr>`

Ein `<hr>` wird nur berücksichtigt, wenn es ein `layout`-Attribut besitzt. Ohne expliziten Index erhält es automatisch **den letzten festen Index + `0.5`**.

Damit kann zwischen zwei Überschriftenebenen eine zusätzliche Layout-Ebene eingefügt werden:

```html
<h2>Products</h2>
<hr layout="card-grid">
<h3>Product A</h3>
<h3>Product B</h3>
```

Ergibt konzeptionell:

```text
h2 section      i=2
└─ card-grid    i=2.5
   ├─ h3        i=3
   └─ h3        i=3
```

`hr[layout]` ist daher die bevorzugte Syntax, wenn mehrere nachfolgende Elemente derselben tieferen Ebene gemeinsam in ein zusätzliches Layout gewrappt werden sollen.

### Explizite Ebenen und Varianten

Der optionale Präfix im `layout`-Attribut steuert Index und Verhalten:

```html
<h2 layout="3;card-box">...</h2>
<h3 layout="+3;">...</h3>
<h3 layout="-3;">...</h3>
```

- `i;layout` – neue Section auf dem expliziten Index `i` anlegen.
- `+i;...` – das Element an die bereits vorhandene Section dieser Ebene anhängen, statt eine neue Section anzulegen.
- `-i;...` – für dieses Element keine neue Section anlegen; es bleibt im aktuellen Container.
- ohne explizites `i` – Ebene aus der Überschrift ableiten; bei `hr[layout]` den letzten festen Index + `0.5` verwenden.

Ein Index wie `i = 1` kann für sehr äußere Wrapper, z. B. einen Seitenhintergrund, verwendet werden. Das sollte sparsam eingesetzt werden, da dadurch alle folgenden tieferen Ebenen in diesen Wrapper geraten.

### Übertragen von Attributen

Attribute wie `layout` und mit `section-` geprefixte Attribute werden auf das `<section>` Element übertragen.

Beispiel:

```markdown
## Header 2
{: layout="#id1.class1" section-class="abc"}
```

Wird zu:

```html
<section layout="#id1.class1" class="abc">
    <h2>Header 2</h2>
</section>
```

**Achtung:** In diesem Schritt werden die Tags noch nicht verändert. Dies erfolgt erst im Layout-Schritt.

### Attribute für Section-Elemente setzen

Über `section-<attribut>` können Attribute für das generierte Section-Element gesetzt werden:

```markdown
## Header 2
{: section-id="meine-id" section-style="--cols: 6" section-class="highlight"}
```

### Klassen-Shortcut für Section-Elemente

Alle Klassen des Elements, die mit `section-` beginnen, werden auf das generierte Section-Element übertragen.

## Schritt 2: Apply Layouts

In diesem Schritt werden die `layout`-Attribute ohne Index-Präfix ausgewertet und die Section-Elemente entsprechend umgewandelt.

Beispiel:

```markdown
## Header 2
{: layout="custom-element#id1.class1[slot=slotname]"}
```

entspricht zunächst:

```html
<section layout="custom-element#id1.class1[slot=slotname]">
    <h2>Header 2</h2>
</section>
```

und wird durch `applyLayout()` zu:

```html
<custom-element class="class1" id="id1" slot="slotname">
    <h2>Header 2</h2>
</custom-element>
```

### Verschachtelte Layouts

Layout-Elemente können darunterliegende Elemente verändern, z. B. durch:

- automatisches Zuweisen von `slot`-Attributen
- automatisches Zuweisen von `layout`-Attributen

#### Nutzung des `SubLayoutApplyMixin()`

Das `SubLayoutApplyMixin()` kann genutzt werden, um verschachtelte Layouts zu realisieren. Es analysiert nach dem `update()` die Slot-Elemente im Shadow-DOM. Selektiert werden Slot-Elemente mit `data-query` Attribut.

Beispiel:

```javascript
class CustomElement extends SubLayoutApplyMixin(LitElement) {
    // ...
    render() {
        return html`
            <slot data-query=":scope > h2,h3,h4" name="header"></slot>
            <slot data-query=":scope > section" data-set-attribute-layout="nte-card"></slot>
        `;
    }
}
```

##### `data-query`

`data-query` kann einen oder mehrere durch `|` getrennte CSS-Selektoren enthalten. Das erste Element, das gefunden wird, wird verwendet.
