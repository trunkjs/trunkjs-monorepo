# TrunkJS Content-Pane

Das `<tj-content-pane>` Element übernimmt zwei Aufgaben: 

- Scritt 1: Es baut aus einer flachen HTML Struktur (H1-6, p, hr etc) eine Baumstruktur auf.
- Scritt 2: Es ändert die tag-Names und Attribute der Elemente basierend auf den `layout` Attributen.


## Schritt 1: Baumstruktur aufbauen

Basierend auf dem `I`-Index baut die Komponente z.B. aus einer serverseitig
generierten flachen HTML Struktur eine Baumstruktur auf

| Element                | I-Index         |
|------------------------|-----------------|
| H1,H2                  | 2               |
| H3                     | 3               |
| H4                     | 4               |
| H5                     | 5               |
| H6                     | 6               |
| hr mit layout-attribut | letzter I + 0.5 |

Dabei werden Element wie folgt verschachtelt:

```text
i1
    i2
       i2.5
            i3
            i3
    i2
        i3
        i4
        i3
```

### Übertragen von Attributen

Attribute wie 'layout' und mit 'section-' geprefixte Attribute werden auf das `<section>` Element übertragen.

Beispiel:

```markdown
## Header 2
{: layout="#id1.class1" section-class="abc"}
````

Wird zu:

```html
<section layout="#id1.class1" class="abc">
    <h2>Header 2</h2>
</section>
```

***Achtung: In diesem Schritt werden die Tags noch nicht verändert!*** Dies erfolgt erst im Layout-Schritt.

### Benutzerdefiniert I-Layer

Über das `layout` Attribut kann ein benutzerdefinierter I-Layer definiert werden.

Beispiel:

```markdown
## Header 2
{: layout="3;"}
```
Dies würde das Element in den I-Layer 3 verschieben.

### Das HR-Element

Standardmäßig wird ein `<hr>` nicht behandelt, außer es hat ein layout-Attribut.

Wenn kein dedizierter I-Layer angegeben ist, wird der I-Layer des vorherigen Elements + 0.5 verwendet.


## Schritt 2: Apply-Layouts

In diesem Schritt werden die layout-Attribute (ohne I-Layer) ausgewertet und die Elemente entsprechend umgewandelt.

Beispiel:

````markdown
## Header 2
{: layout="custom-element#id1.class1[slot=slotname]"}
````

entpsricht:

```html
<section layout="custom-element#id1.class1[slot=slotname]">
    <h2>Header 2</h2>
</section>
``` 
Wird zu: (*transformiert durch applyLayout()*)

```html
<custom-element class="class1" id="id1" slot="slotname">
    <h2>Header 2</h2>   
</custom-element>
``` 

### Verschachtelte Layouts

z.B. sollen Layout-Elemente die darunterliegenden Elemente verändern:

- Automatisches zuweisen von `slot`-Attributen
- Automatisches zuweisen von layout-Attributen


#### Nutzung des `SubLayoutApplyMixin()`


Das `SubLayoutApplyMixin()` kann genutzt werden, um verschachtelte Layouts zu realisieren.
Es analysiert nach dem update() die slot-Elemente im Shadow-DOM. Selektiert werden Slot-elemente mit `data-query` Attribut.

Beispiel:

```javascript
class CustomElement extends SubLayoutApplyMixin(LitElement) {
    ...
    render() {
        return html`
            <slot data-query=":scope > h2,h3,h4" name="header"></slot>
            <slot data-query=":scope > section" data-set-attribute-layout="nte-card"></slot>
        `;
    }
}
```

##### data-query

Data Query kann ein oder Mehrere durch `|` getrennte CSS-Selektoren enthalten. Das erste Element,
das gefunden wird, wird verwendet.