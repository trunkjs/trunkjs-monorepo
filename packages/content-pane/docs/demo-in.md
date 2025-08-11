```markdown
## Header 2

{: layout="#id1.class1"}

This is content below the section element.

### Header 3

{: layout="custom-element.class2" slot="header"}

This is content below the section element.
```

```html
<section class="class1" id="id1">
    <h2>Header 2</h2>
    <p>This is content below the section element.</p>
    <custom-element class="class2">
        <h3 slot="header">Header 3</h3>
        <p>This is content below the section element.</p>
    </custom-element>
</section>
```
