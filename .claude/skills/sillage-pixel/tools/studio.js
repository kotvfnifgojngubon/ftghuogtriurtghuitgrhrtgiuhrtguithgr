// Studio : outils installés DANS la fermeture du jeu (ils voient render, makeShip, explosion, parts...).
// Ce fichier est une seule expression de fonction ; harness.install('STU', source) l'exécute et range
// le résultat dans window.STU. On n'y ajoute rien au jeu : on pose une scène, on fait avancer le temps
// avec les fonctions du jeu, et on photographie le canevas.
function(){
  const S={};
  const SUN_R=400000;           // le soleil est à l'origine : on place la scène loin, dans la direction voulue
  let sunA=-PI*0.75;            // direction d'où vient la lumière (radians, 0 = de la droite, PI/2 = du bas ; défaut : en haut à gauche)
  let flat=true;                // fond uni (sans étoiles scintillantes) pour juger les pixels
  const twinkles0=drawTwinkles;
  const shots=[];               // images retenues pour la planche

  // ---------- scène ----------
  S.reset=(w,h,o)=>{o=o||{};
    w=w|0||320;h=h|0||180;cvs.width=w;cvs.height=h;W=w;H=h;SCALE=1;VZ=1;TXS=1;zoomBoost=0;
    rocks=[];wrecks=[];enemies=[];allies=[];pickups=[];crates=[];spacers=[];bullets=[];missiles=[];beams=[];parts=[];
    floaters=[];shocks=[];flashes=[];blasts=[];trails=[];fballs=[];ambs=[];
    try{puffs=[];xrings=[];}catch(e){}  // systèmes ajoutés par une version plus récente du jeu
    try{clearSpecials();}catch(e){}
    player=null;shake=0;now=o.t||1;frameN=0;nukeFlash=0;
    if(o.sun!==undefined)sunA=o.sun;
    flat=o.space?false:true;drawTwinkles=flat?(()=>{}):twinkles0;
    // fond : noir de la scène ; les gaz et étoiles du jeu restent éteints tant qu'ils ne sont pas générés
    if(flat){gasFar=gasTeal=gasViolet=gasDust=stars1=stars2=null;}
    const cx=-Math.cos(sunA)*SUN_R,cy=-Math.sin(sunA)*SUN_R;cam.x=cx;cam.y=cy;
    return {w,h,cx,cy};
  };
  // centre de la scène dans le monde (l'origine des positions passées aux outils)
  S.origin=()=>({x:-Math.cos(sunA)*SUN_R,y:-Math.sin(sunA)*SUN_R});
  const O=()=>S.origin();

  // ---------- catalogue ----------
  S.ships=()=>{
    const out=[];
    for(const M of MODELS){const d=ownShip(M)||hullDef(M.hull);out.push({id:M.id,name:M.n,cat:M.cat,brand:M.b,fac:M.fac||(M.id.startsWith('p_')?'pirate':M.id.startsWith('x_')?'xalthar':M.id.startsWith('a_')?'anciens':'')||(d&&d.fac)||(M.id.startsWith('p_')?'pirate':M.id.startsWith('x_')?'xalthar':M.id.startsWith('a_')?'anciens':'humain'),L:d&&d.L,H:d&&d.H});}
    for(const d of HUMAN_SHIPS)if(!MODEL_BY[d.id])out.push({id:d.id,name:(d.info&&d.info.name)||d.id,cat:'coque',fac:'humain',L:d.L,H:d.H});
    for(const id in DRAFTS)if(!out.some(s=>s.id===id))out.push(DRAFTS[id]);
    return out;
  };
  S.ids=(q)=>{const all=S.ships();if(!q||q==='all')return all.map(s=>s.id);
    const w=String(q).toLowerCase().split(/[,\s]+/).filter(Boolean);
    return all.filter(s=>w.some(k=>s.id===k||s.cat===k||s.fac===k||s.brand===k||String(s.name).toLowerCase().includes(k))).map(s=>s.id);};

  // ---------- brouillons : un plan de coque écrit avec shipDef, évalué ici, rendu comme un vrai ----------
  // src : une expression qui vaut le résultat de shipDef(...) ; son id remplace la coque du même nom
  // une nouvelle coque (id inconnu du jeu) est rangée dans la catégorie et la faction qu'elle déclare (cat, fac)
  const DRAFTS={};
  S.draft=(src)=>{src=String(src).replace(/^\s*(export\s+default\s+)?/,'').replace(/;\s*$/,'');const d=eval('('+src+')');if(!d||!d.parts)throw new Error('Le brouillon doit valoir un shipDef(...)');
    if(!MODEL_BY[d.id]&&!HUMAN_SHIPS.some(s=>s.id===d.id))DRAFTS[d.id]={id:d.id,name:(d.info&&d.info.name)||d.id,cat:d.cat||'brouillon',fac:d.fac||(d.pirate?'pirate':d.skin==='xal'?'xalthar':d.pal==='anciens'?'anciens':'humain'),L:d.L,H:d.H};
    MODEL_SHIP_BY[d.id]=d;const hi=HUMAN_SHIPS.findIndex(s=>s.id===d.id);if(hi>=0)HUMAN_SHIPS[hi]=d;
    for(const k in UNIQ_TPL)if(k===d.id||k.startsWith(d.id+'@')||(MODEL_BY[k.split('@')[0]]&&(MODEL_BY[k.split('@')[0]].ship||MODEL_BY[k.split('@')[0]].hull)===d.id))delete UNIQ_TPL[k];
    return {id:d.id,L:d.L,H:d.H,model:!!MODEL_BY[d.id]};};

  // ---------- acteurs ----------
  // id : modèle ou coque ; o : x, y (relatifs au centre de la scène), a (angle), thr (poussée 0 à 2), vx, vy, ally
  S.ship=(id,o)=>{o=o||{};const t0=performance.now(),tpl=uniqueTpl(id),ms=performance.now()-t0;
    const b=makeShip(tpl,o.ally?'ally':'enemy'),c=O();
    b.x=c.x+(o.x||0);b.y=c.y+(o.y||0);b.a=o.a||0;b.setAngle();for(const m of b.mods)m.ang=b.a;
    b.thr=o.thr===undefined?0.6:o.thr;b.vx=o.vx||0;b.vy=o.vy||0;b.cls=b.cls||{};
    (o.ally?allies:enemies).push(b);b._buildMs=ms;return b;};
  S.last=()=>enemies[enemies.length-1]||allies[allies.length-1];

  // ---------- temps ----------
  // avance la simulation des effets (particules, flammes, boules de feu, ondes, incendies, boucliers)
  S.step=(dt,n)=>{dt=dt||1/60;n=n||1;
    for(let k=0;k<n;k++){now+=dt;frameN++;
      for(const L of [enemies,allies])for(const b of L){if(b.dead)continue;b.x+=b.vx*dt;b.y+=b.vy*dt;
        try{updateFires(b,dt);}catch(e){}try{coolBody(b,dt);}catch(e){}if(b.shield)try{updateShield(b,dt);}catch(e){}
        // agonie mise en scène par l'effet « death » : les mêmes appels que checkDeaths, puis la fin de finishEnemy
        if(b._dying){try{if(bigShip(b))capDying(b,dt);else dyingBlasts(b,dt,2.4,3,0.1);}catch(e){}if(!bigShip(b)&&b.dyT===undefined)b.dyT=0;if(b._dyEnd<=now){b._dying=false;S.finale(b,b._dyO);}}}
      // les épaves (morceaux d'un vaisseau éclaté) dérivent, tournent et brûlent comme en partie
      for(const w of wrecks){if(w.dead)continue;w.x+=w.vx*dt;w.y+=w.vy*dt;w.a+=(w.va||0)*dt;w.setAngle();try{if(w.fires.length)updateFires(w,dt);coolBody(w,dt);}catch(e){}}
      try{updateShocks(dt);}catch(e){}
      updateParticles(dt);
      if(shake>0)shake=0;
    }};

  // ---------- photo ----------
  // un grand vaisseau (plus de 90 000 pixels) est repeint par bandes, sur plusieurs images : avant une photo,
  // on termine tous les repeints en cours pour ne pas photographier une coque à moitié peinte
  S.settle=()=>{for(const L of [enemies,allies,wrecks,rocks])for(const b of L){if(b.dead)continue;
    const sb=sunBucket(b);if(sb!==b.sunB){b.sunB=sb;b.dirty=true;}let k=0;while(b._d&&k++<400)b.repaint();}};
  S.render=()=>{S.settle();render();};
  // garde l'image courante (ou une zone centrée de taille w × h) pour la planche, avec une légende
  const rms=[];S.renderMs=()=>{const v=rms.slice(1).sort((a,b)=>a-b);return {n:v.length,med:v[v.length>>1]||0,max:v[v.length-1]||0};};
  const timed=()=>{const t0=performance.now();render();rms.push(performance.now()-t0);};
  S.snap=(label,w,h)=>{S.settle();timed();const cw=w||cvs.width,ch=h||cvs.height,c=mkCanvas(cw,ch),g=c.getContext('2d');
    g.drawImage(cvs,Math.round((cvs.width-cw)/2),Math.round((cvs.height-ch)/2),cw,ch,0,0,cw,ch);shots.push({c,label:label||''});return shots.length-1;};
  // zone précise du canevas (x, y, largeur, hauteur en pixels de l'écran du jeu)
  S.snapRect=(label,x,y,w,h)=>{S.settle();render();const c=mkCanvas(w,h),g=c.getContext('2d');g.drawImage(cvs,Math.round(x),Math.round(y),w,h,0,0,w,h);shots.push({c,label:label||''});return shots.length-1;};
  S.clearShots=()=>{shots.length=0;rms.length=0;};
  S.frames=()=>shots.map(s=>s.c.toDataURL());
  // planche contact : images agrandies au plus proche voisin, en grille, légendes en dessous
  S.sheet=(o)=>{o=o||{};const k=o.scale||3,cols=o.cols||Math.min(shots.length,6),pad=6,lab=o.labels===false?0:14;
    const cw=Math.max(...shots.map(s=>s.c.width))*k,ch=Math.max(...shots.map(s=>s.c.height))*k,rows=Math.ceil(shots.length/cols);
    const title=o.title?18:0,out=mkCanvas(pad+cols*(cw+pad),title+pad+rows*(ch+lab+pad)),g=out.getContext('2d');
    g.fillStyle='#14161c';g.fillRect(0,0,out.width,out.height);g.imageSmoothingEnabled=false;
    g.font='11px monospace';g.textBaseline='top';
    if(o.title){g.fillStyle='#e8ecf1';g.fillText(o.title,pad,4);}
    shots.forEach((s,i)=>{const x=pad+(i%cols)*(cw+pad),y=title+pad+Math.floor(i/cols)*(ch+lab+pad);
      g.fillStyle='#03050c';g.fillRect(x,y,cw,ch);g.drawImage(s.c,0,0,s.c.width,s.c.height,x,y,s.c.width*k,s.c.height*k);
      if(lab){g.fillStyle='#9aa4b4';g.fillText(s.label,x,y+ch+2);}});
    return out.toDataURL();};

  // ---------- vues d'analyse d'un gabarit ----------
  // matières / silhouette / émissifs / modules : images à l'échelle 1 du gabarit, sans éclairage de scène
  S.tplViews=(id)=>{const t=uniqueTpl(id),w=t.w,h=t.h,n=w*h,mk=()=>{const c=mkCanvas(w,h);return[c,c.getContext('2d'),new ImageData(w,h)];};
    const [c1,g1,i1]=mk(),[c2,g2,i2]=mk(),[c3,g3,i3]=mk();
    const MODC=[0xff6a6a,0x6aff9a,0x6a9aff,0xffd36b,0xd06aff,0x6affff,0xff9a3c,0xb0b0b0];
    for(let i=0;i<n;i++){const o=i*4;if(!t.type[i])continue;
      i1.data[o]=i1.data[o+1]=i1.data[o+2]=230;i1.data[o+3]=255;
      if(t.emi[i]){const c=t.col[i];i2.data[o]=c>>16&255;i2.data[o+1]=c>>8&255;i2.data[o+2]=c&255;i2.data[o+3]=255;}else{i2.data[o]=i2.data[o+1]=i2.data[o+2]=40;i2.data[o+3]=255;}
      const mi=t.modOf[i];const c=mi>=0?MODC[mi%MODC.length]:0x303030;const f=t.type[i]===T_ARMOR?0.6:1;i3.data[o]=(c>>16&255)*f;i3.data[o+1]=(c>>8&255)*f;i3.data[o+2]=(c&255)*f;i3.data[o+3]=255;}
    g1.putImageData(i1,0,0);g2.putImageData(i2,0,0);g3.putImageData(i3,0,0);
    shots.push({c:c1,label:'silhouette'},{c:c2,label:'émissifs'},{c:c3,label:'modules'});
    return {w,h};};

  // ---------- mesures pour le contrôle ----------
  S.stats=(id)=>{const t=uniqueTpl(id),w=t.w,h=t.h,n=w*h,T=t.type,C=t.col,E=t.emi;
    const cols=new Map(),orphanAt=[],cornerAt=[];let cells=0,emi=0,orphan=0,corner=0,speck=0,asym=0,symN=0,widows=0;
    const at=(x,y)=>x>=0&&y>=0&&x<w&&y<h?T[y*w+x]:0;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(!T[i])continue;cells++;if(E[i])emi++;cols.set(C[i],(cols.get(C[i])||0)+1);
      // pixel plein sans voisin plein par un côté : poussière isolée (aucun voisin du tout) ou pixel accroché
      // par un seul coin (il se lit comme un point parasite sur le bord de la silhouette)
      if(!at(x-1,y)&&!at(x+1,y)&&!at(x,y-1)&&!at(x,y+1)){if(at(x-1,y-1)||at(x+1,y-1)||at(x-1,y+1)||at(x+1,y+1)){corner++;if(cornerAt.length<6)cornerAt.push([x,y]);}else{orphan++;if(orphanAt.length<6)orphanAt.push([x,y]);}}
      // pixel dont la couleur ne ressemble à aucun voisin : bruit (« speckle ») si tous les voisins se ressemblent entre eux
      const nb=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>at(x+dx,y+dy)?C[(y+dy)*w+x+dx]:-1).filter(v=>v>=0);
      if(nb.length===4&&nb.every(v=>v===nb[0])&&C[i]!==nb[0]&&!E[i])speck++;
      // symétrie haut/bas de la silhouette (les coques humaines sont dessinées en miroir)
      const ym=h-1-y;if(ym!==y){symN++;if(!!at(x,ym)!==!!T[i])asym++;}
      // pixel de bord à angle droit isolé (marche d'escalier d'un seul pixel qui dépasse)
      const nn=(at(x-1,y)?1:0)+(at(x+1,y)?1:0)+(at(x,y-1)?1:0)+(at(x,y+1)?1:0);if(nn===1)widows++;}
    const top=[...cols.entries()].sort((a,b)=>b[1]-a[1]);
    return {id,w,h,cells,colors:cols.size,top:top.slice(0,12).map(([c,k])=>[css(c),k]),emiPct:+(100*emi/Math.max(1,cells)).toFixed(1),
      orphans:orphan,orphanAt,corners:corner,cornerAt,speckles:speck,spurs:widows,asymPct:+(100*asym/Math.max(1,symN)).toFixed(1),
      mods:t.mods.length,nozzles:(t.nozzles||[]).length,lights:(t.lights||[]).length,tplFac:t.faction||'',pal:t.pal};};

  // ---------- effets du jeu, déclenchables par nom ----------
  // chaque effet reçoit (x, y) relatifs au centre de la scène et des options ; tous passent par le code du jeu
  S.FX={
    explosion:(x,y,o)=>{const c=O();explosion(c.x+x,c.y+y,o.k||1.5,o.vx||0,o.vy||0);},
    sparks:(x,y,o)=>{const c=O();sparks(c.x+x,c.y+y,o.n||20,o.spd||160,o.col);},
    impact:(x,y,o)=>{const c=O();fxImpact({fx:o.fx||'kin',kind:o.kind||'c',x:c.x+x,y:c.y+y},c.x+x,c.y+y,null,null);},
    muzzle:(x,y,o)=>{const c=O();fxMuzzle({vx:0,vy:0},{fx:o.fx||'fusion',kind:o.kind||''},c.x+x,c.y+y,Math.cos(o.a||0),Math.sin(o.a||0));},
    shock:(x,y,o)=>{const c=O();addShock(c.x+x,c.y+y,o.power||40,o.max||120,{col:o.col||'#ffd9a0'});},
    flash:(x,y,o)=>{const c=O();flashAt(c.x+x,c.y+y,o.r||40,o.col||'#ffb066',o.life||0.3);},
    amblast:(x,y,o)=>{const c=O();amBlast(c.x+x,c.y+y,o.R||40,0,0);},
    nuke:(x,y,o)=>{const c=O();detonateNuke(c.x+x,c.y+y,0);},
    // mort du dernier vaisseau posé : agonie de o.pre secondes (0,8 par défaut ; 0 = explosion immédiate), puis la fin
    death:(x,y,o)=>{const b=o.b||S.last();if(!b)return;const pre=o.pre===undefined?0.8:o.pre;
      if(pre>0){b._dying=true;b.dying=true;b.dyT=pre;b.boomT=0;b._dyEnd=now+pre;b._dyO=o;}else S.finale(b,o);},
    // dégâts sur le dernier vaisseau posé : cratère (lx, ly en pixels du gabarit, ou au hasard)
    hit:(x,y,o)=>{const b=o.b||S.last();if(!b)return;const lx=o.lx!==undefined?o.lx:b.w*(0.3+Math.random()*0.5),ly=o.ly!==undefined?o.ly:b.h*(0.3+Math.random()*0.4);
      damageAt(b,lx,ly,o.dmg||6,o.rad||4,o.fire===undefined?0.6:o.fire);explosion(b.wx(lx,ly),b.wy(lx,ly),o.k||0.8,0,0);},
  };
  // fin d'un vaisseau, comme finishEnemy : explosion de taille k, éclatement en épaves, onde de choc du réacteur
  S.finale=(b,o)=>{o=o||{};const k=o.k||(b.tpl&&b.tpl.small?1.4:2.4),sh=o.shock||[k,140+k*100];
    explosion(b.x,b.y,k,b.vx,b.vy);try{if(b.giant)capitalDeath(b);}catch(e){}
    try{if(bigShip(b)&&typeof bigDeath==='function')bigDeath(b);else shatter(b,o.power||1);}catch(e){b.dead=true;}
    try{reactorShock(b,sh[0],sh[1]);}catch(e){}b.dead=true;};
  S.fx=(name,x,y,o)=>{const f=S.FX[name];if(!f)throw new Error('Effet inconnu : '+name+' (connus : '+Object.keys(S.FX).join(', ')+')');f(x||0,y||0,o||{});};
  // n'importe quel code du jeu, avec les mêmes repères (utile pour un effet qui n'a pas encore de nom)
  S.run=(src)=>eval(src);
  S.counts=()=>({live:wrecks.filter(w=>!w.dead).length,puffs:typeof puffs!=='undefined'?puffs.length:0,rings:typeof xrings!=='undefined'?xrings.length:0,parts:parts.length,flashes:flashes.length,fballs:fballs.length,shocks:shocks.length,blasts:blasts.length,trails:trails.length});
  return S;
}
