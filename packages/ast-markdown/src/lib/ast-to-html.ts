import { InlineMarkdownElement } from './parse-inline-markdown';
import { KramdownElement } from './parse-kramdown';
import { MarkdownBlockElement } from './types';

/**
 * Build a plain attribute-map from a block’s kramdown information.
 * Unknown / duplicate keys are concatenated as Jekyll does.
 */
function buildAttributes(element: MarkdownBlockElement): Record<string, string> {
  const ret: Record<string, string> = {};
  for (const curAttr of element.kramdown ?? []) {
    if (curAttr.valueType === 'id') {
      ret['id'] = curAttr.value ?? '';
      continue;
    }

    if (curAttr.valueType === 'class') {
      if (!ret['class']) ret['class'] = curAttr.value!;
      else ret['class'] += ' ' + curAttr.value;
      continue;
    }

    if (!ret[curAttr.key!]) ret[curAttr.key!] = curAttr.value ?? '';
    else ret[curAttr.key!] += ' ' + (curAttr.value ?? '');
  }
  return ret;
}

/**
 * Build attribute-map for inline-elements (link / img) based on kramdown.
 */
function buildInlineAttributes(kram: KramdownElement[] | null | undefined): Record<string, string> {
  const ret: Record<string, string> = {};
  for (const curAttr of kram ?? []) {
    if (curAttr.valueType === 'id') {
      ret['id'] = curAttr.value ?? '';
      continue;
    }

    if (curAttr.valueType === 'class') {
      if (!ret['class']) ret['class'] = curAttr.value ?? '';
      else ret['class'] += ' ' + curAttr.value;
      continue;
    }

    if (curAttr.valueType === 'attribute') {
      if (!ret[curAttr.key!]) ret[curAttr.key!] = curAttr.value ?? '';
      else ret[curAttr.key!] += ' ' + (curAttr.value ?? '');
    }
  }
  return ret;
}

/**
 * Helper – sets all attributes from the provided map on a HTMLElement.
 */
function applyAttributes(el: HTMLElement, attrs: Record<string, string>) {
  for (const k in attrs) el.setAttribute(k, attrs[k]);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

function slugifyHeading(html: string): string {
  return stripHtml(html)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Converts an InlineMarkdownElement[] to plain HTML.
 * Only implements the subset required by the accompanying unit-tests.
 */
function inlineToHtml(nodes: InlineMarkdownElement[] = []): string {
  const attrsToString = (map: Record<string, string>): string =>
    Object.keys(map)
      .map((k) => ` ${k}="${map[k]}"`)
      .join('');

  let out = '';
  for (const n of nodes) {
    switch (n.type) {
      case 'text':
        out += n.content as string;
        break;
      case 'html':
        out += `<${n.content}>`;
        break;
      case 'link': {
        const attrs = buildInlineAttributes(n.kramdown);
        attrs['href'] = n.href ?? '';
        out += `<a${attrsToString(attrs)}>${inlineToHtml(n.content as InlineMarkdownElement[])}</a>`;
        break;
      }
      case 'image': {
        const attrs = buildInlineAttributes(n.kramdown);
        attrs['src'] = n.href ?? '';
        attrs['alt'] = stripHtml(inlineToHtml(n.content as InlineMarkdownElement[]));
        out += `<img${attrsToString(attrs)}>`;
        break;
      }
      default:
        // unsupported inline type → ignore
        break;
    }
  }
  return out;
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  List helpers                                                             */
/* ──────────────────────────────────────────────────────────────────────────── */

function renderList(root: InlineMarkdownElement): HTMLElement {
  const tag = root.type === 'o-list' ? 'ol' : 'ul';
  const listEl = document.createElement(tag);

  const items = root.content as InlineMarkdownElement[];
  for (const item of items) {
    if (item.type !== 'list-item') continue;

    const li = document.createElement('li');
    const children = item.content as InlineMarkdownElement[];

    // Separate inline content from potential nested list(s)
    const inline: InlineMarkdownElement[] = [];
    for (const child of children) {
      if (child.type === 'u-list' || child.type === 'o-list') {
        if (inline.length) {
          li.insertAdjacentHTML('beforeend', inlineToHtml(inline));
          inline.length = 0;
        }
        li.appendChild(renderList(child));
      } else {
        inline.push(child);
      }
    }
    if (inline.length) li.insertAdjacentHTML('beforeend', inlineToHtml(inline));

    listEl.appendChild(li);
  }
  return listEl;
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Table helpers                                                            */
/* ──────────────────────────────────────────────────────────────────────────── */

function renderTable(block: MarkdownBlockElement): HTMLTableElement {
  const table = document.createElement('table');
  const attrs = buildAttributes(block);
  applyAttributes(table, attrs);

  const children = block.children as InlineMarkdownElement[];

  // Helpers to keep track of column count
  let columnCount = 0;

  const makeRow = (rowCells: InlineMarkdownElement[], cellTag: 'td' | 'th'): HTMLTableRowElement => {
    const tr = document.createElement('tr');
    rowCells.forEach((cell) => {
      const td = document.createElement(cellTag);
      td.innerHTML = inlineToHtml(cell.content as InlineMarkdownElement[]);
      tr.appendChild(td);
    });
    return tr;
  };

  for (const part of children) {
    if (part.type === 'table-head') {
      const thead = document.createElement('thead');
      const row = makeRow(part.content as InlineMarkdownElement[], 'th');
      columnCount = (part.content as InlineMarkdownElement[]).length;
      thead.appendChild(row);
      table.appendChild(thead);
    }

    if (part.type === 'table-body') {
      const tbody = document.createElement('tbody');
      const cells = part.content as InlineMarkdownElement[];

      if (columnCount === 0 && cells.length) {
        // derive column count from first body row
        columnCount = cells.length;
      }

      for (let i = 0; i < cells.length; i += columnCount || 1) {
        const slice = cells.slice(i, i + columnCount || undefined);
        tbody.appendChild(makeRow(slice, 'td'));
      }
      table.appendChild(tbody);
    }
  }
  return table;
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Main renderer                                                            */
/* ──────────────────────────────────────────────────────────────────────────── */

export function astToHtml(input: MarkdownBlockElement[]): HTMLDivElement {
  const fragment = document.createElement('div') as HTMLDivElement;

  for (const block of input) {
    switch (block.type) {
      /* ──────────────────────────────── Headings ──────────────────────────────── */
      case 'heading': {
        const level = block.heading_level ?? 1;
        const h = document.createElement('h' + level);
        const attrs = buildAttributes(block);
        const html = inlineToHtml(block.children);

        if (!attrs['id']) {
          const slug = slugifyHeading(html);
          if (slug !== '') attrs['id'] = slug;
        }

        applyAttributes(h, attrs);
        h.innerHTML = html;
        fragment.appendChild(h);
        break;
      }

      /* ─────────────────────────────── Horizontal Rule ───────────────────────────── */
      case 'hr': {
        const hr = document.createElement('hr');
        applyAttributes(hr, buildAttributes(block));
        fragment.appendChild(hr);
        break;
      }

      /* ─────────────────────────────── Paragraphs ─────────────────────────────── */
      case 'paragraph': {
        const p = document.createElement('p');
        applyAttributes(p, buildAttributes(block));

        if (block.children && block.children.length) {
          p.innerHTML = inlineToHtml(block.children);
        }
        fragment.appendChild(p);
        break;
      }

      /* ───────────────────────────────── Lists ────────────────────────────────── */
      case 'list': {
        const lists = block.children as InlineMarkdownElement[];
        if (!lists || lists.length === 0) break;

        for (const root of lists) {
          if (root.type !== 'u-list' && root.type !== 'o-list') continue;
          const listEl = renderList(root);
          applyAttributes(listEl, buildAttributes(block));
          fragment.appendChild(listEl);
        }
        break;
      }

      /* ──────────────────────────────── Tables ───────────────────────────────── */
      case 'table': {
        const tableEl = renderTable(block);
        fragment.appendChild(tableEl);
        break;
      }

      /* ───────────────────────────── Code blocks ─────────────────────────────── */
      case 'code': {
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        applyAttributes(pre, buildAttributes(block));
        code.textContent = block.children![0].content as string;
        if (block.children?.[0].lang) {
          code.setAttribute('class', `language-${block.children[0].lang}`);
        }
        pre.appendChild(code);
        fragment.appendChild(pre);
        break;
      }

      /* ───────────────────────────── Block quotes ────────────────────────────── */
      case 'quote': {
        const bq = document.createElement('blockquote');
        const p = document.createElement('p');
        applyAttributes(bq, buildAttributes(block));

        if (block.children && block.children.length) {
          p.innerHTML = inlineToHtml(block.children);
        }
        bq.appendChild(p);
        fragment.appendChild(bq);
        break;
      }

      /* ─────────────────────────────── Raw HTML ──────────────────────────────── */
      case 'html': {
        const tmp = document.createElement('div');
        tmp.innerHTML = block.children![0].content as string;
        for (const child of Array.from(tmp.childNodes)) {
          fragment.appendChild(child);
        }
        break;
      }

      case 'comment': {
        fragment.appendChild(document.createComment(block.children![0].content as string));
        break;
      }

      /* ────────────── Whitespace / unknown – fallback to <p> ─────────────────── */
      default: {
        const p = document.createElement('p');
        applyAttributes(p, buildAttributes(block));
        if (block.children && block.children.length) {
          p.innerHTML = inlineToHtml(block.children);
        }
        fragment.appendChild(p);
      }
    }
    // Append Whitespace to the dom

    fragment.appendChild(document.createTextNode((block.post_whitespace ?? '') + '\n\n'));
  }

  return fragment;
}
