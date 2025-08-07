import { describe, it, beforeEach, afterEach } from "vitest";
import { expect } from "vitest";
import { JSDOM } from "jsdom";
import { vi } from "vitest";
import {TjResponsive} from "./responsive";

describe("TjResponsive", () => {
    let jsdom: JSDOM;
    let document: Document;
    let window: Window;
    let responsive: TjResponsive;

    beforeEach(() => {
        jsdom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, {
            url: "http://localhost"
        });
        document = jsdom.window.document;
        Object.setPrototypeOf(document, Document.prototype); // Ensure document is a Document

      window = jsdom.window as any;
        (globalThis as any).window = window;
        (globalThis as any).document = document;
        (globalThis as any).config = { breakpoints: { xs: 0, sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1400 } };

        responsive = new TjResponsive();
    });

    it("should adjust classes based on breakpoints", () => {
        const div = document.createElement("div");
        Object.setPrototypeOf(div, HTMLElement.prototype); // Ensure div is an HTMLElement

        div.className = "-xl:d-none xl:d-block";
        document.body.appendChild(div);

        vi.spyOn(window, "innerWidth", "get").mockReturnValue(1300);
        responsive.adjust(div);

        expect(div.className).toContain("d-block");
        expect(div.className).not.toContain("d-none");
    });

    it("should adjust inline styles based on breakpoints", () => {
        const div = document.createElement("div");
        Object.setPrototypeOf(div, HTMLElement.prototype); // Ensure div is an HTMLElement

        div.setAttribute("style", "display:none");
        div.setAttribute("xl-style", "display:block;color:red");
        document.body.appendChild(div);

        vi.spyOn(window, "innerWidth", "get").mockReturnValue(1300);
        responsive.adjust(document);

        expect(div.getAttribute("style")).toContain("display:block");
        expect(div.getAttribute("style")).toContain("color:red");
    });

    it("should store and restore original classes and styles", () => {
        const div = document.createElement("div");
        Object.setPrototypeOf(div, HTMLElement.prototype); // Ensure div is an HTMLElement

        div.className = "original-class -xl:d-none xl:d-block";
        div.setAttribute("style", "background:blue");
        div.setAttribute("xl-style", "display:block;color:red");
        document.body.appendChild(div);

        vi.spyOn(window, "innerWidth", "get").mockReturnValue(1300);
        responsive.adjust(document);
        expect(div.className).toContain("d-block");
        expect(div.className).toContain("original-class");
        expect(div.getAttribute("style")).toContain("display:block");
        expect(div.getAttribute("style")).toContain("color:red");

        vi.spyOn(window, "innerWidth", "get").mockReturnValue(500);
        responsive.adjust(document);
        expect(div.className).toContain("original-class");
        expect(div.className).not.toContain("d-block");
        expect(div.getAttribute("style")).toContain("background:blue");
    });

    it("should correctly handle between ranges for classes", () => {
        const div = document.createElement("div");
        Object.setPrototypeOf(div, HTMLElement.prototype); // Ensure div is an HTMLElement

        div.className = "lg-xxl:text-red";
        document.body.appendChild(div);

        vi.spyOn(window, "innerWidth", "get").mockReturnValue(1000);
        responsive.adjust(document);
        expect(div.className).toContain("text-red");

        vi.spyOn(window, "innerWidth", "get").mockReturnValue(500);
        responsive.adjust(document);
        expect(div.className).not.toContain("text-red");
    });

    it("should observe mutations and adjust dynamically", () => {
        const div = document.createElement("div");

        Object.setPrototypeOf(div, HTMLElement.prototype); // Ensure div is an HTMLElement

        document.body.appendChild(div);

        responsive.observe(document);

        vi.spyOn(window, "innerWidth", "get").mockReturnValue(1300);

        div.className = "-xl:d-none xl:d-block";
        document.body.appendChild(div);
        responsive.adjust(document);

        expect(div.className).toContain("d-block");
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });
});
