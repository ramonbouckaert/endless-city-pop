// Vite serves a file imported with ?url and gives its URL.
declare module '*?url' {
  const url: string;
  export default url;
}
