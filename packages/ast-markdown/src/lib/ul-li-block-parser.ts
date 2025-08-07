import { MarkdownBlockElement } from "./types";
import {
    InlineMarkdownElement,
    parse_inline_markdown,
} from "./parse-inline-markdown";

/**
 * Parses a Markdown list block (`content_raw`) into a hierarchical
 * InlineMarkdownElement structure.
 *
 * Supported features (subset of Jekyll / Kramdown behaviour):
 *  • Unordered lists:  “-”, “*”, “+”
 *  • Ordered   lists:  “1.”, “2.”, …
 *  • Arbitrary nesting based on indentation (2-space multiples or tab)
 *  • Each list item’s text is passed through `parse_inline_markdown`
 *
 * Returned tree uses the following element types:
 *  • “u-list”  – unordered list
 *  • “o-list”  – ordered   list
 *  • “list-item”
 *
 * @param block MarkdownBlockElement whose `type` MUST be “list”
 * @returns Array of root-level list InlineMarkdownElements
 */
export function ulLiBlockParser(
    block: MarkdownBlockElement
): InlineMarkdownElement[] {
    if (block.type !== "list") return [];

    // @ts-expect-error – content_raw is always defined for list blocks
    const lines = block.content_raw
        .replace(/\r\n?/g, "\n")
        .split("\n")
        .filter((l) => l.trim() !== "");

    // Root-level lists that will be returned
    const roots: InlineMarkdownElement[] = [];

    // Stack that keeps current list nesting:
    // [{ element: InlineMarkdownElement, indent: number }]
    const stack: { element: InlineMarkdownElement; indent: number }[] = [];

    const listRegex = /^(\s*)([-+*]|(\d+)\.)\s+(.*)$/;

    /**
     * Helper – ensures a list container exists at required depth.
     * Creates new list(s) as required and pushes to stack/parents.
     */
    function ensureListAtDepth(
        depth: number,
        listType: "u-list" | "o-list",
        markerId: string
    ): InlineMarkdownElement {
        // If we're on the same or shallower depth, pop until suitable parent
        while (stack.length > 0) {
            const top = stack[stack.length - 1];

            // Same depth → reuse only if same type & marker
            if (top.indent === depth) {
                if (
                    top.element.type === listType &&
                    (top.element as any).__marker === markerId
                ) {
                    return top.element;
                }
                // Different marker / type – close current list
                stack.pop();
                continue;
            }

            // Deeper than needed → pop
            if (top.indent > depth) {
                stack.pop();
                continue;
            }

            // Shallower – correct parent reached
            break;
        }

        // Need to create a new list
        const newList: InlineMarkdownElement = {
            type: listType,
            content: [],
        };
        // Store marker character on the element so we can distinguish “*” vs “+”
        (newList as any).__marker = markerId;

        if (stack.length === 0) {
            roots.push(newList);
        } else {
            const parentList = stack[stack.length - 1].element;
            // Last pushed item on parent is the list-item; attach nested list to it
            const parentItems = parentList.content as InlineMarkdownElement[];
            if (parentItems.length === 0) {
                // Should not happen – create dummy list-item
                parentItems.push({ type: "list-item", content: [] });
            }
            const lastItem = parentItems[parentItems.length - 1];
            if (!Array.isArray(lastItem.content)) lastItem.content = [];
            (lastItem.content as InlineMarkdownElement[]).push(newList);
        }

        stack.push({ element: newList, indent: depth });
        return newList;
    }

    for (const rawLine of lines) {
        const m = rawLine.match(listRegex);
        if (!m) {
            // Not a list line – treat as plain text inside last list-item
            if (stack.length > 0) {
                const curList = stack[stack.length - 1].element;
                const items = curList.content as InlineMarkdownElement[];
                if (items.length > 0) {
                    const lastItem = items[items.length - 1];
                    if (!Array.isArray(lastItem.content)) lastItem.content = [];
                    (lastItem.content as InlineMarkdownElement[]).push({
                        type: "text",
                        content: rawLine.trim(),
                    });
                }
            }
            continue;
        }

        const indentStr = m[1] || "";
        const marker = m[2];
        const isOrdered = /\d+\./.test(marker);
        const listType: "u-list" | "o-list" = isOrdered ? "o-list" : "u-list";
        const itemText = m[4];

        // For ordered lists we treat all numeric markers equally – use constant id
        const markerId = isOrdered ? "o" : marker;

        // Compute depth: 1 list per 2 spaces (tabs = 4 spaces)
        const indentSpaces =
            indentStr.replace(/\t/g, "    ").length; /* expand tabs */
        const depth = Math.floor(indentSpaces / 2);

        // Get / create list container at desired depth
        const curList = ensureListAtDepth(depth, listType, markerId);

        // Create list-item
        const item: InlineMarkdownElement = {
            type: "list-item",
            content: parse_inline_markdown(itemText),
        };

        (curList.content as InlineMarkdownElement[]).push(item);
    }

    // Once done, return root list(s)
    return roots;
}