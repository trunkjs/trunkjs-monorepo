import {MarkdownBlockElement} from "./types";
import {parse_markdown_blocks} from "./parse-markdown-blocks";
import {parse_inline_markdown} from "./parse-inline-markdown";
import {astToHtml} from "./ast-to-html";


export class MarkdownDocument {

    private _ast : MarkdownBlockElement[] = [];



    set markdown(value: string) {
        this._ast = parse_markdown_blocks(value);
        console.log("Parsed Markdown AST:", this._ast);
    }

    public getHTML() : HTMLDivElement {
        const html = astToHtml(this._ast);
        return html;
    }
}
