import unicodedata, sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
MARKS={0x300,0x301,0x302,0x30C,0x306,0x30B}
K=0.6
def patch(src,w,out,k=K):
    f=TTFont(src)
    if 'fvar' in f: f=instancer.instantiateVariableFont(f,{'wght':w})
    glyf=f['glyf']; cmap=f.getBestCmap(); n=0; done=set()
    for cp,g in cmap.items():
        ch=chr(cp); d=unicodedata.normalize('NFD',ch)
        if len(d)<2 or not d[0].islower() or not any(ord(c) in MARKS for c in d[1:]) or g in done: continue
        gl=glyf[g]
        if gl.isComposite() or gl.numberOfContours<=0: continue
        coords=gl.coordinates; ends=gl.endPtsOfContours; s=0; changed=False
        for e in ends:
            ys=[coords[i][1] for i in range(s,e+1)]
            lo,hi=min(ys),max(ys)
            if lo>=430 and hi-lo>=150:
                for i in range(s,e+1):
                    x,y=coords[i]; coords[i]=(x, round(lo+(y-lo)*k))
                changed=True
            s=e+1
        if changed:
            gl.recalcBounds(glyf); n+=1; done.add(g)
    f.flavor='woff2'; f.save(out); return n
if __name__=='__main__':
    import os
    os.makedirs('out',exist_ok=True)
    for st,w in [('up',400),('up',500),('up',600),('it',400)]:
        for sub in ('latin','latin-ext'):
            n=patch(f'{st}-{sub}.woff2',w,f'out/cormorant-garamond-{"italic" if st=="it" else "normal"}-{w}-{sub}.woff2')
            print(st,w,sub,n)
