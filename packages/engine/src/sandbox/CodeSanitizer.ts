/**
 * CodeSanitizer
 */

export class CodeSanitizer {
    /**
     */
    static sanitize(code: string): string {
        let out = code;
        out = this.normalizeUnicode(out);
        out = this.fixEscapedQuotes(out);
        out = this.fixBrokenFontAssignments(out);
        out = this.transpileESM(out);
        out = this.fixRoundRectArrayArgs(out);
        out = this.fixProgressCharCount(out);
        return out;
    }

    /**
     */
    private static normalizeUnicode(code: string): string {
        return code
            .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ')
            .replace(/[\u2028\u2029]/g, '\n')
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/\u3002/g, '.')
            .replace(/\uff1b/g, ';')
            .replace(/\uff0c/g, ',')
            .replace(/```(?:javascript|js|json)?/gi, '')
            .replace(/```/g, '');
    }

    /**
     */
    private static fixEscapedQuotes(code: string): string {
        return code.replace(/'([^']*)'/g, (match, content) => {
            const fixed = content.replace(/\\"/g, '"');
            return `'${fixed}'`;
        });
    }

    /**
     *    ctx.font = 'bold ' + size + 'px 'Segoe UI', sans-serif';
     *    =>
     *    ctx.font = 'bold ' + size + "px 'Segoe UI', sans-serif";
     */
    private static fixBrokenFontAssignments(code: string): string {
        let out = code;

        // Pattern A:
        //   ctx.font = 'bold ' + size + 'px 'Segoe UI', sans-serif';
        out = out.replace(
            /ctx\.font\s*=\s*'([^']*)'\s*\+\s*([^;]+?)\s*\+\s*'px\s*'([^']+)'(?:,\s*([^']+))?';/g,
            (_m, left, mid, family, fallback) => {
                const tail = fallback ? `, ${fallback}` : '';
                return `ctx.font = '${left}' + ${mid} + \"px '${family}'${tail}\";`;
            }
        );

        // Pattern B:
        //   ctx.font = (Math.floor(...)) + 'px 'Segoe UI', sans-serif';
        out = out.replace(
            /ctx\.font\s*=\s*([^;]+?)\s*\+\s*'px\s*'([^']+)'(?:,\s*([^']+))?';/g,
            (_m, sizeExpr, family, fallback) => {
                const tail = fallback ? `, ${fallback}` : '';
                return `ctx.font = ${sizeExpr.trim()} + \"px '${family}'${tail}\";`;
            }
        );

        return out;
    }

    /**
     *    import X from 'Y'       → const X = require('Y')
     *    import { A, B } from 'Y' → const { A, B } = require('Y')
     *    export default X         → exports.default = X
     */
    private static transpileESM(code: string): string {
        return code
            .replace(
                /import\s+(?:(\w+)|\{([\w\s,]+)\})\s+from\s+(['"])([^'"]+)\3;?/g,
                (match, def, named, quote, id) => {
                    if (def) return `const ${def} = require(${quote}${id}${quote});`;
                    if (named) return `const {${named}} = require(${quote}${id}${quote});`;
                    return match;
                }
            )
            .replace(/export\s+default\s+/g, 'exports.default = ');
    }

    /**
     */
    private static fixRoundRectArrayArgs(code: string): string {
        const fixed = code.replace(
            /\.roundRect\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*\[([^\]]+)\]\s*\)/g,
            (match, x, y, w, h, radii) => {
                const firstRadius = radii.split(',')[0].trim();
                return `.roundRect(${x}, ${y}, ${w}, ${h}, ${firstRadius})`;
            }
        );

        // Warn if any array-form roundRect remains (regex couldn't handle it)
        if (/\.roundRect\s*\([^)]*,\s*\[[^\]]+\]\s*\)/.test(fixed)) {
            console.warn('[CodeSanitizer] ⚠️ Array-form roundRect still present after fixup');
        }
        return fixed;
    }

    /**
     */
    private static fixProgressCharCount(code: string): string {
        return code.replace(
            /Math\.floor\s*\(\s*progress\s*\*\s*([^)]+\.length)\s*\)/g,
            (match, lengthExpr) => `Math.floor(Math.max(0, progress * ${lengthExpr}))`
        );
    }

    /**
     */
    static warnMonospaceFont(code: string): void {
        const problematicFonts = ['Fira Code', 'JetBrains Mono', 'Source Code Pro'];
        for (const font of problematicFonts) {
            if (code.includes(font)) {
                console.warn(`[CodeSanitizer] ⚠️ Code uses potentially unavailable font: "${font}". Consider "monospace" instead.`);
            }
        }
    }
}
