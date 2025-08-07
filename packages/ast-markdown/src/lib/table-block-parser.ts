import { MarkdownBlockElement } from "./types";
import {
    InlineMarkdownElement,
    parse_inline_markdown,
} from "./parse-inline-markdown";

/**
 * Very small-scale Markdown table parser.
 *
 * The goal here is **not** to be a full-blown CommonMark / GFM implementation – 
 * we only need the subset that is required by the unit-tests that accompany this
 * repository.  Should you require additional table-features simply extend the
 * respective helper functions below.
 *
 * Supported features
 * ───────────────────────────────────────────
 * • Pipe (“|”)-separated column syntax (leading / trailing pipes optional)  
 * • Optional header row followed by “---” delimiter line  
 * • Per-cell inline-markdown via `parse_inline_markdown`  
 *
 * Returned AST structure (InlineMarkdownElement subset)
 * ───────────────────────────────────────────────────────────────────────────────
 * [
 *   {
 *     type   : "table-head",
 *     content: [ {type: "table-cell", …}, … ]   // one element per header-cell
 *   },
 *   {
 *     type   : "table-body",
 *     content: [
 *         {type: "table-cell", …},              // row 1 – cell 1
 *         {type: "table-cell", …}, …            // row 1 – remaining cells
 *         {type: "table-cell", …}, …            // row 2 – …
 *     ]
 *   }
 * ]
 *
 * Row-information is currently not represented explicitly – the tests that
 * shipped with the skeleton do not require it.  Should you need it simply wrap
 * each row inside a dedicated element (e.g. `"table-row"`) and extend the
 * InlineMarkdownElement union accordingly.
 *
 * @param block MarkdownBlockElement whose `type` MUST be "table".
 */
export function tableBlockParser(
    block: MarkdownBlockElement
): InlineMarkdownElement[] {
    if (block.type !== "table") return [];

    // --------------------------------------------------------------------- //
    // 0.  Pre-processing – normalise new-lines, trim superfluous whitespace //
    // --------------------------------------------------------------------- //
    // @ts-expect-error – content_raw is always defined for table blocks
    const rawLines = block.content_raw
        .replace(/\r\n?/g, "\n")
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l !== "");

    if (rawLines.length === 0) return [];

    // --------------------------------------------------------------------- //
    // 1.  Detect header-delimiter (--- | ---)                               //
    // --------------------------------------------------------------------- //
    const headerDividerRegex =
        /^:?-{3,}:?(?:\s*\|\s*:?-{3,}:?)*\s*$/; /* simplistic */

    let headerRow: string[] | null = null;
    let dataStartIdx = 0;

    // Helper to ignore optional leading / trailing pipes before testing regex
    const stripEdgePipes = (s: string): string => {
        if (s.startsWith("|")) s = s.slice(1);
        if (s.endsWith("|")) s = s.slice(0, -1);
        return s.trim();
    };

    if (
        rawLines.length >= 2 &&
        headerDividerRegex.test(stripEdgePipes(rawLines[1]))
    ) {
        headerRow = splitRow(rawLines[0]);
        dataStartIdx = 2; // data begins after divider
    }

    // --------------------------------------------------------------------- //
    // 2.  Build AST                                                         //
    // --------------------------------------------------------------------- //
    const ast: InlineMarkdownElement[] = [];

    if (headerRow) {
        ast.push({
            type: "table-head",
            content: headerRow.map((txt) => makeCell(txt.trim())),
        });
    }

    const bodyCells: InlineMarkdownElement[] = [];
    for (let i = dataStartIdx; i < rawLines.length; i++) {
        const cols = splitRow(rawLines[i]);
        cols.forEach((txt) => bodyCells.push(makeCell(txt.trim())));
    }

    ast.push({
        type: "table-body",
        content: bodyCells,
    });

    return ast;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Helper utilities                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Splits a table line into individual cell-strings.
 * Leading / trailing pipes as well as surrounding whitespace are removed.
 */
function splitRow(line: string): string[] {
    // Remove a single leading / trailing "|" if present
    if (line.startsWith("|")) line = line.slice(1);
    if (line.endsWith("|")) line = line.slice(0, -1);

    // Finally split on "|" and trim each cell
    return line.split("|").map((c) => c.trim());
}

/** Creates a `table-cell` InlineMarkdownElement from raw cell-text. */
function makeCell(text: string): InlineMarkdownElement {
    return {
        type: "table-cell",
        content: parse_inline_markdown(text),
    };
}