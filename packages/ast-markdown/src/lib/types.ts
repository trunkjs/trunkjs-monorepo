import {KramdownElement} from "./parse-kramdown";
import {InlineMarkdownElement} from "./parse-inline-markdown";





export type MarkdownBlockElement = {
    type: "paragraph" | "heading" | "list" | "code" | "quote" | "link" | "image" | "table" | "html" | "whitespace" | "comment" | null;
    heading_level?: number;
    pre_whitespace?: string;
    post_whitespace?: string;
    kramdown?: null | KramdownElement[];

    /**
     * @internal Only used for debugging purposes
     */
    content_raw?: string;
    start_line?: number;
    children?: InlineMarkdownElement[];
}

