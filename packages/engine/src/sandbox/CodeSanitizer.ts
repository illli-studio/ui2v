/**
 * CodeSanitizer
 * 将 AI 生成的 JavaScript 代码清洗为可安全执行的格式。
 * 统一管理所有字符规范化、语法修复和 ESM→CJS 转译规则。
 */

export class CodeSanitizer {
    /**
     * 主入口：对 AI 生成代码执行全量清洗
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
     * 1. Unicode 规范化
     *    - 删除零宽字符、BOM
     *    - 规范化全角标点
     *    - 规范化中文引号、Markdown 代码块标记
     */
    private static normalizeUnicode(code: string): string {
        return code
            .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ')  // 零宽字符/BOM → 空格
            .replace(/[\u2028\u2029]/g, '\n')               // Unicode 行段分隔符 → 换行
            .replace(/[\u201C\u201D]/g, '"')                // 中文双引号 → ASCII 双引号
            .replace(/[\u2018\u2019]/g, "'")                // 中文单引号 → ASCII 单引号
            .replace(/\u3002/g, '.')                        // 句号 → 点
            .replace(/\uff1b/g, ';')                        // 全角分号 → 半角
            .replace(/\uff0c/g, ',')                        // 全角逗号 → 半角
            .replace(/```(?:javascript|js|json)?/gi, '')    // Markdown 代码块开始
            .replace(/```/g, '');                           // Markdown 代码块结束
    }

    /**
     * 2. 修复单引号字符串内被错误转义的双引号
     *    AI 有时生成: { text: '(\"hello\")' }
     *    应该是:      { text: '("hello")' }
     */
    private static fixEscapedQuotes(code: string): string {
        return code.replace(/'([^']*)'/g, (match, content) => {
            const fixed = content.replace(/\\"/g, '"');
            return `'${fixed}'`;
        });
    }

    /**
     * 2.1 修复常见字体赋值引号错误
     *    例：
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
     * 3. 基础 ESM → CJS 转译
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
     * 4. 将 ctx.roundRect(x,y,w,h,[r1,r2,r3,r4]) 中的数组半径
     *    转换为单值形式，取数组第一个元素
     *    AI 常见错误：ctx.roundRect(0,0,100,50,[20,20,0,0])
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
     * 5. 给 Math.floor(progress * x.length) 添加 Math.max(0,...) 保护
     *    防止 progress 为负数时返回负数导致 slice 异常
     */
    private static fixProgressCharCount(code: string): string {
        return code.replace(
            /Math\.floor\s*\(\s*progress\s*\*\s*([^)]+\.length)\s*\)/g,
            (match, lengthExpr) => `Math.floor(Math.max(0, progress * ${lengthExpr}))`
        );
    }

    /**
     * 检查代码是否包含可能不可用的字体并发出警告
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
