/* Conservative sprite-sheet suggestions from pixel occupancy, not AI certainty. */
(function(){'use strict';
 function analyze(pixels,w,h,originalW=w,originalH=h){
  if(!pixels||w<2||h<2)return [];
  const n=w*h, xs=new Float64Array(w),ys=new Float64Array(h),mask=new Uint8Array(n);
  let transparent=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]<24)transparent++;
  const corners=[0,(w-1)*4,(h-1)*w*4,(n-1)*4];
  const bg=[0,1,2].map(k=>corners.reduce((s,j)=>s+pixels[j+k],0)/4);
  const uniform=corners.every(j=>Math.max(...bg.map((v,k)=>Math.abs(pixels[j+k]-v)))<30);
  const alpha=transparent/n>.015;
  if(!alpha&&!uniform)return [];
  let count=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=y*w+x,j=i*4;
   const fg=pixels[j+3]>24&&(alpha||Math.max(...bg.map((v,k)=>Math.abs(pixels[j+k]-v)))>32);
   if(fg){mask[i]=1;xs[x]++;ys[y]++;count++}
  }
  if(count/n<.003||count/n>.97)return [];
  function runs(p){let a=0,on=false;const max=Math.max(...p),threshold=Math.max(1,max*.025);for(const v of p){if(v>=threshold&&!on){a++;on=true}else if(v<threshold)on=false}return a}
  function axis(proj,d,original,other){
   const mean=count/d;let out=[{k:1,score:0}];
   for(let k=2;k<=Math.min(32,Math.floor(original/12),Math.floor(d/5));k++){
    if(original%k!==0)continue;
    let gap=0;for(let j=1;j<k;j++){const x=j*d/k;let v=0,m=0;const radius=Math.max(1,Math.floor(d/k*.035));for(let q=Math.max(0,Math.floor(x)-radius);q<=Math.min(d-1,Math.ceil(x)+radius);q++){v+=proj[q];m++}gap+=Math.max(0,1-v/m/Math.max(1,mean))}
    const parts=runs(proj),match=parts===k?.26:0;
    const score=gap/(k-1)*.85+match-.22-Math.log2(k)*.035;
    if(score>.08)out.push({k,score});
   }
   return out.sort((a,b)=>b.score-a.score).slice(0,12);
  }
  // Integral image: inspect occupancy inside each candidate cell without rescanning pixels.
  const stride=w+1,I=new Int32Array(stride*(h+1));
  for(let y=0;y<h;y++){let sum=0;for(let x=0;x<w;x++){sum+=mask[y*w+x];I[(y+1)*stride+x+1]=I[y*stride+x+1]+sum}}
  const rect=(x0,y0,x1,y1)=>I[y1*stride+x1]-I[y0*stride+x1]-I[y1*stride+x0]+I[y0*stride+x0];
  let found=[];
  for(const c of axis(xs,w,originalW,h))for(const r of axis(ys,h,originalH,w)){
   const total=c.k*r.k;if(total===1||total>256)continue;
   const cellW=originalW/c.k,cellH=originalH/r.k,aspect=cellW/cellH;
   if(aspect<.18||aspect>5.5)continue;
   const cells=[];for(let y=0;y<r.k;y++)for(let x=0;x<c.k;x++){const x0=Math.round(x*w/c.k),x1=Math.round((x+1)*w/c.k),y0=Math.round(y*h/r.k),y1=Math.round((y+1)*h/r.k);cells.push(rect(x0,y0,x1,y1)/Math.max(1,(x1-x0)*(y1-y0)))}
   const used=cells.map((v,i)=>v>.005?i:-1).filter(i=>i>=0);
   if(used.length<2||used.length/total<.55)continue;
   const first=used[0],last=used.at(-1),frames=last-first+1;
   const score=(c.score+r.score)/((c.k>1?1:0)+(r.k>1?1:0))+.38*used.length/total-.18*Math.abs(Math.log2(aspect))-.03*Math.log2(total);
   found.push({cols:c.k,rows:r.k,row:Math.floor(first/c.k),col:first%c.k,frames,score,cellW,cellH});
  }
  return found.filter(x=>x.score>.45).sort((a,b)=>b.score-a.score||a.cols*a.rows-b.cols*b.rows).slice(0,5);
 }
 window.AUTOCHEST_SHEET=Object.freeze({analyze});
})();