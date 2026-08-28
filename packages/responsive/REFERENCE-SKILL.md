---
name: trunkjs-responsive
description: Verwende @trunkjs/responsive für breakpoint-gesteuerte DOM classes, responsive inline styles und seltene Runtime Arbitrary Values. Arbitrary Values sind nur eine Escape Hatch, wenn keine wiederverwendbare Klasse oder kein Design Token passt.
---

# @trunkjs/responsive Reference Skill

Nutze vorhandene wiederverwendbare Klassen mit der Breakpoint-Syntax des Pakets. Lege keine eigenen Resize Listener oder einzelnen CSS `@media` rules an, wenn das Verhalten mit `@trunkjs/responsive` ausgedrückt werden kann.

```html
<div class="card -md:d-none md-xl:d-block.shadow xl:d-flex"></div>
```

Syntax: `-bp:class` = below bp, `bp:class` = from bp, `bp1-bp2:class` = from bp1 until bp2, `bp:a.b` = multiple classes und `base:bp:a:bp2:b` = chained states.

## Runtime Arbitrary Values

Nutze eckige Klammern nur als Ausnahme für seltene, bewusst element-spezifische Werte:

```html
<tj-responsive layer="trunkjs.utilities">
  <div class="width-[100%]:md:width-[50%] md:text-size-[22px]"></div>
</tj-responsive>
```

Die Regeln werden vollständig on the fly im Browser erzeugt und optional unter dem mit `layer` angegebenen CSS cascade layer angelegt. Es findet keine Vorkompilierung statt.

Bevor du eine Klasse mit `[...]` verwendest:

1. Prüfe auf eine vorhandene semantic/utility class.
2. Prüfe, ob ein wiederverwendbares Design Token oder eine gemeinsame Klasse sinnvoller ist.
3. Nutze `style-{bp}` für einen wirklich element-spezifischen Wert.
4. Nutze `[...]` nur, wenn die Klassenschreibweise den Sonderfall klarer ausdrückt.

Wiederholt sich ein Arbitrary Value, soll daraus eine gemeinsame Utility oder ein Token werden. URL values und beliebige CSS property names werden nicht unterstützt.

Lies [`.ai-usage-info.md`](./.ai-usage-info.md) für unterstützte Utilities, aktuelle Breakpoints und weitere Beispiele. Halte beide Dateien synchron.
