import { useState, useEffect } from "react";
import { AlertCircle, ArrowLeft, BookOpen, CheckCircle, Clock, Eye, Plus, Search, Shield } from "lucide-react";
import * as api from "@/lib/api";
import { getCatCls, getSanction } from "@/app/lib/helpers";
import { Chip } from "@/app/components/shared/Chip";
import { FInput } from "@/app/components/shared/FormFields";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import schoolLogo from "@/imports/image-1.png";

export function PublicView({ onBack }: { onBack:()=>void }) {
  const [nis,setNis]=useState(""); const [result,setResult]=useState<Awaited<ReturnType<typeof api.publicLookup>>|null|"not-found">(null);
  const [busy,setBusy]=useState(false);
  const [displayedPoints,setDisplayedPoints]=useState(0);
  const [resultReady,setResultReady]=useState(false);

  const movePublicHero = (e: React.MouseEvent<HTMLElement>) => {
    const section=e.currentTarget;
    const rect=section.getBoundingClientRect();
    const x=((e.clientX-rect.left)/rect.width)*100;
    const y=((e.clientY-rect.top)/rect.height)*100;
    const dx=(x-50)/50;
    const dy=(y-50)/50;

    section.style.setProperty("--cursor-x",`${x}%`);
    section.style.setProperty("--cursor-y",`${y}%`);
    section.style.setProperty("--parallax-x",`${dx*18}px`);
    section.style.setProperty("--parallax-y",`${dy*14}px`);
    section.style.setProperty("--parallax-x-reverse",`${dx*-12}px`);
    section.style.setProperty("--parallax-y-reverse",`${dy*-9}px`);
    section.style.setProperty("--card-x",`${dx*7}px`);
    section.style.setProperty("--card-y",`${dy*5}px`);
    section.style.setProperty("--tilt-x",`${dy*-2.2}deg`);
    section.style.setProperty("--tilt-y",`${dx*3}deg`);
  };

  const resetPublicHero = (e: React.MouseEvent<HTMLElement>) => {
    const section=e.currentTarget;
    section.style.setProperty("--cursor-x","50%");
    section.style.setProperty("--cursor-y","50%");
    section.style.setProperty("--parallax-x","0px");
    section.style.setProperty("--parallax-y","0px");
    section.style.setProperty("--parallax-x-reverse","0px");
    section.style.setProperty("--parallax-y-reverse","0px");
    section.style.setProperty("--card-x","0px");
    section.style.setProperty("--card-y","0px");
    section.style.setProperty("--tilt-x","0deg");
    section.style.setProperty("--tilt-y","0deg");
  };

  useEffect(() => {
    const elements=Array.from(
      document.querySelectorAll<HTMLElement>(
        ".public-scroll-reveal, .public-guide-reveal"
      )
    );

    if(!("IntersectionObserver" in window)){
      elements.forEach(element=>element.classList.add("public-scroll-reveal-visible"));
      return;
    }

    const observer=new IntersectionObserver(
      entries=>{
        entries.forEach(entry=>{
          if(!entry.isIntersecting) return;

          const element=entry.target as HTMLElement;
          const delay=Number(element.dataset.revealDelay||0);
          element.style.transitionDelay=`${delay}ms`;

          requestAnimationFrame(()=>{
            requestAnimationFrame(()=>{
              element.classList.add("public-scroll-reveal-visible");
              observer.unobserve(element);
            });
          });
        });
      },
      {
        threshold:0.06,
        rootMargin:"0px 0px 8% 0px",
      }
    );

    elements.forEach(element=>{
      if(!element.classList.contains("public-scroll-reveal-visible")){
        observer.observe(element);
      }
    });

    return()=>observer.disconnect();
  },[result]);

  useEffect(() => {
    let animationFrame=0;
    let readyTimer=0;

    if(!result||result==="not-found"){
      setDisplayedPoints(0);
      setResultReady(false);
      return;
    }

    const total=Math.max(0,Number(result.total_poin)||0);
    const duration=950;
    const startedAt=performance.now();

    setDisplayedPoints(0);
    setResultReady(false);
    readyTimer=window.setTimeout(()=>setResultReady(true),70);

    const animate=(now:number)=>{
      const progress=Math.min((now-startedAt)/duration,1);
      const eased=1-Math.pow(1-progress,4);
      setDisplayedPoints(Math.round(total*eased));

      if(progress<1){
        animationFrame=requestAnimationFrame(animate);
      }
    };

    animationFrame=requestAnimationFrame(animate);

    return()=>{
      cancelAnimationFrame(animationFrame);
      window.clearTimeout(readyTimer);
    };
  },[result]);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await api.publicLookup(nis.trim());
      setResult(data);
      setNis("");
    } catch {
      setResult("not-found");
    } finally {
      setBusy(false);
      setTimeout(()=>document.getElementById("hasil")?.scrollIntoView({behavior:"smooth",block:"start"}),100);
    }
  };
  const sv = result&&result!=="not-found" ? result.riwayat_pelanggaran : [];

  return (
    <div className="min-h-screen" style={{background:"#f5f4f0",fontFamily:"'Inter',sans-serif"}}>
      <style>{`
        .public-scroll-reveal{
          opacity:0;
          transform:translate3d(0,38px,0);
          filter:blur(5px);
          transition:
            opacity 720ms cubic-bezier(.22,1,.36,1),
            transform 760ms cubic-bezier(.22,1,.36,1),
            filter 680ms ease;
          will-change:opacity,transform,filter;
        }

        .public-scroll-reveal[data-reveal-direction="left"]{
          transform:translate3d(-48px,18px,0);
        }

        .public-scroll-reveal[data-reveal-direction="right"]{
          transform:translate3d(48px,18px,0);
        }

        .public-scroll-reveal[data-reveal-direction="scale"]{
          transform:translate3d(0,28px,0) scale(.965);
        }

        .public-scroll-reveal.public-scroll-reveal-visible{
          opacity:1;
          transform:translate3d(0,0,0) scale(1);
          filter:blur(0);
        }

        /*
         * Animasi Panduan dibuat ringan:
         * hanya opacity dan translateY agar tetap halus pada laptop maupun HP.
         */
        .public-guide-reveal{
          opacity:0;
          transform:translate3d(0,14px,0);
          transition:
            opacity 760ms cubic-bezier(.2,.8,.2,1),
            transform 900ms cubic-bezier(.2,.8,.2,1),
            box-shadow 280ms ease,
            border-color 280ms ease!important;
          backface-visibility:hidden;
          will-change:opacity,transform;
        }

        .public-guide-title{
          transform:translate3d(0,10px,0);
        }

        .public-guide-reveal.public-scroll-reveal-visible{
          opacity:1;
          transform:translate3d(0,0,0);
        }

        .public-guide-card.public-scroll-reveal-visible:hover{
          transform:translate3d(0,-4px,0)!important;
          border-color:rgba(45,106,79,.22);
          box-shadow:0 12px 28px rgba(26,53,40,.10);
        }

        .public-guide-card.public-scroll-reveal-visible:active{
          transform:translate3d(0,-2px,0)!important;
          transition-duration:120ms!important;
        }

        .public-guide-icon{
          transition:transform 320ms cubic-bezier(.2,.8,.2,1);
        }

        .public-guide-card.public-scroll-reveal-visible:hover .public-guide-icon{
          transform:translate3d(0,-1px,0) scale(1.04);
        }

        .public-hover-grow{
          position:relative;
          z-index:1;
          cursor:default;
          transition:
            opacity 720ms cubic-bezier(.22,1,.36,1),
            transform 260ms cubic-bezier(.22,1,.36,1),
            filter 680ms ease,
            box-shadow 260ms ease,
            border-color 260ms ease!important;
          transform-origin:center;
        }

        .public-hover-grow.public-scroll-reveal-visible:hover{
          transform:translate3d(0,-5px,0) scale(1.045)!important;
          z-index:20;
          box-shadow:0 16px 34px rgba(26,53,40,.14);
        }

        .public-hover-grow.public-scroll-reveal-visible:active{
          transform:translate3d(0,-2px,0) scale(1.025)!important;
          transition-duration:100ms!important;
        }

        @keyframes publicResultShellEnter{
          0%{opacity:0;transform:translate3d(0,38px,0) scale(.965);filter:blur(9px)}
          62%{opacity:1;transform:translate3d(0,-4px,0) scale(1.008);filter:blur(0)}
          100%{opacity:1;transform:translate3d(0,0,0) scale(1);filter:blur(0)}
        }

        @keyframes publicResultHeaderEnter{
          0%{opacity:0;transform:translateX(-28px)}
          100%{opacity:1;transform:translateX(0)}
        }

        @keyframes publicResultCardEnter{
          0%{opacity:0;transform:translate3d(0,28px,0) scale(.96)}
          70%{opacity:1;transform:translate3d(0,-3px,0) scale(1.008)}
          100%{opacity:1;transform:translate3d(0,0,0) scale(1)}
        }

        @keyframes publicResultSweep{
          0%{transform:translateX(-140%) skewX(-18deg);opacity:0}
          18%{opacity:1}
          100%{transform:translateX(175%) skewX(-18deg);opacity:0}
        }

        @keyframes publicResultAvatarPop{
          0%{opacity:0;transform:scale(.35) rotate(-14deg)}
          58%{opacity:1;transform:scale(1.16) rotate(5deg)}
          78%{transform:scale(.94) rotate(-2deg)}
          100%{opacity:1;transform:scale(1) rotate(0)}
        }

        @keyframes publicResultAvatarRing{
          0%{opacity:.55;transform:scale(.72)}
          100%{opacity:0;transform:scale(1.55)}
        }

        @keyframes publicResultNumberPop{
          0%{opacity:0;transform:translateY(16px) scale(.7)}
          65%{opacity:1;transform:translateY(-3px) scale(1.1)}
          100%{opacity:1;transform:translateY(0) scale(1)}
        }

        @keyframes publicResultHistoryEnter{
          0%{opacity:0;transform:translateY(24px)}
          100%{opacity:1;transform:translateY(0)}
        }

        @keyframes publicResultRowEnter{
          0%{opacity:0;transform:translateX(-22px)}
          72%{opacity:1;transform:translateX(4px)}
          100%{opacity:1;transform:translateX(0)}
        }

        @keyframes publicResultNotFoundShake{
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-7px)}
          40%{transform:translateX(6px)}
          60%{transform:translateX(-4px)}
          80%{transform:translateX(3px)}
        }

        .public-result-shell{
          animation:publicResultShellEnter 820ms cubic-bezier(.22,1,.36,1) both;
        }

        .public-result-heading{
          animation:publicResultHeaderEnter 560ms 100ms cubic-bezier(.22,1,.36,1) both;
        }

        .public-result-main-card{
          position:relative;
          isolation:isolate;
          animation:publicResultCardEnter 720ms 160ms cubic-bezier(.22,1,.36,1) both;
        }

        .public-result-main-card::after{
          content:"";
          position:absolute;
          inset:-35% auto -35% -24%;
          width:30%;
          pointer-events:none;
          z-index:5;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.66),transparent);
          animation:publicResultSweep 1150ms 360ms ease-out both;
        }

        .public-result-avatar{
          position:relative;
          animation:publicResultAvatarPop 760ms 300ms cubic-bezier(.22,1,.36,1) both;
        }

        .public-result-avatar::after{
          content:"";
          position:absolute;
          inset:-5px;
          border-radius:18px;
          border:2px solid rgba(45,106,79,.28);
          animation:publicResultAvatarRing 980ms 620ms ease-out both;
          pointer-events:none;
        }

        .public-result-number{
          animation:publicResultNumberPop 720ms 380ms cubic-bezier(.22,1,.36,1) both;
        }

        .public-result-progress{
          width:0;
          transition:width 1100ms 360ms cubic-bezier(.22,1,.36,1);
          position:relative;
          overflow:hidden;
        }

        .public-result-progress::after{
          content:"";
          position:absolute;
          inset:0;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);
          transform:translateX(-100%);
          animation:publicResultSweep 1200ms 620ms ease-out both;
        }

        .public-result-history{
          opacity:0;
          animation:publicResultHistoryEnter 660ms 470ms cubic-bezier(.22,1,.36,1) forwards;
        }

        .public-result-row{
          opacity:0;
          animation:publicResultRowEnter 560ms cubic-bezier(.22,1,.36,1) forwards;
          transition:background-color 180ms ease,transform 180ms ease;
        }

        .public-result-row:hover{
          background:rgba(45,106,79,.045);
          transform:translateX(5px);
        }

        .public-result-not-found{
          animation:
            publicResultCardEnter 620ms 120ms cubic-bezier(.22,1,.36,1) both,
            publicResultNotFoundShake 480ms 680ms ease both;
        }

        .public-result-not-found-icon{
          animation:publicResultAvatarPop 720ms 260ms cubic-bezier(.22,1,.36,1) both;
        }

        @media (prefers-reduced-motion:reduce){
          .public-scroll-reveal,
          .public-result-shell,
          .public-result-heading,
          .public-result-main-card,
          .public-result-avatar,
          .public-result-number,
          .public-result-history,
          .public-result-row,
          .public-result-not-found,
          .public-result-not-found-icon,
          .public-guide-reveal,
          .public-guide-icon{
            opacity:1!important;
            transform:none!important;
            filter:none!important;
            animation:none!important;
            transition:none!important;
          }

          .public-result-progress{
            transition:none!important;
          }

          .public-result-main-card::after,
          .public-result-avatar::after,
          .public-result-progress::after{
            display:none!important;
          }
        }
      `}</style>
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-border shadow-sm">
        <div className="w-full px-5 sm:px-8 lg:px-12 xl:px-16 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0"><ImageWithFallback src={schoolLogo} alt="Logo" className="w-full h-full object-contain"/></div>
            <div>
              <p className="text-sm font-bold leading-tight">SMAN 2 Pangkalan Kuras</p>
              <p className="text-[10px] text-muted-foreground hidden sm:block">Portal Informasi Poin Siswa</p>
            </div>
          </div>
          <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/8 border border-primary/20 hover:bg-primary/15 hover:-translate-y-0.5 hover:shadow-md px-4 py-2 rounded-lg transition-all duration-200"><Shield size={12}/> Login Petugas</button>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative overflow-hidden py-20 lg:py-28"
        onMouseMove={movePublicHero}
        onMouseLeave={resetPublicHero}
        style={{background:"linear-gradient(150deg,#1a3528 0%,#2d6a4f 55%,#3a8a65 100%)"}}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background:"radial-gradient(circle 280px at var(--cursor-x,50%) var(--cursor-y,50%),rgba(255,255,255,0.15),rgba(255,255,255,0.04) 38%,transparent 72%)",
            }}
          />
          <div
            className="absolute -top-20 -right-20 w-80 h-80 rounded-full border border-white/10"
            style={{
              transform:"translate3d(var(--parallax-x,0px),var(--parallax-y,0px),0)",
              transition:"transform 120ms ease-out",
              willChange:"transform",
            }}
          />
          <div
            className="absolute top-16 right-16 w-52 h-52 rounded-full border border-white/7"
            style={{
              transform:"translate3d(var(--parallax-x-reverse,0px),var(--parallax-y-reverse,0px),0)",
              transition:"transform 160ms ease-out",
              willChange:"transform",
            }}
          />
          <div
            className="absolute left-[8%] bottom-[16%] w-28 h-28 rounded-full bg-amber-300/5 blur-xl"
            style={{
              transform:"translate3d(var(--parallax-x-reverse,0px),var(--parallax-y,0px),0)",
              transition:"transform 180ms ease-out",
              willChange:"transform",
            }}
          />
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.045]"
            style={{
              transform:"translate3d(var(--parallax-x-reverse,0px),var(--parallax-y-reverse,0px),0) scale(1.03)",
              transition:"transform 220ms ease-out",
              willChange:"transform",
            }}
          >
            <defs>
              <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="white"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)"/>
          </svg>
        </div>
        <div className="relative w-full px-5 sm:px-8 lg:px-12 xl:px-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div
              className="text-white"
              style={{
                transform:"translate3d(var(--parallax-x-reverse,0px),var(--parallax-y-reverse,0px),0)",
                transition:"transform 180ms ease-out",
                willChange:"transform",
              }}
            >
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full mb-5"><div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"/><span>Portal Resmi SMAN 2 Pangkalan Kuras</span></div>
              <h1 className="text-3xl lg:text-4xl font-bold leading-tight mb-4" style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Sistem Poin<br/><span style={{color:"#fbbf24"}}>Pelanggaran Siswa</span></h1>
              <p className="text-white/60 text-sm leading-relaxed mb-6 max-w-sm">Orang tua dan siswa dapat memantau catatan pelanggaran, total poin, dan status sanksi secara transparan melalui portal ini.</p>
              <div className="flex flex-wrap gap-4 text-xs text-white/55">
                {[{I:CheckCircle,l:"Tanpa perlu login"},{I:Shield,l:"Data terverifikasi"},{I:Clock,l:"Informasi real-time"}].map(({I,l})=>(
                  <span key={l} className="flex items-center gap-1.5"><I size={12} style={{color:"#fbbf24"}}/> {l}</span>
                ))}
              </div>
            </div>
            <div>
              <div
                className="bg-white rounded-2xl shadow-2xl p-7 border border-white/10"
                style={{
                  transform:"perspective(1200px) translate3d(var(--card-x,0px),var(--card-y,0px),0) rotateX(var(--tilt-x,0deg)) rotateY(var(--tilt-y,0deg))",
                  transition:"transform 140ms ease-out,box-shadow 180ms ease",
                  transformStyle:"preserve-3d",
                  willChange:"transform",
                }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center"><Search size={17} className="text-primary"/></div>
                  <div><p className="text-sm font-semibold">Cek Poin Siswa</p><p className="text-xs text-muted-foreground">Masukkan NIS untuk melihat data</p></div>
                </div>
                <form onSubmit={search} className="space-y-4">
                  <FInput label="Nomor Induk Siswa (NIS)" value={nis} onChange={e=>setNis(e.target.value)} placeholder="Contoh: 2024001" required/>
                  <button type="submit" disabled={busy} className="w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 transition-all duration-200 flex items-center gap-2 justify-center disabled:opacity-60 disabled:transform-none"><Search size={14}/> {busy?"Mencari...":"Cari Data Siswa"}</button>
                </form>
                <p className="text-center text-xs text-muted-foreground mt-4">Data dijaga kerahasiaannya · Hanya catatan terverifikasi</p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0"><svg viewBox="0 0 1440 50" className="w-full block"><path d="M0 50L480 15L960 40L1440 0V50H0Z" fill="#f5f4f0"/></svg></div>
      </section>

      {/* Info singkat */}
      <section className="py-8 bg-white/70 border-b border-border">
        <div className="w-full px-5 sm:px-8 lg:px-12 xl:px-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {l:"Tanpa perlu login",       I:Search,        c:"text-primary bg-primary/10"},
            {l:"Hanya data terverifikasi",I:Shield,        c:"text-amber-600 bg-amber-50"},
            {l:"Informasi real-time",     I:Clock,         c:"text-sky-600 bg-sky-50"},
          ].map((item,index)=>(
            <div
              key={item.l}
              data-reveal-delay={index*110}
              data-reveal-direction="scale"
              className="public-scroll-reveal bg-card rounded-xl border border-border p-4 flex items-center gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/20"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${item.c}`}><item.I size={16}/></div>
              <p className="text-sm font-medium leading-snug">{item.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Search result */}
      {result&&(
        <section key={result==="not-found"?"not-found":result.nis} id="hasil" aria-live="polite" className="public-result-shell py-10">
          <div className="max-w-2xl mx-auto px-5 space-y-4">
            <div className="public-result-heading flex items-center justify-between">
              <h2 className="font-semibold text-sm">Hasil Pencarian</h2>
              <button onClick={()=>{setResult(null);setNis("");window.scrollTo({top:0,behavior:"smooth"});}} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft size={11}/> Cari ulang</button>
            </div>
            {result==="not-found"?(
              <div className="public-result-not-found bg-card border border-red-200 rounded-2xl p-10 text-center shadow-sm">
                <div className="public-result-not-found-icon w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle size={28} className="text-red-400"/></div>
                <p className="font-semibold text-red-700">Siswa tidak ditemukan</p>
                <p className="text-sm text-red-400 mt-1">Periksa kembali NIS yang dimasukkan</p>
              </div>
            ):(()=>{
              const sanct=getSanction(result.total_poin);
              return (<>
                <div className="public-result-main-card bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                  <div className="h-1.5" style={{backgroundColor:sanct.bar}}/>
                  <div className="p-6 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="public-result-avatar w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">{result.nama[0]}</div>
                      <div>
                        <h3 className="font-bold text-lg">{result.nama}</h3>
                        <p className="text-sm text-muted-foreground">{result.kelas} · NIS <span className="font-mono">{result.nis}</span></p>
                        <Chip cls={`${sanct.bg} ${sanct.text} ${sanct.border} mt-2`}><Shield size={10}/> {result.status_kedisiplinan}</Chip>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="public-result-number text-4xl font-bold tabular-nums" style={{color:sanct.bar,fontFamily:"'JetBrains Mono',monospace"}}>{displayedPoints}</p>
                      <p className="text-xs text-muted-foreground">total poin</p>
                    </div>
                  </div>
                  <div className="px-6 pb-4">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="public-result-progress h-full rounded-full" style={{width:resultReady?`${Math.min((result.total_poin/100)*100,100)}%`:"0%",backgroundColor:sanct.bar}}/>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>0 poin</span><span>100+ poin</span></div>
                  </div>
                </div>
                <div className="public-result-history bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Riwayat Pelanggaran Terverifikasi</h4>
                    <span className="text-xs bg-muted px-2.5 py-0.5 rounded-full text-muted-foreground">{sv.length} catatan</span>
                  </div>
                  {sv.length===0?(
                    <div className="py-12 text-center"><CheckCircle size={28} className="text-emerald-400 mx-auto mb-3"/><p className="text-sm font-medium text-emerald-700">Belum ada catatan pelanggaran terverifikasi</p></div>
                  ):(
                    <div className="divide-y divide-border">
                      {sv.map((v,i)=>(
                        <div key={i} className="public-result-row px-5 py-4 flex items-start gap-4" style={{animationDelay:`${620+(i*90)}ms`}}>
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-mono text-muted-foreground flex-shrink-0 mt-0.5">{i+1}</div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div><p className="text-sm font-medium">{v.jenis_pelanggaran}</p><p className="text-xs text-muted-foreground">{v.tanggal}</p></div>
                              <p className="text-sm font-bold text-destructive flex-shrink-0">+{v.poin}</p>
                            </div>
                            <Chip cls={`${getCatCls(v.kategori||"")} mt-2`}>{v.kategori}</Chip>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>);
            })()}
          </div>
        </section>
      )}

      {/* Cara menggunakan */}
      <section className="py-16 border-t border-border">
        <div className="w-full px-5 sm:px-8 lg:px-12 xl:px-16">
          <div data-reveal-delay="20" className="public-guide-reveal public-guide-title text-center mb-10">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Panduan</p>
            <h2 className="text-2xl font-bold" style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Cara Menggunakan</h2>
            <p className="text-sm text-muted-foreground mt-2">Tiga langkah mudah untuk melihat data poin siswa</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {n:"01",t:"Siapkan NIS",d:"Nomor Induk Siswa (NIS) dapat dilihat di kartu pelajar, buku rapor, atau hubungi wali kelas.",I:BookOpen,c:"bg-primary/10 text-primary"},
              {n:"02",t:"Masukkan NIS",d:"Ketikkan NIS pada kolom pencarian di atas, lalu tekan tombol Cari Data Siswa.",I:Search,c:"bg-amber-50 text-amber-600"},
              {n:"03",t:"Lihat Hasilnya",d:"Sistem menampilkan total poin, status sanksi, dan riwayat pelanggaran yang sudah terverifikasi.",I:Eye,c:"bg-emerald-50 text-emerald-600"},
            ].map((i,index)=>(
              <div
                key={i.n}
                data-reveal-delay={80+(index*70)}
                className="public-guide-reveal public-guide-card relative bg-card rounded-2xl border border-border p-6"
              >
                <span className="absolute top-5 right-5 text-5xl font-bold text-primary/5 select-none" style={{fontFamily:"'JetBrains Mono',monospace"}}>{i.n}</span>
                <div className={`public-guide-icon w-11 h-11 ${i.c} rounded-xl flex items-center justify-center mb-4`}><i.I size={20}/></div>
                <h3 className="font-semibold mb-2">{i.t}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{i.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tentang sistem */}
      <section className="py-12 border-t border-border bg-white/50">
        <div className="w-full px-5 sm:px-8 lg:px-12 xl:px-16">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div data-reveal-direction="left" className="public-scroll-reveal">
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Tentang Sistem</p>
              <h2 className="text-2xl font-bold mb-4" style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Sistem Pengelolaan Tata Tertib Sekolah</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">Sistem Poin Pelanggaran Siswa SMAN 2 Pangkalan Kuras dirancang untuk menciptakan tata tertib yang transparan, terukur, dan berkeadilan. Setiap pelanggaran dicatat oleh Guru Piket, diverifikasi oleh Admin, dan dapat dipantau langsung oleh orang tua.</p>
              <div className="grid grid-cols-2 gap-3">
                {[{t:"Transparan",d:"Orang tua dapat memantau langsung"},{t:"Terverifikasi",d:"Setiap catatan melalui proses verifikasi"},{t:"Terstruktur",d:"Sanksi berdasarkan akumulasi poin"},{t:"Terdokumentasi",d:"Laporan resmi dapat dicetak kapan saja"}].map((i,index)=>(
                  <div
                    key={i.t}
                    data-reveal-delay={180+(index*80)}
                    data-reveal-direction="scale"
                    className="public-scroll-reveal public-hover-grow bg-card rounded-xl border border-border p-3 hover:border-primary/30"
                  >
                    <div className="flex items-center gap-2 mb-1"><CheckCircle size={12} className="text-primary flex-shrink-0"/><p className="text-xs font-semibold">{i.t}</p></div>
                    <p className="text-[11px] text-muted-foreground leading-snug">{i.d}</p>
                  </div>
                ))}
              </div>
            </div>
            <div data-reveal-direction="right" data-reveal-delay="130" className="public-scroll-reveal space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ketentuan Sanksi</p>
              {[{r:"1–19 poin",s:"Peringatan Lisan",c:"bg-sky-50 border-sky-200 text-sky-700",bar:"bg-sky-400"},{r:"20–49 poin",s:"Surat Peringatan 1",c:"bg-amber-50 border-amber-200 text-amber-700",bar:"bg-amber-400"},{r:"50–74 poin",s:"SP 2 + Panggilan Orang Tua",c:"bg-orange-50 border-orange-200 text-orange-700",bar:"bg-orange-400"},{r:"75–99 poin",s:"Pembinaan Khusus",c:"bg-red-50 border-red-200 text-red-700",bar:"bg-red-400"},{r:"≥ 100 poin",s:"Tindakan Disiplin Sekolah",c:"bg-red-100 border-red-400 text-red-900",bar:"bg-red-700"}].map((i,index)=>(
                <div
                  key={i.r}
                  data-reveal-delay={180+(index*75)}
                  data-reveal-direction="right"
                  className={`public-scroll-reveal public-hover-grow flex items-center gap-3 border rounded-xl px-4 py-3 ${i.c}`}
                >
                  <div className={`w-1 h-8 rounded-full flex-shrink-0 ${i.bar}`}/>
                  <div className="flex-1"><p className="text-xs font-semibold">{i.s}</p></div>
                  <span className="text-[10px] font-mono font-bold opacity-70">{i.r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10" style={{background:"#1a3528"}}>
        <div className="w-full px-5 sm:px-8 lg:px-12 xl:px-16">
          <div data-reveal-direction="scale" className="public-scroll-reveal grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10"><ImageWithFallback src={schoolLogo} alt="Logo" className="w-full h-full object-contain"/></div>
                <p className="text-sm font-bold text-white">SMAN 2 Pangkalan Kuras</p>
              </div>
              <p className="text-xs text-white/45 leading-relaxed">Sistem Pengelolaan Poin Pelanggaran Siswa — alat bantu transparansi tata tertib sekolah berbasis digital.</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-white uppercase tracking-wide mb-3">Kontak Sekolah</p>
              <div className="space-y-1.5 text-xs text-white/45">
                <p>Jl. Lintas Timur KM. 102 Terantang Manuk</p>
                <p>Kab. Pelalawan, Riau 28382</p>
                <p className="mt-2">NSS: 301040605018 · NPSN: 10494082</p>
                <p>Email: pklkuras@yahoo.co.id</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-white uppercase tracking-wide mb-3">Jam Pelayanan</p>
              <div className="space-y-1.5 text-xs text-white/45">
                <p>Senin – Jumat: 07.00 – 15.00 WIB</p>
                <p>Sabtu: 07.00 – 12.00 WIB</p>
                <p className="mt-2 font-semibold text-white/60">Akreditasi: A</p>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-5 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-white/25">
            <p>© 2026 | Designed & Developed by @Rw0daa.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
