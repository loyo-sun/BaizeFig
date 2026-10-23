import {expect,it} from 'vitest';
import {figmaClipboardBytes} from '../src/externalClipboard';
it('extracts only a bounded fig-kiwi payload and rejects arbitrary encoded HTML',()=>{
 const bytes=new TextEncoder().encode('fig-kiwi test data');
 const encoded=btoa(String.fromCharCode(...bytes));
 expect(figmaClipboardBytes(`<span data-buffer="<!--(figma)${encoded}(/figma)-->"></span>`)).toEqual(bytes);
 expect(figmaClipboardBytes('<p>hello</p>')).toBeNull();
 expect(()=>figmaClipboardBytes(`<!--(figma)${btoa('<script>bad</script>')}(/figma)-->`)).toThrow('不支持');
});
