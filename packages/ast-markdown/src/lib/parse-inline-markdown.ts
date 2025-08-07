import {KramdownElement, parse_kramdown} from "./parse-kramdown";
import {TokenReader} from "../tool/TokenReader";


export type InlineMarkdownElement = {
    type: 'text' | 'link' | 'image' | 'whitespace' | 'html' | 'list-item' | 'u-list' | 'o-list' | 'table-head' | 'table-body' | 'table-footer' | 'table-cell' | null;
    href?: string | null;
    alt?: string | null;
    lang?: string | null;
    content?: string | InlineMarkdownElement[];
    kramdown?: KramdownElement[] | null;
}


function readLinkOrImageFromCurrentPosition(tr: TokenReader): InlineMarkdownElement {
    let type = tr.readExpression(["[", "!["]);
    if (type === null) {
        return {
            type: "text",
            content: tr.readUntil("]")
        };
    }
    let ret: InlineMarkdownElement = {
        type: null
    };

    ret.type = type === "[" ? "link" : "image";
    ret.content = [];
    if (tr.peekChar() !== "]") {
        let content = readLinkOrImageFromCurrentPosition(tr);
        ret.content = [content];
    }

    tr.readChar();
    if (tr.peekChar() !== "(") {
        // Missing (...)
        return {
            type: "text",
            content: ret.content
        };
    }
    tr.readChar();
    ret.href = tr.readUntil(")");

    tr.readChar();
    if (tr.peek() === "{") {
        let kramdownResult = parse_kramdown(tr.line.substring(tr.index));
        ret.kramdown = kramdownResult.elements;
        tr.index += kramdownResult.kramdown_length;
    }

    return ret;
}





function formatMarkdown(input: string): string {
    return input
        .replace(/(?<!\*)\*\*\*([^\n]+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/(?<!\*)\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
        .replace(/(?<!\*)\*([\s\S]+?)\*/g, '<em>$1</em>')
        .replace(/__([\s\S]+?)__/g, '<strong>$1</strong>')
        .replace(/_([\s\S]+?)_/g, '<em>$1</em>')
        .replace(/`([\s\S]+?)`/g, '<code>$1</code>')
        .replace(/~~([\s\S]+?)~~/g, '<del>$1</del>');
}


export function parse_inline_markdown(input : string) : InlineMarkdownElement[] {
    input = formatMarkdown(input);
    let ret: InlineMarkdownElement[] = [];
    let tr = new TokenReader(input);




    while (tr.more()) {
        const start = tr.readUntilPeek(["[", "!["], true);
        if (start.value !== "") {
            ret.push({
                type: "text",
                content: start.value
            });
        }
        if (start.peek !== false) {
            ret.push(readLinkOrImageFromCurrentPosition(tr));
        }

    }
    return ret;


}
