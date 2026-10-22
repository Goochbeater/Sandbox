/* =====================================================================
   GFX — GPU-painted ground (cached in tiles), masks, fog, cel helpers
   ===================================================================== */
const GL = { ok: false, tried: false };
const GL_VS = 'attribute vec2 a;varying vec2 vUv;void main(){vUv=a*.5+.5;gl_Position=vec4(a,0.,1.);}';
const GL_FS = `
varying vec2 vUv;
uniform vec2 uOrigin; uniform vec2 uSize; uniform vec2 uWorld;
uniform float uSeed; uniform float uMode; uniform float uPass; uniform float uVoidY;
uniform vec4 uRect; uniform vec3 uArena; uniform sampler2D uMask; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec4 uP;
float hash12(vec2 p){ p+=uSeed; vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec2 hash22(vec2 p){ p+=uSeed; vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973)); p3+=dot(p3,p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
float vn(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash12(i),hash12(i+vec2(1.,0.)),u.x),mix(hash12(i+vec2(0.,1.)),hash12(i+vec2(1.,1.)),u.x),u.y); }
const mat2 RM=mat2(1.6,1.2,-1.2,1.6);
float fbm(vec2 p){ float s=0.,a=.5; for(int i=0;i<5;i++){ s+=a*vn(p); p=RM*p; a*=.5; } return s/.96875; }
float fbm3(vec2 p){ float s=0.,a=.5; for(int i=0;i<3;i++){ s+=a*vn(p); p=RM*p; a*=.5; } return s/.875; }
vec3 vor(vec2 x){ vec2 n=floor(x),f=fract(x),mg=vec2(0.),mr=vec2(0.); float md=8.;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g=vec2(float(i),float(j)); vec2 r=g+hash22(n+g)-f; float d=dot(r,r); if(d<md){md=d;mr=r;mg=g;} }
  md=8.;
  for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ vec2 g=mg+vec2(float(i),float(j)); vec2 r=g+hash22(n+g)-f; if(dot(mr-r,mr-r)>.00001) md=min(md,dot(.5*(mr+r),normalize(r-mr))); }
  return vec3(md,hash12(n+mg),length(mr)); }

void sIron(vec2 p, vec3 mk, out float h, out vec3 c, out vec3 e){
  vec2 q=p*.0032; vec2 w=vec2(fbm3(q+3.1),fbm3(q+7.7));
  float soil=fbm(q*1.6+w*1.8), det=fbm3(p*.045);
  h=soil*.7+det*.16;
  c=mix(vec3(.19,.16,.14),vec3(.37,.32,.28),smoothstep(.28,.8,soil));
  c=mix(c,vec3(.22,.24,.16),smoothstep(.56,.8,fbm3(q*3.+20.))*.55);
  vec3 pv=vor(p/13.); float peb=(1.-smoothstep(.16,.3,pv.z))*step(.9,pv.y)*(1.-mk.r*.7);
  h+=peb*.2*(1.-pv.z*2.5); c=mix(c,vec3(.50,.46,.42)*(.85+.3*pv.y),peb*.8);
  float lf=vn(p*.42+det*3.);
  c=mix(c,vec3(.42,.25,.13)*(.7+.6*hash12(floor(p*.42))),smoothstep(.8,.9,lf)*.5*(1.-mk.r));
  c=mix(c,vec3(.40,.35,.29)*(.85+.3*det),mk.r*.78); h=mix(h,.45+det*.08,mk.r*.7);
  float cf=clamp(smoothstep(.6,.7,fbm3(p*.0011+11.))+mk.g,0.,1.)*(1.-mk.r*.85);
  if(uArena.z>0.){ float r=length(p-uArena.xy); cf=max(cf,(1.-smoothstep(uArena.z*.15,uArena.z*1.02,r))*.9); }
  e=vec3(0.);
  if(cf>.01){
    vec2 wp=p+(vec2(vn(p*.02),vn(p*.02+5.))-.5)*34.;
    vec3 cv=vor(wp/50.); float b=cv.x*50.;
    float core=1.-smoothstep(.7,2.4,b), ch=1.-smoothstep(1.8,10.,b), halo=1.-smoothstep(0.,26.,b);
    float on=cf*(.5+.5*cv.y);
    c=mix(c,vec3(.17,.14,.13)*(.9+.3*cv.y),cf*.6);
    c*=1.-ch*.8*cf; h-=ch*.32*cf;
    e=mix(vec3(1.,.42,.06),vec3(1.,.9,.55),core)*core*on*1.5+vec3(.95,.3,.04)*halo*on*.32;
    c+=e*.22;
  }
}
void sIce(vec2 p, vec3 mk, out float h, out vec3 c, out vec3 e){
  if(uArena.z>0.){ // the frost-king's field: a grey sheet of shattered ice, cracked by his tread
    vec2 d=p-uArena.xy; float r=length(d), an=atan(d.y,d.x);
    vec3 v1=vor(p/330.), v2=vor(p/130.);
    float l1=1.-smoothstep(.0,2./330.,v1.x), l2=(1.-smoothstep(0.,1.4/130.,v2.x))*step(.55,v2.y)*smoothstep(.2,.6,fbm3(p*.003));
    float ray=0.;
    for(int i=0;i<15;i++){ float fi=float(i), th=(fi+hash12(vec2(fi,4.))*.7)/15.*6.2832-3.1416, len=uArena.z*(.35+hash12(vec2(fi,9.))*.9);
      float da=abs(mod(an-th+3.1416,6.2832)-3.1416), dl=r*sin(min(da,1.5));
      ray=max(ray,(1.-smoothstep(.6,2.2,dl))*step(da,1.)*(1.-smoothstep(len*.7,len,r))*smoothstep(20.,60.,r)); }
    float f=fbm(p*.0016), fd=fbm3(p*.018);
    vec3 base=mix(vec3(.31,.35,.40),vec3(.50,.53,.58),f*.9+v1.y*.12)*(.95+.08*fd);
    base=mix(base,base*vec3(.94,.98,1.06),smoothstep(.45,.75,fbm3(p*.005+2.)));
    float sn=smoothstep(.6,.85,fbm(p*.0022+3.)+fd*.12);
    c=mix(base,vec3(.74,.77,.82)*(.94+.08*fd),sn*.7);
    c=mix(c,c*1.18+vec3(.04),(1.-smoothstep(0.,uArena.z*.9,r))*.5);
    vec3 lc=vec3(.80,.85,.90);
    c=mix(c,lc,l1*.62*(1.-sn*.5)); c=mix(c,lc,l2*.38*(1.-sn*.6)); c=mix(c,vec3(.86,.9,.95),ray*.7);
    h=.4-l1*.05-l2*.02-ray*.06+sn*.05+fd*.02; e=vec3(0.);
    return;
  }
  vec2 q=p*.0025; vec2 w=vec2(fbm3(q+1.3),fbm3(q+8.1));
  float dr=fbm(q*1.4+w*2.), rip=fbm3(vec2(p.x*.012+dr*4.,p.y*.035));
  h=dr*.8+rip*.09;
  c=mix(vec3(.78,.84,.91),vec3(.96,.975,.99),smoothstep(.3,.8,dr));
  float rk=smoothstep(.71,.77,fbm3(p*.006+5.))*(1.-mk.r);
  c=mix(c,vec3(.34,.38,.45)*(.8+.4*fbm3(p*.05)),rk); h+=rk*.3;
  c+=step(.9965,hash12(floor(p*.7)))*.3;
  c=mix(c,vec3(.72,.79,.86)*(.92+.16*rip),mk.r*.55); h=mix(h,.42,mk.r*.5);
  e=vec3(0.);
  float rv=mk.g;
  if(uArena.z>0.){ float r=length(p-uArena.xy); rv=max(rv,1.-smoothstep(uArena.z-20.,uArena.z+30.,r)); }
  if(rv>.01){
    vec3 cv=vor(p/76.); float b=cv.x*76.;
    vec3 ic=mix(vec3(.20,.42,.60),vec3(.62,.84,.95),fbm3(p*.007)*.8+cv.y*.25);
    ic=mix(ic,vec3(.93,.98,1.),(1.-smoothstep(.4,1.5,b))*.85);
    ic=mix(ic,vec3(.85,.94,1.),(1.-smoothstep(.0,.6,abs(vn(p*.03)-.5)))*.18);
    ic+=smoothstep(.62,1.,vn(vec2(p.x*.004,p.y*.07)))*.1;
    float k=smoothstep(.25,.6,rv);
    c=mix(c,ic,k); h=mix(h,.15+(1.-smoothstep(.4,1.5,b))*.03,k);
    c=mix(c,vec3(1.),smoothstep(.12,.28,rv)*(1.-smoothstep(.28,.45,rv))*.45);
  }
}
void sSea(vec2 p, vec3 mk, out float h, out vec3 c, out vec3 e){
  if(uArena.z>0.){ // the wyrm's water: one great sheet of floe, cracked, split by a few black leads
    vec2 wp=p+(vec2(fbm3(p*.0016),fbm3(p*.0016+9.))-.5)*120.;
    vec3 v1=vor(wp/420.), v2=vor(p/150.);
    float lead=step(.72,v1.y), gap=lead*mix(14.,40.,fbm3(p*.004)), b=v1.x*420.;
    float floe=smoothstep(gap,gap+2.5,b), lip=(1.-smoothstep(gap+.5,gap+6.,b))*floe*lead;
    float crack=(1.-smoothstep(0.,1.6/420.,v1.x))*(1.-lead)+(1.-smoothstep(0.,1.2/150.,v2.x))*step(.5,v2.y)*.6;
    float f=fbm(p*.0018), fd=fbm3(p*.02);
    vec3 top=mix(vec3(.44,.51,.61),vec3(.60,.67,.76),f*.9+v1.y*.1)*(.95+.07*fd);
    top=mix(top,vec3(.72,.78,.86),smoothstep(.62,.84,fbm(p*.003+4.))*.6);
    top=mix(top,vec3(.80,.86,.93),crack*.5);
    vec3 water=vec3(.08,.11,.17)+vn(vec2(p.x*.02,p.y*.08))*.04;
    c=mix(water,top,floe); c=mix(c,vec3(.84,.9,.96),lip*.85);
    h=.42+fd*.015; e=vec3(0.);
    return;
  }
  vec2 wp=p+(vec2(fbm3(p*.003),fbm3(p*.003+9.))-.5)*40.;
  vec3 cv=vor(wp/150.); float b=cv.x*150.;
  float gap=mix(4.,20.,cv.y)*(1.-smoothstep(.2,.8,mk.r));
  float floe=smoothstep(gap,gap+7.,b);
  float bev=smoothstep(gap,gap+22.,b);
  h=floe*(.35+bev*.3+cv.y*.25)+fbm3(p*.03)*.05*floe;
  float wd=max(gap-b,0.);
  vec3 water=vec3(.035,.06,.09)+vn(vec2(p.x*.04,p.y*.16))*.03;
  water=mix(water,vec3(.10,.26,.33),(1.-smoothstep(0.,12.,wd))*.7*step(1.,gap));
  vec3 top=mix(vec3(.55,.64,.72),vec3(.78,.85,.9),fbm3(p*.01)*.7+cv.y*.3);
  top=mix(top,vec3(.9,.93,.96),smoothstep(.55,.8,fbm(p*.012+cv.y*10.))*.8);
  top=mix(vec3(.36,.47,.57),top,bev);
  c=mix(water,top,floe);
  float pool=smoothstep(.3,.6,mk.g); c=mix(c,water,pool); h=mix(h,0.,pool);
  e=vec3(0.);
}
void sFire(vec2 p, vec3 mk, out float h, out vec3 c, out vec3 e){
  vec3 cv=vor(p/36.); float b=cv.x*36.;
  float plate=smoothstep(.5,4.,b);
  h=plate*(.45+cv.y*.35)+fbm3(p*.04)*.06;
  vec3 bs=mix(vec3(.13,.09,.085),vec3(.26,.18,.16),cv.y*.6+fbm3(p*.02)*.4);
  bs=mix(bs,vec3(.36,.33,.31)*(.8+.3*fbm3(p*.08)),smoothstep(.55,.75,fbm(p*.004+2.))*.65);
  c=mix(vec3(.04,.02,.02),bs,plate);
  c=mix(c,vec3(.19,.14,.13)*(.9+.3*fbm3(p*.03)),mk.r*.7); h=mix(h,.4,mk.r*.6);
  float hot=smoothstep(.55,.75,fbm3(p*.0013+3.))*(1.-mk.r);
  if(uArena.z>0.){ float r=length(p-uArena.xy); hot=max(hot,smoothstep(uArena.z*.7,uArena.z*1.1,r)*.8); }
  float seam=(1.-smoothstep(.3,2.2,b))*(.25+.75*smoothstep(.35,.7,fbm3(p*.006+9.)))*(1.-mk.r*.85);
  e=vec3(1.,.36,.06)*(1.-plate)*hot*1.3+vec3(1.,.42,.08)*seam*.55;
  c+=vec3(.5,.14,.02)*seam*.35;
  float lv=smoothstep(.25,.6,mk.g);
  if(lv>.001){
    vec3 lc=mix(vec3(1.,.36,.05),vec3(1.,.86,.42),fbm(p*.02));
    vec3 cr=vor(p/24.); float cb=cr.x*24.;
    float crust=smoothstep(2.,5.,cb)*smoothstep(.45,.9,cr.y)*.9;
    c=mix(c,mix(lc*.7,vec3(.12,.05,.04),crust),lv);
    e=mix(e,lc*(1.-crust)*1.7,lv); h=mix(h,.08,lv);
  }
  c*=1.-smoothstep(.04,.24,mk.g)*(1.-lv)*.55;
}
void sHub(vec2 p, vec3 mk, out float h, out vec3 c, out vec3 e){
  e=vec3(0.);
  float g=fbm(p*.006), d=fbm3(p*.05);
  vec3 grass=mix(vec3(.12,.15,.12),vec3(.23,.26,.19),g);
  float bl=vn(vec2(p.x*.6,p.y*.15)+d*4.); grass*=.85+.3*bl;
  vec3 st=vor(p/38.); float sb=st.x*38.; float stone=step(.8,st.y)*(1.-smoothstep(.22,.32,st.z));
  c=mix(grass,vec3(.33,.34,.35)*(.8+.4*d),stone);
  h=g*.5+stone*.3*(1.-st.z*2.)+bl*.04;
  vec3 fs=vor(p/30.); float fb=fs.x*30.;
  vec3 fl=mix(vec3(.30,.29,.27),vec3(.46,.44,.41),fs.y)*(.85+.3*d);
  fl*=.9+.18*smoothstep(4.,12.,fb); fl=mix(mix(vec3(.10,.12,.09),vec3(.2,.24,.14),vn(p*.3)),fl,smoothstep(.35,1.5,fb));
  float pk=smoothstep(.3,.7,mk.r); c=mix(c,fl,pk); h=mix(h,.5*smoothstep(.4,6.,fb)+fs.y*.06,pk);
  if(p.x>uRect.x&&p.x<uRect.z&&p.y>uRect.y&&p.y<uRect.w){
    float row=floor(p.y/15.), off=hash12(vec2(row,3.))*400.;
    float seg=floor((p.x+off)/260.), hv=hash12(vec2(row,seg));
    float gr=vn(vec2((p.x+off)*.025,p.y*1.6+hv*9.))*.6+vn(vec2(p.x*.12,p.y*3.))*.25;
    float knot=1.-smoothstep(1.,3.5,length(vec2(fract((p.x+off)/97.)*97.-48.,(fract(p.y/15.)-.5)*15.)));
    vec3 wd=mix(vec3(.27,.17,.10),vec3(.43,.29,.18),hv*.5+gr*.5);
    wd=mix(wd,vec3(.18,.11,.06),knot*step(.7,hash12(vec2(row,seg+7.))));
    float fy=fract(p.y/15.), fx=fract((p.x+off)/260.);
    float sm=max(1.-smoothstep(0.,.09,min(fy,1.-fy)),1.-smoothstep(0.,.005,min(fx,1.-fx)));
    c=wd*(1.-sm*.6); h=.5-sm*.22+gr*.04;
    c=mix(c,vec3(.58,.5,.32),smoothstep(.84,.92,vn(p*.25+gr))*.3);
  }
  float edge=uVoidY+(fbm3(vec2(p.x*.01,0.))-.5)*50.;
  if(p.y>edge){
    float t=clamp((p.y-edge)/40.,0.,1.);
    vec3 sk=mix(vec3(.015,.02,.045),vec3(.06,.05,.12),fbm(p*.003));
    sk+=vec3(.3,.25,.5)*smoothstep(.6,.9,fbm(p*.002+4.))*.25;
    float s=step(.996,hash12(floor(p*.5)))*hash12(floor(p*.5)+3.);
    c=mix(vec3(.05,.05,.06),sk+s,t); h=mix(.6,0.,t); e=vec3(s)*.7*t;
  } else { float rim=smoothstep(edge-50.,edge,p.y); c=mix(c,vec3(.2,.2,.22)*(.8+.4*d),rim*.6); h+=rim*.25; }
}
void sUtg(vec2 p, vec3 mk, out float h, out vec3 c, out vec3 e){
  vec2 d=p-uArena.xy; float r=length(d), a=atan(d.y,d.x);
  float vein=abs(sin(p.x*.004+fbm(p*.004)*7.));
  vec3 mb=mix(vec3(.06,.09,.07),vec3(.14,.19,.15),fbm3(p*.01));
  mb=mix(mb,vec3(.34,.44,.32),(1.-smoothstep(0.,.07,vein))*.55);
  float ring=fract(r/90.), seg=fract(a/6.2832*24.);
  float te=max(1.-smoothstep(0.,.035,min(ring,1.-ring)),1.-smoothstep(0.,.02,min(seg,1.-seg))*step(60.,r));
  c=mb*(1.-te*.55);
  float gold=1.-smoothstep(1.5,3.2,abs(r-floor(r/180.+.5)*180.));
  c=mix(c,vec3(.78,.62,.3),gold*.9); e=vec3(.6,.5,.2)*gold*.35;
  h=.5-te*.2+gold*.1;
  float ot=smoothstep(uArena.z-6.,uArena.z+50.,r);
  c=mix(c,vec3(.02,.05,.03)+fbm(p*.004)*vec3(.05,.12,.06),ot); h=mix(h,0.,ot);
}
void sSky(vec2 p, vec3 mk, out float h, out vec3 c, out vec3 e){
  float cl=fbm(p*.003+fbm3(p*.0015)*2.);
  h=cl*.8; c=mix(vec3(.86,.76,.62),vec3(1.,.98,.93),smoothstep(.3,.75,cl)); e=vec3(0.);
  vec2 d=p-uArena.xy; float r=length(d);
  if(r<uArena.z+30.){
    vec2 hp=p/vec2(92.,80.); vec2 hi=floor(hp); vec2 hf=fract(hp)-.5;
    float best=1e5; vec2 bid=vec2(0.);
    for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g=hi+vec2(float(i),float(j)); vec2 cc=(g+.5+vec2(mod(g.y,2.)*.5,0.))*vec2(92.,80.); float dd=length(p-cc); if(dd<best){best=dd;bid=g;} }
    float sh=hash12(bid);
    vec3 paint=sh<.33?vec3(.72,.14,.10):sh<.66?vec3(.86,.70,.32):vec3(.86,.83,.76);
    vec2 cc=(bid+.5+vec2(mod(bid.y,2.)*.5,0.))*vec2(92.,80.);
    float ang=atan(p.y-cc.y,p.x-cc.x);
    float board=step(.5,fract((p.x-cc.x)/14.+sh*3.));
    vec3 sc=paint*(.82+.18*board);
    sc=mix(sc,paint*.5+vec3(.2,.15,.05),step(.5,fract(ang/6.2832*4.+sh))*.25*step(sh,.5));
    float rim=smoothstep(38.,42.,best), boss=1.-smoothstep(7.,9.,best);
    sc=mix(sc,vec3(.25,.22,.2),rim); sc=mix(sc,vec3(1.,.86,.45),boss);
    float inS=1.-smoothstep(44.,46.,best);
    float k=(1.-smoothstep(uArena.z-10.,uArena.z+20.,r));
    c=mix(c,mix(vec3(.18,.12,.07),sc,inS),k);
    h=mix(h,.5+(1.-best/46.)*.3*inS+boss*.2,k);
    e=vec3(1.,.8,.4)*boss*.35*k;
  }
}
vec3 sPaint(vec2 p){
  vec2 uv=p/uWorld;
  vec3 sky=mix(uC1,uC2,smoothstep(0.,uP.x,uv.y));
  float d=length((uv-uP.zw)*vec2(uWorld.x/uWorld.y,1.));
  sky+=uC3*exp(-d*5.)*.55+uC3*exp(-d*22.)*.6;
  vec2 q=p*uP.y; vec2 w=vec2(fbm3(q*.5+1.7),fbm3(q*.5+8.3));
  float cl=fbm(q+w*2.4+vec2(0.,uv.y*2.));
  float m=smoothstep(.42,.78,cl)*(1.-smoothstep(uP.x*.9,uP.x+.15,uv.y));
  float lit=smoothstep(.45,.9,fbm(q+w*2.4+vec2(-.04,-.06)/uP.y*.02)-cl+.5);
  vec3 cc=mix(uC1*1.2+.03,mix(uC2,uC3,.45),lit);
  vec3 col=mix(sky,cc,m*.85);
  col*=.9+.18*vn(p*.08)*vn(p*.21+3.);
  col*=1.-.4*smoothstep(.3,1.,length(uv-.5)*1.25);
  return col;
}
void surf(vec2 p, vec3 mk, out float h, out vec3 c, out vec3 e){
  if(uMode<.5) sIron(p,mk,h,c,e);
  else if(uMode<1.5) sIce(p,mk,h,c,e);
  else if(uMode<2.5) sSea(p,mk,h,c,e);
  else if(uMode<3.5) sFire(p,mk,h,c,e);
  else if(uMode<4.5) sHub(p,mk,h,c,e);
  else if(uMode<5.5) sUtg(p,mk,h,c,e);
  else sSky(p,mk,h,c,e);
}
void main(){
  vec2 p=uOrigin+vec2(vUv.x,1.-vUv.y)*uSize;
  vec3 mk=texture2D(uMask,clamp(p/uWorld,0.,1.)).rgb;
  float h,hx,hy; vec3 c,e,c2,e2;
  if(uMode>6.5){ gl_FragColor=vec4(sPaint(p),1.); return; }
  surf(p,mk,h,c,e);
  if(uPass>.5){ gl_FragColor=vec4(e,1.); return; }
  surf(p+vec2(1.6,0.),mk,hx,c2,e2); surf(p+vec2(0.,1.6),mk,hy,c2,e2);
  vec3 n=normalize(vec3(-(hx-h)*16.,-(hy-h)*16.,1.));
  float df=max(dot(n,normalize(vec3(-.55,-.65,.55))),0.);
  vec3 col=c*(.38+1.02*df);
  col*=mix(vec3(.92,.95,1.05),vec3(1.06,1.0,.92),df);
  float ed=min(min(p.x,p.y),min(uWorld.x-p.x,uWorld.y-p.y));
  if(uArena.z<=0.) col*=.25+.75*smoothstep(-40.,300.,ed);
  gl_FragColor=vec4(col,1.);
}`;
function glInit() {
  if (GL.tried) return GL.ok; GL.tried = true;
  try {
    const c = mkCanvas(640, 640);
    const o = { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false, alpha: false };
    const gl = c.getContext('webgl', o) || c.getContext('experimental-webgl', o);
    if (!gl) return false;
    const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    const prec = hp && hp.precision > 0 ? 'highp' : 'mediump';
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, GL_VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, 'precision ' + prec + ' float;\n' + GL_FS));
    gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {}; for (const n of ['uOrigin', 'uSize', 'uWorld', 'uSeed', 'uMode', 'uPass', 'uVoidY', 'uRect', 'uArena', 'uMask', 'uC1', 'uC2', 'uC3', 'uP']) U[n] = gl.getUniformLocation(pr, n);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(U.uMask, 0);
    Object.assign(GL, { ok: true, c, gl, U, tex });
    c.addEventListener('webglcontextlost', e => { e.preventDefault(); GL.ok = false; });
    c.addEventListener('webglcontextrestored', () => { GL.tried = false; GL.ok = false; for (const k in BACKDROPS) delete BACKDROPS[k]; });
    return true;
  } catch (e) { console.warn('GPU ground unavailable, painting by hand:', e && e.message); GL.ok = false; return false; }
}
const MODE = { iron: 0, ice: 1, sea: 2, fire: 3, hub: 4, utgard: 5, sky: 6 };

/* the world mask: r = trodden ground, g = feature (lava, frozen river, open water, crack-field), b = spare */
function buildMask(w) {
  const N = 512, sx = N / w.w, sy = N / w.h;
  const layer = () => { const c = mkCanvas(N, N), g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, N, N); g.scale(sx, sy); g.lineCap = 'round'; g.lineJoin = 'round'; return [c, g]; };
  const [rc, rg] = layer(), [gc, gg] = layer();
  const soft = (g, pts, wdt) => { for (const [k, a] of [[1.5, .25], [1.2, .4], [1, .7], [.75, 1]]) { g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = wdt * k; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); } };
  const disc = (g, x, y, r, a = 1) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(.7, `rgba(255,255,255,${a * .8})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
  for (const p of w.paths) soft(rg, p, w.pathW || 96);
  for (const n of w.nodes) disc(rg, n.x, n.y, n.t === 'altar' ? 300 : n.t === 'gate' ? 230 : n.t === 'camp' ? 160 : 130, .95);
  if (w.maskExtra) w.maskExtra(rg, gg, soft, disc);
  for (const r of w.ice) soft(gg, r.pts, r.w);
  for (const l of w.lava) soft(gg, l.pts, l.w * 1.1);
  for (const p of w.water) { gg.save(); gg.translate(p.x, p.y); gg.scale(1, p.ry / p.rx); disc(gg, 0, 0, p.rx * 1.1, 1); gg.restore(); }
  for (const f of (w.crackFields || [])) disc(gg, f.x, f.y, f.r, .9);
  const out = mkCanvas(N, N), og = out.getContext('2d'), id = og.createImageData(N, N);
  const r = rg.getImageData ? rc.getContext('2d').getImageData(0, 0, N, N).data : null, gch = gc.getContext('2d').getImageData(0, 0, N, N).data;
  for (let i = 0; i < id.data.length; i += 4) { id.data[i] = r[i]; id.data[i + 1] = gch[i]; id.data[i + 2] = 0; id.data[i + 3] = 255; }
  og.putImageData(id, 0, 0);
  return out;
}
/* paint the ground into cached tiles, plus a half-resolution emissive layer */
function buildGround(w) {
  const t0 = performance.now();
  w.CW = 512; w.chunks = new Map();
  const CW = w.CW, nx = Math.ceil(w.w / CW), ny = Math.ceil(w.h / CW);
  const thumb = mkCanvas(480, 480 * w.h / w.w), tg = thumb.getContext('2d');
  const emisOn = w.emis !== false;
  if (!glInit()) { paintGroundFallback(w); return; }
  const gl = GL.gl, U = GL.U;
  const mask = buildMask(w);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, GL.tex);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask);
  gl.uniform2f(U.uWorld, w.w, w.h); gl.uniform1f(U.uSeed, (w.seed || 7) % 97 + .5); gl.uniform1f(U.uMode, MODE[w.mode]);
  gl.uniform1f(U.uVoidY, w.voidY || 1e9);
  const rr = w.hall || [0, 0, 0, 0]; gl.uniform4f(U.uRect, rr[0], rr[1], rr[2], rr[3]);
  const a = w.arena; gl.uniform3f(U.uArena, a ? a.x : 0, a ? a.y : 0, a ? a.R : 0);
  const gs = w.gs, n = Math.ceil(CW * gs), px = n + 2, upp = CW / n;
  const ne = Math.ceil(n / 2), pxe = ne + 2, uppe = CW / ne;
  for (let cy = 0; cy < ny; cy++) for (let cx = 0; cx < nx; cx++) {
    const x0 = cx * CW, y0 = cy * CW;
    gl.viewport(0, 0, px, px);
    gl.uniform2f(U.uOrigin, x0 - upp, y0 - upp); gl.uniform2f(U.uSize, px * upp, px * upp); gl.uniform1f(U.uPass, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const c = mkCanvas(px, px); c.getContext('2d').drawImage(GL.c, 0, GL.c.height - px, px, px, 0, 0, px, px);
    let e = null;
    if (emisOn) {
      gl.viewport(0, 0, pxe, pxe);
      gl.uniform2f(U.uOrigin, x0 - uppe, y0 - uppe); gl.uniform2f(U.uSize, pxe * uppe, pxe * uppe); gl.uniform1f(U.uPass, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      e = mkCanvas(pxe, pxe); e.getContext('2d').drawImage(GL.c, 0, GL.c.height - pxe, pxe, pxe, 0, 0, pxe, pxe);
    }
    w.chunks.set(cx * 1000 + cy, { c, e, x: x0, y: y0, n, ne });
    tg.drawImage(c, 1, 1, n, n, x0 * 480 / w.w, y0 * 480 / w.w, CW * 480 / w.w + .5, CW * 480 / w.w + .5);
  }
  w.thumb = thumb;
  w.genMs = performance.now() - t0;
}
function drawGround() {
  const w = G.world; if (!w) return;
  const hw = W / 2 / cam.z + 4, hh = H / 2 / cam.z + 4;
  ctx.fillStyle = w.voidCol || '#050404'; ctx.fillRect(cam.x - hw - 60, cam.y - hh - 60, hw * 2 + 120, hh * 2 + 120);
  ctx.imageSmoothingEnabled = true;
  if (w.chunks) {
    const CW = w.CW;
    const x0 = Math.max(0, Math.floor((cam.x - hw) / CW)), x1 = Math.floor((cam.x + hw) / CW), y0 = Math.max(0, Math.floor((cam.y - hh) / CW)), y1 = Math.floor((cam.y + hh) / CW);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) { const k = w.chunks.get(cx * 1000 + cy); if (k) ctx.drawImage(k.c, 1, 1, k.n, k.n, k.x, k.y, CW, CW); }
  } else if (w.ground) {
    const cx0 = clamp(cam.x - hw, 0, w.w), cy0 = clamp(cam.y - hh, 0, w.h), cx1 = clamp(cam.x + hw, 0, w.w), cy1 = clamp(cam.y + hh, 0, w.h);
    if (cx1 > cx0 && cy1 > cy0) ctx.drawImage(w.ground, cx0 * w.gs, cy0 * w.gs, (cx1 - cx0) * w.gs, (cy1 - cy0) * w.gs, cx0, cy0, cx1 - cx0, cy1 - cy0);
  }
}
/* emissive tiles: glow drawn additively, and fed into the light map */
function drawEmissive(g, alpha) {
  const w = G.world; if (!w || !w.chunks || w.emis === false) return;
  const hw = W / 2 / cam.z + 40, hh = H / 2 / cam.z + 40, CW = w.CW;
  const x0 = Math.max(0, Math.floor((cam.x - hw) / CW)), x1 = Math.floor((cam.x + hw) / CW), y0 = Math.max(0, Math.floor((cam.y - hh) / CW)), y1 = Math.floor((cam.y + hh) / CW);
  g.globalAlpha = alpha;
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) { const k = w.chunks.get(cx * 1000 + cy); if (k && k.e) g.drawImage(k.e, 1, 1, k.ne, k.ne, k.x, k.y, CW, CW); }
  g.globalAlpha = 1;
}
function freeGround(w) { if (w && w.chunks) { w.chunks.clear(); w.chunks = null; } }

/* painted skies for the memory scenes and the title (rendered once, cached) */
const BACKDROPS = {};
function backdrop(key, c1, c2, c3, horizon, scale, sx, sy) {
  if (BACKDROPS[key]) return BACKDROPS[key];
  const W0 = 640, H0 = 360;
  if (!glInit()) return null;
  const gl = GL.gl, U = GL.U, rgb = h => hexRGB(h).map(v => v / 255);
  gl.viewport(0, 0, W0, H0);
  gl.uniform1f(U.uMode, 7); gl.uniform2f(U.uWorld, W0, H0); gl.uniform2f(U.uOrigin, 0, 0); gl.uniform2f(U.uSize, W0, H0);
  gl.uniform1f(U.uSeed, key.length * 3.7 + 1); gl.uniform3f(U.uC1, ...rgb(c1)); gl.uniform3f(U.uC2, ...rgb(c2)); gl.uniform3f(U.uC3, ...rgb(c3));
  gl.uniform4f(U.uP, horizon, scale, sx, sy);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  const c = mkCanvas(W0, H0); c.getContext('2d').drawImage(GL.c, 0, GL.c.height - H0, W0, H0, 0, 0, W0, H0);
  return BACKDROPS[key] = c;
}
function drawBackdrop(g, key, w, h, ...a) { const b = backdrop(key, ...a); if (!b) return false; const s = Math.max(w / b.width, h / b.height); g.drawImage(b, (w - b.width * s) / 2, (h - b.height * s) / 2, b.width * s, b.height * s); return true; }

/* ---------------- fog: a tileable cloud texture, scrolled in two layers ---------------- */
let FOGTEX = null; const FOGTINT = {};
function fogTex() {
  if (FOGTEX) return FOGTEX;
  const N = 256, c = mkCanvas(N, N), g = c.getContext('2d'), id = g.createImageData(N, N);
  const per = (x, y, P) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = smooth(xf), v = smooth(yf); const h = (a, b) => hash2(((a % P) + P) % P, ((b % P) + P) % P); return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v); };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let v = 0, a = .55, s = 0;
    for (const P of [4, 8, 16, 32]) { v += a * per(x / N * P, y / N * P, P); s += a; a *= .5; }
    v /= s; const k = clamp((v - .38) * 2.2, 0, 1);
    const i = (y * N + x) * 4; id.data[i] = id.data[i + 1] = id.data[i + 2] = 255; id.data[i + 3] = k * k * 255;
  }
  g.putImageData(id, 0, 0); return FOGTEX = c;
}
function fogTinted(col) { if (FOGTINT[col]) return FOGTINT[col]; const c = mkCanvas(256, 256), g = c.getContext('2d'); g.drawImage(fogTex(), 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, 256, 256); return FOGTINT[col] = c; }
function drawFogLayer(col, alpha, scale, sx, sy) { // screen-space, tiled, parallax with the camera
  if (alpha <= 0) return;
  const t = fogTinted(col), S = scale * cam.z, ox = ((-(cam.x * .85 + sx) * cam.z) % S + S) % S - S, oy = ((-(cam.y * .85 + sy) * cam.z) % S + S) % S - S;
  ctx.globalAlpha = alpha;
  for (let y = oy; y < H; y += S) for (let x = ox; x < W; x += S) ctx.drawImage(t, x, y, S + 1, S + 1);
  ctx.globalAlpha = 1;
}

/* ---------------- cel shading for live-drawn figures ----------------
   fill with the shade, clip, then lay the lit colour offset toward the light:
   a crescent of shadow stays on the side away from the light. */
let CEL_LX = 1;
function cel(path, base, shade, k = 1.8, outline = '#0c0807', lw = 1.4) {
  ctx.fillStyle = shade; path(); ctx.fill();
  ctx.save(); path(); ctx.clip();
  ctx.translate(-k * CEL_LX, -k); ctx.fillStyle = base; path(); ctx.fill();
  ctx.restore();
  if (lw > 0) { ctx.strokeStyle = outline; ctx.lineWidth = lw; path(); ctx.stroke(); }
}
function rimLine(path, col, a = .5, lw = 1) { ctx.save(); path(); ctx.clip(); ctx.translate(lw * 1.2 * CEL_LX, lw * 1.2); ctx.strokeStyle = hexA(col, a); ctx.lineWidth = lw * 2; path(); ctx.stroke(); ctx.restore(); }
/* soft drop-shadow trick for offscreen sprites: only the blurred shadow lands */
function softShadow(g, path, blur, ox, oy, a) {
  g.save(); g.shadowColor = `rgba(0,0,0,${a})`; g.shadowBlur = blur * SS; g.shadowOffsetX = (ox + 5000) * SS; g.shadowOffsetY = oy * SS;
  g.translate(-5000, 0); path(); g.fillStyle = '#000'; g.fill(); g.restore();
}
/* queued glows drawn after the light map so they stay bright */
const PGLOW = [];
function glowPost(x, y, r, col, a) { PGLOW.push(x, y, r, col, a); }
function flushGlowPost() { for (let i = 0; i < PGLOW.length; i += 5) glow(PGLOW[i], PGLOW[i + 1], PGLOW[i + 2], PGLOW[i + 3], PGLOW[i + 4]); PGLOW.length = 0; }
