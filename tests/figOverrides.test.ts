import {expect,it} from 'vitest';
import {mergeFigOverride} from '../src/figOverrides';
it('uses authoritative coordinates only for invalid derived calculations',()=>{
 const base={size:{x:213,y:52},transform:{m00:1,m01:0,m02:48,m10:0,m11:1,m12:16}}, warnings=new Set<string>();
 const bad={size:{x:NaN,y:36},transform:{...base.transform,m02:NaN,m12:Infinity}};
 expect(mergeFigOverride(base,bad,true,warnings)).toEqual({size:{x:213,y:36},transform:base.transform});
 expect(warnings.size).toBe(1);
 expect(base.size.y).toBe(52);
 expect(Number.isNaN(mergeFigOverride(base,bad,false,new Set()).size.x)).toBe(true);
 expect(Number.isNaN(mergeFigOverride({},bad,true,new Set()).size.x)).toBe(true);
});
