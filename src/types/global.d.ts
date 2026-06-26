// Type declarations for CSS module imports and other non-TS imports
declare module '*.css' {
  const styles: { [className: string]: string };
  export default styles;
}

declare module 'date-fns/locale/pt-BR' {
  const ptBR: object;
  export { ptBR };
}

declare module 'react-big-calendar/lib/css/react-big-calendar.css' {
  const styles: { [className: string]: string };
  export default styles;
}
