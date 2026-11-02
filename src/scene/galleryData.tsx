import { createContext, useContext } from 'react'
import imported from '../data/portfolio.json'
import { works } from './layout'
export type PortfolioCard = { id:string; title:string; sub:string; tags:string[]; src:string; href?:string }
export const portfolio:PortfolioCard[] = [...works.map((w,i)=>({ ...w,id:`original-${i}`,tags:i===1?['BRANDING']:i===8?['BRANDING','CONTENT']:[w.category]})),...imported]
export const galleryTabs=['ALL','BRANDING','DIGITAL','CAMPAIGNS','CONTENT']
export const filterPortfolio=(tab:string)=>tab==='ALL'?portfolio:portfolio.filter(p=>p.tags.includes(tab))
// The rail shows a first selection (about two columns past the screen, so
// there is a short scroll) and ends in a full-height "View all" block; the
// full list opens in an overlay instead of scrolling on forever.
export const RAIL_CARDS = 15
export const hasMore = (total:number) => total > RAIL_CARDS + 1
export const railCount = (total:number) => hasMore(total) ? RAIL_CARDS + 1 : total
export function galleryMetrics(count:number,mobile:boolean,tail=false){
  const cards:{x:number;y:number;w:number;h:number}[]=[]
  let i=0,column=0,x=mobile?22:40
  const body=tail?count-1:count
  while(i<body){
    const pattern=column%5,rows=mobile?2:[3,2,2,2,1][pattern],w=mobile?176:[292,278,250,264,396][pattern]
    const heights=mobile?[239,265]:rows===3?[205,218,188]:rows===2?[pattern===1?272:290,pattern===1?347:329]:[627]
    let y=mobile?307:282
    for(let row=0;row<rows&&i<body;row++,i++){cards.push({x,y,w,h:heights[row]});y+=heights[row]+(mobile?12:8)}
    x+=w+(mobile?14:8);column++
  }
  if(tail){const w=mobile?200:340;cards.push({x,y:mobile?307:282,w,h:mobile?516:627});x+=w+(mobile?14:8)}
  const width=mobile?390:1600,travel=Math.max(0,x-width+(mobile?22:40))
  return {cards,travel,deckTop:mobile?307:282,deckHeight:mobile?516:627,totalWidth:x}
}
export const GalleryContext=createContext({filter:'ALL',setFilter:(_filter:string)=>{},openAll:()=>{}})
export const useGallery=()=>useContext(GalleryContext)
