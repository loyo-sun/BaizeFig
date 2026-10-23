export function figmaClipboardBytes(html:string):Uint8Array|null {
 const match=html.match(/<!--\(figma\)([\s\S]*?)\(\/figma\)-->/);
 if(!match)return null;
 const value=match[1].replace(/\s/g,'');
 if(value.length>90*1024*1024)throw Error('剪贴板设计过大');
 const binary=atob(value);const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
 if(new TextDecoder().decode(bytes.slice(0,8))!=='fig-kiwi')throw Error('不支持的 Figma 剪贴板格式');
 return bytes;
}
export function clipboardPlainText(html:string):string {
 const parsed=new DOMParser().parseFromString(html,'text/html');
 parsed.querySelectorAll('script,style,iframe,object').forEach(n=>n.remove());
 parsed.querySelectorAll('br').forEach(n=>n.replaceWith('\n'));
 parsed.querySelectorAll('p,div,li').forEach(n=>n.append('\n'));
 return parsed.body.textContent?.trim()||'';
}
