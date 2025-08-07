import {TokenReader} from "../tool/TokenReader";


export type KramdownElement = {
    valueType: "attribute" | "class" | "id";
    value?: string;
    key?: string;
}

export type ParseKramdownResult = {
    elements: KramdownElement[];
    errors: string[];
    kramdown_length: number;
}

export function parse_kramdown(input : string) {
    const tr = new TokenReader(input);
    const result: ParseKramdownResult = {
        elements: [],
        errors: [],
        kramdown_length: 0,
    };
    if ( ! tr.readExpression(["{:"])) {
        throw new Error("parse_kramdown: expected string starting with '{:' - found " + input);
    }

    while ( ! tr.isEOF()) {
        tr.skipWhitespace();
        switch (tr.peek()) {
            case "}":
                tr.readChar();
                result.kramdown_length = tr.index;
                return result;
            case "#":
            case ".":
                tr.readChar();
                const idOrClass = tr.readWord(/[a-z0-9_\-:]+/i);
                if (idOrClass) {
                    result.elements.push({

                        valueType: tr.peek() === "#" ? "id" : "class",
                        value: idOrClass,
                    });
                } else {
                    result.errors.push("parse_kramdown: expected class/id - found " + tr.peek());
                    return result;
                }
                break;

            default:
                let attrName = tr.readWord(/[a-z0-9_\-:]+/i);
                let attrValue = undefined;
                if (attrName) {
                    if (tr.peek() === "=") {
                        tr.readChar();
                        attrValue = tr.readValue(/(\s|})/)?.value_str

                    }
                    result.elements.push({
                        valueType: "attribute",
                        value: attrValue,
                        key: attrName,
                    })
                }

        }
    }
    result.errors.push("parse_kramdown: expected '}' - found EOF");
    result.kramdown_length = tr.index;
    return result;


}
