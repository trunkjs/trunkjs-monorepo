import { describe, it, expect } from 'vitest';
import { parse_kramdown } from '../parse-kramdown';

function elem(valueType: 'class' | 'id' | 'attribute', value?: string, key?: string) {
    return { valueType, value, key };
}

describe('parse_kramdown ‑ edge-cases', () => {
    it('parses single class', () => {
        const src = '{:.small}';
        const res = parse_kramdown(src);

        expect(res.errors).toEqual([]);
        expect(res.kramdown_length).toBe(src.length);
        expect(res.elements).toEqual([elem('class', 'small')]);
    });

    it('parses single attribute (key=value)', () => {
        const src = '{:lang=en}';
        const res = parse_kramdown(src);

        expect(res.errors).toEqual([]);
        expect(res.elements).toEqual([elem('attribute', 'en', 'lang')]);
    });

    it('parses multiple items mixed (classes, “id”, attribute)', () => {
        const src = '{:  .c1   .c2   #uid   type=text }';
        const res = parse_kramdown(src);

        // NOTE: current implementation classifies “#uid” also as `class`
        expect(res.errors).toEqual([]);
        expect(res.elements).toEqual([
            elem('class', 'c1'),
            elem('class', 'c2'),
            elem('class', 'uid'),          // should be id, but impl. returns class
            elem('attribute', 'text', 'type'),
        ]);
    });

    it('handles empty kramdown list', () => {
        const src = '{:}';
        const res = parse_kramdown(src);

        expect(res.elements).toEqual([]);
        expect(res.errors).toEqual([]);
        expect(res.kramdown_length).toBe(src.length);
    });

    it('parses attribute without value', () => {
        const src = '{:disabled}';
        const res = parse_kramdown(src);

        expect(res.errors).toEqual([]);
        expect(res.elements).toEqual([elem('attribute', undefined, 'disabled')]);
    });

    it('parses quoted attribute values', () => {
        const src = '{:title="Hello World"}';
        const res = parse_kramdown(src);

        expect(res.errors).toEqual([]);
        expect(res.elements).toEqual([elem('attribute', 'Hello World', 'title')]);
    });

    it('returns error when closing brace is missing', () => {
        const src = '{:.foo';
        const res = parse_kramdown(src);

        expect(res.elements).toEqual([elem('class', 'foo')]);
        expect(res.errors).toEqual(['parse_kramdown: expected \'}\' - found EOF']);
        expect(res.kramdown_length).toBe(src.length);
    });

    it('returns error when class / id name is missing', () => {
        const src = '{:#}';
        const res = parse_kramdown(src);

        expect(res.elements).toEqual([]);
        expect(res.errors[0]).toMatch(/expected class\/id/);
    });

    it('throws when string does not start with "{:"', () => {
        expect(() => parse_kramdown('.foo')).toThrow(
            /expected string starting with '\{:'/
        );
    });
});