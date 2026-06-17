/* ─────────────────────────────────────────────────────────────────────────
   besselian.js — local circumstances of a solar eclipse from Besselian elements.

   Verified JS port of the Python reference (eclipse_compute.py). Runs in Node
   (module.exports) and the browser (window.Eclipse).

   PROVENANCE / STATUS (see ../BUILD-NOTES.md):
     • Geometry is the standard Espenak/Meeus formulation; spot-checked
       (Riga 80.3% obsc; NASA central-line point total ≈20:30 / Sun ≈7°).
     • Elements below are for 2026-08-12 ONLY (t0 = 18:00 TD, ΔT = 72.4 s).
       2027-08-02 is not yet entered — see engine/elements.js.
     • NOT YET DONE (do not claim until closed): atmospheric refraction +
       Sun semidiameter at low altitude; Sun AZIMUTH output; contact-time
       root-finding C1–C4 (current scanMax is ±30 s, NOT ±2 s).
     • Parameterising this verified engine to accept an arbitrary element set
       (so 2027 can be added) is a milestone-1 task and must be RE-VALIDATED
       after — verified code is not refactored silently.

   at(lat, lonEast, t) → instantaneous {obsc, mag, alt, total, up} at
   t = hours from t0.  tOfMinute(min): "minutes after 19:30 CEST" → t.
   scanMax(lat, lon): the point's peak eclipse (coarse 0.5-min scan).
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  var X=[0.47551,0.51892,-0.00008,-0.00001], Y=[0.77118,-0.23017,-0.00012,0.0],
      D=[14.7967,-0.0121,-0.0], L1=[0.53797,0.00009,-0.00001], L2=[-0.00814,0.00009,-0.00001],
      MU=[88.7478,15.0031,0.0], TANF1=0.0046141, TANF2=0.0045911, DT=72.4, FLAT=0.99664719, RAD=Math.PI/180;
  function poly(c,t){ var s=0; for(var i=c.length-1;i>=0;i--) s=s*t+c[i]; return s; }
  function geom(lat,lon,t){
    var x=poly(X,t),y=poly(Y,t),d=poly(D,t)*RAD,mu=poly(MU,t),l1=poly(L1,t),l2=poly(L2,t);
    var phi=lat*RAD,u=Math.atan(FLAT*Math.tan(phi)),rs=FLAT*Math.sin(u),rc=Math.cos(u);
    var H=(mu+lon)*RAD;                                   // verified: H = mu + lon_east
    var xi=rc*Math.sin(H), eta=rs*Math.cos(d)-rc*Math.sin(d)*Math.cos(H), zeta=rs*Math.sin(d)+rc*Math.cos(d)*Math.cos(H);
    return { m:Math.hypot(x-xi,y-eta), l1p:l1-zeta*TANF1, l2p:l2-zeta*TANF2, zeta:zeta };
  }
  function overlap(Rs,Rm,d){
    if(d>=Rs+Rm) return 0;
    if(d<=Math.abs(Rm-Rs)) return Math.PI*Math.pow(Math.min(Rs,Rm),2);
    var a1=Rs*Rs*Math.acos((d*d+Rs*Rs-Rm*Rm)/(2*d*Rs)), a2=Rm*Rm*Math.acos((d*d+Rm*Rm-Rs*Rs)/(2*d*Rm)),
        a3=0.5*Math.sqrt(Math.max(0,(-d+Rs+Rm)*(d+Rs-Rm)*(d-Rs+Rm)*(d+Rs+Rm)));
    return a1+a2-a3;
  }
  function at(lat,lon,t){
    var g=geom(lat,lon,t), alt=Math.asin(Math.max(-1,Math.min(1,g.zeta)))/RAD;
    if(g.zeta<=0) return { obsc:0, mag:0, alt:alt, total:false, up:false };
    var Rs=(g.l1p+g.l2p)/2, Rm=(g.l1p-g.l2p)/2, mag=(g.l1p-g.m)/(g.l1p+g.l2p);
    var obsc = mag>0 ? Math.max(0,Math.min(1, overlap(Rs,Rm,g.m)/(Math.PI*Rs*Rs))) : 0;
    return { obsc:obsc, mag:mag, alt:alt, total:(g.l2p<0 && g.m<=-g.l2p), up:true };
  }
  function tOfMinute(min){ var ut=17.5+min/60; return ut + DT/3600 - 18.0; }   // min after 19:30 CEST → t
  function scanMax(lat,lon){
    var best=null;
    for(var mn=-30; mn<=150; mn+=0.5){                   // NOTE: 0.5-min step ⇒ ±30 s. Root-find for ±2 s (TODO).
      var c=at(lat,lon,tOfMinute(mn));
      if(c.up && (best===null || c.mag>best.mag)) best={mag:c.mag,obsc:c.obsc,total:c.total,alt:c.alt,minute:mn};
    }
    if(!best || best.mag<=0) return { peak:0, minute:-1, total:false, alt:-99, visible:false };
    return { peak:best.obsc, minute:best.minute, total:best.total, alt:best.alt, visible:true };
  }
  var api = { at:at, scanMax:scanMax, tOfMinute:tOfMinute, DT:DT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.Eclipse = api;
})();
