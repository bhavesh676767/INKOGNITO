import { render } from 'preact';
import { HomePage } from './homePageBundle.jsx';

const root = document.getElementById('root');

if (root) {
  render(<HomePage />, root);
}

