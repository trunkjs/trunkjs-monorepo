export enum PeekType {
    /**
     * Include the match in the result
     * This will position the index after the match
     */
    Include,

    /**
     * Exclude the match from the result
     * This will position the index after the match
     */
    Exclude,

    /**
     * Peek without consuming the match
     * Index stays at the start of the match
        */
    Peek
}

export type PrimitiveResult = {
    value: string;
    delimiter: string | null;
    isMultiline?: boolean;
}

 type LanguageConfig = {
    booleanLiterals?: string[];
    numberPattern?: string;
    stringDelimiters?: string[];
    escapeCharacter?: string;
}


const htmlPrimitive: LanguageConfig = {
    stringDelimiters: ['"', "'"],
}

export class TokenReader2 {

    private _string: string = "";
    private _index: number = 0;
    private _curLine: number = 0;
    private _curColumn: number = 0;

    /**
     * Returns the rest of the string from the current index.
     */
    public get rest(): string {
        return this._string.substring(this._index);
    }

    constructor(string: string) {
        this._string = string;
    }

    public get curLine(): number {
        return this._curLine;
    }

    public get curColumn(): number {
        return this._curColumn;
    }

    public get index(): number {
        return this._index;
    }
    public get string(): string {
        return this._string;
    }



    public get length(): number {
        return this._string.length;
    }
    public isEnd(): boolean {
        return this._index >= this._string.length;
    }
    public hasMore(): boolean {
        return this._index < this._string.length;
    }


    public readWhiteSpace(): string {
        let input = this._string.substring(this._index);
        const match = input.match(/^\s*/);
        if (!match || match.index === undefined) {
            return "";
        }
        const result = match[0];
        this._index += result.length;
        return result;
    }



    private buildRegex(peek: string | string[] | RegExp, fromStart = false): RegExp {
        if (peek instanceof RegExp) {
            return peek;
        } else {
            let pattern = Array.isArray(peek)
                ? "(" + peek.map(str => this.escapeRegExp(str)).join('|') + ")"
                : this.escapeRegExp(peek);
            if (fromStart)
                pattern = '^' + pattern;
            return new RegExp(pattern, 's');
        }
    }



    public peek (peek : number | string | string[] | RegExp) : string | null {
        if (Number.isInteger(peek)) {
            // Return next peek chars
            return this._string.substring(this._index, this._index + (peek as number));
        }
        let regex = this.buildRegex(peek as string | string[] | RegExp, true); // From Start

        let input = this.rest;
        const match = input.match(regex);
        if ( ! match || match.index === undefined)
            return null;
        const result = match[0];
        return result;
    }

    private escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }

    /**
     * Will read until the first occurrence of the peek string or regex.
     *
     * Will set the pointer to the position after the match (if type is Exclude or Include) or before the match (if type is Peek).
     *
     * @param peek
     * @param type
     */
    public readUntil(peek : string | string[] | RegExp, type : PeekType = PeekType.Exclude) : { content: string; match: string | null }
    {
        let input = this._string.substring(this._index);

        let result = "";
        let regex = this.buildRegex(peek);

        const match = input.match(regex);
        if (!match || match.index === undefined) {
            this._index += input.length;
            return { content: input, match: null };
        }
        result = input.slice(0, match.index);
        this._index += match.index;
        if (type === PeekType.Include) {
            result += match[0];
            this._index += match[0].length; // Position after the match and include it
        } else if (type === PeekType.Exclude) {
            this._index += match[0].length; // Position after the match
        } else if (type === PeekType.Peek) {
            // Postition before the match
        }
        return {
            content: result,
            match: match[0]
        };
    }


    private triggerError(expected : string | string[], found: string, postion : number, message : string = ''): never {
        if (!Array.isArray(expected)) {
            expected = [expected];
        }
        throw new Error(`Error at position ${postion}: Expected "${expected.join(", ")}", found "${found}". ${message}`);
    }

    public readPrimitive(options: LanguageConfig = htmlPrimitive): PrimitiveResult {
        const delimiters = options.stringDelimiters ?? [];
        const escapeChar  = options.escapeCharacter;
        const startChar = this.peek(1);

        // Ensure we start with a valid delimiter
        if (!startChar || !delimiters.includes(startChar)) {
            this.triggerError(delimiters, startChar ?? "<end of input>", this._index, "No valid string delimiter found");
        }

        // Consume opening delimiter
        this.read(1);

        let valueBuffer = "";
        while (this.hasMore()) {
            const ch = this.read(1);

            // Handle escape character
            if (escapeChar && ch === escapeChar) {
                if (!this.hasMore()) {
                    this.triggerError(escapeChar, "<end of string>", this._index, "Escape character at end of string");
                }
                // Consume next character literally
                valueBuffer += this.read(1);
                continue;
            }

            // Handle closing delimiter
            if (ch === startChar) {
                return {
                    value: valueBuffer,
                    delimiter: startChar,
                    isMultiline: valueBuffer.includes("\n")
                };
            }

            // Regular character
            valueBuffer += ch;
        }

        // If loop exited, no closing delimiter found
        this.triggerError(startChar, "<end of string>", this._index, "End of string reached without closing delimiter");
    }


    public read(num  = 1) {
        let input = this._string.substring(this._index);
        if (input.length < num) {
            num = input.length;
        }
        const result = input.slice(0, num);
        this._index += num;
        return result;
    }
}
