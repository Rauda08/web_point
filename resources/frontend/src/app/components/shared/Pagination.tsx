import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const PAGE_SIZE = 10;
export function usePagination<T>(items: T[], resetKey?: unknown) {
  const [page, setPage] = useState(1);
  // reset to page 1 whenever the data set changes (filter, search)
  const prevKey = useRef(resetKey);
  if (prevKey.current !== resetKey) { prevKey.current = resetKey; if (page !== 1) setPage(1); }
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const slice      = items.slice((safePage-1)*PAGE_SIZE, safePage*PAGE_SIZE);
  return { page: safePage, setPage, totalPages, slice, total: items.length };
}

export function Pagination({ page, totalPages, total, onPage }: {
  page: number; totalPages: number; total: number; onPage:(p:number)=>void;
}) {
  if (totalPages <= 1) return null;
  const from = (page-1)*PAGE_SIZE + 1;
  const to   = Math.min(page*PAGE_SIZE, total);

  // build page number window: always show first, last, current ±1, with ellipsis
  const pages: (number|"…")[] = [];
  const add = (n: number) => { if (!pages.includes(n)) pages.push(n); };
  add(1); add(totalPages);
  for (let i = Math.max(1, page-1); i <= Math.min(totalPages, page+1); i++) add(i);
  const sorted = (pages.filter(p=>typeof p==="number") as number[]).sort((a,b)=>a-b);
  const withDots: (number|"…")[] = [];
  sorted.forEach((n,i) => {
    if (i>0 && n-(sorted[i-1] as number)>1) withDots.push("…");
    withDots.push(n);
  });

  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-t border-border bg-muted/20">
      <p className="text-xs text-muted-foreground tabular-nums">
        Menampilkan <span className="font-semibold text-foreground">{from}–{to}</span> dari <span className="font-semibold text-foreground">{total}</span> data
      </p>
      <div className="flex items-center gap-1">
        <button disabled={page<=1} onClick={()=>onPage(page-1)}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={13}/>
        </button>
        {withDots.map((p,i) => p==="…"
          ? <span key={`d${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-muted-foreground">…</span>
          : <button key={p} onClick={()=>onPage(p as number)}
              className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold border transition-colors ${page===p?"bg-primary text-primary-foreground border-primary":"border-border text-muted-foreground hover:bg-muted/60"}`}>
              {p}
            </button>
        )}
        <button disabled={page>=totalPages} onClick={()=>onPage(page+1)}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronRight size={13}/>
        </button>
      </div>
    </div>
  );
}

