---
name: trunkjs-responsive
description: Verwende @trunkjs/responsive für breakpoint-gesteuerte Klassen und Styles. Nutze Runtime Arbitrary Values in eckigen Klammern nur für seltene, bewusst element-spezifische Sonderfälle.
---

# TrunkJS Responsive

Bevorzuge vorhandene semantic oder utility classes und kombiniere sie mit der bestehenden Breakpoint-Syntax. Nutze keine eigenen Resize Listener oder einzelnen CSS `@media` rules, wenn `@trunkjs/responsive` das Verhalten ausdrücken kann.

```html
<div class="-md:d-none md-xl:d-block.shadow xl:d-flex"></div>
```

Arbitrary Values wie `width-[100%]` oder `md:text-size-[22px]` werden vollständig on the fly im Browser in CSS rules übersetzt. Sie sind eine Escape Hatch und dürfen nicht anstelle eines wiederverwendbaren Design Tokens oder einer gemeinsamen Klasse verwendet werden.

```html
<tj-responsive layer="trunkjs.utilities">
  <div class="width-[100%]:md:width-[50%]"></div>
</tj-responsive>
```

Mit `layer` werden die generierten Regeln unter dem angegebenen CSS cascade layer angelegt. Es findet keine Vorkompilierung statt.

Lies vor der Verwendung von Arbitrary Values die technische Referenz unter [`.ai-usage-info.md`](../../.ai-usage-info.md). Dort stehen die unterstützten Utilities, Sicherheitsgrenzen und die vollständige Syntax.
