import { createContext, useContext } from 'react'
import imported from '../data/portfolio.json'
import { works } from './layout'
export type PortfolioCard = { id:string; title:string; sub:string; tags:string[]; src:string; href?:string }
export const portfolio:PortfolioCard[] = [...works.map((w,i)=>({ ...w,id:`original-${i}`,tags:i===1?['BRANDING']:i===8?['BRANDING','CONTENT']:[w.category]})),...imported]
export const galleryTabs=['ALL','BRANDING','DIGITAL','CAMPAIGNS','CONTENT']
export const filterPortfolio=(tab:string)=>tab==='ALL'?portfolio:portfolio.filter(p=>p.tags.includes(tab))
export function galleryMetrics(count:number,mobile:boolean){
  const cards:{x:number;y:number;w:number;h:number}[]=[]
  let i=0,column=0,x=mobile?22:40
  while(i<count){
    const pattern=column%5,rows=mobile?2:[3,2,2,2,1][pattern],w=mobile?176:[292,278,250,264,396][pattern]
    const heights=mobile?[239,265]:rows===3?[205,218,188]:rows===2?[pattern===1?272:290,pattern===1?347:329]:[627]
    let y=mobile?307:282
    for(let row=0;row<rows&&i<count;row++,i++){cards.push({x,y,w,h:heights[row]});y+=heights[row]+(mobile?12:8)}
    x+=w+(mobile?14:8);column++
  }
  const width=mobile?390:1600,travel=Math.max(0,x-width+(mobile?22:40))
  return {cards,travel,deckTop:mobile?307:282,deckHeight:mobile?516:627,totalWidth:x}
}
export const GalleryContext=createContext({filter:'ALL',setFilter:(_filter:string)=>{}})
export const useGallery=()=>useContext(GalleryContext)
