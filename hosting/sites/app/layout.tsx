import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Touchline · Draft Duel',description:'One friend. Eleven picks. One winner. A free multiplayer football draft game. Join with a room code, no account needed.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>;}
