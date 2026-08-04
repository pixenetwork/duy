const pixelRootElement = document.getElementById('root');
if (!pixelRootElement) throw new Error('Pixel UI root element is missing');

ReactDOM.createRoot(pixelRootElement).render(
  <React.StrictMode>
    <PixelUI.App />
  </React.StrictMode>,
);
