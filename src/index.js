import 'codemirror/lib/codemirror.css';
import './snipplet.css';
import 'codemirror/mode/javascript/javascript';

import compilers from './compilers';
import snipplets from './snipplets';
import showError from './showError';
import markdown from './markdown';

document.addEventListener('DOMContentLoaded', () =>
  markdown()
    .then(compilers)
    .then(snipplets)
    .catch(showError)
);
