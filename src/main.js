import { render } from 'preact';
import { HomeScene } from './scenes/homeScene.js';
import './styles/global.css';
import './styles/chalkTheme.css';

const root = document.getElementById('root');

if (root) {
  render(<HomeScene />, root);
}

