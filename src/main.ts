import './style.css';
import { Game } from './GameScreen';
import { preloadData } from './preload';

document.addEventListener('DOMContentLoaded', async () => {

  // Show simple loading spinner in #app
  const app = document.querySelector('#app');
  if (app) {
    app.innerHTML = '<h3>Loading Chemistry...</h3>';
  }

  try {
    // Download and unpack the data.zip file
    const reactionData = await preloadData();

    const game = new Game('#app', reactionData);
    game.init();

  } catch (error) {
    console.error('Error loading data:', error);
  }
});