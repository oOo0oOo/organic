export function showLoadingScreen() {
  const app = document.querySelector<HTMLDivElement>('#app')!;
  app.innerHTML = `
    <div id="loading-screen">
      <h1>Loading...</h1>
      <div id="progress-bar-container">
        <div id="progress-bar"></div>
      </div>
    </div>
  `;
}

export function updateProgressBar(progress: number) {
  const progressBar = document.querySelector<HTMLDivElement>('#progress-bar');
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }
}

export function hideLoadingScreen() {
  const loadingScreen = document.querySelector<HTMLDivElement>('#loading-screen');
  if (loadingScreen) {
    loadingScreen.style.display = 'none';
  }
}