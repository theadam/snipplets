import 'codemirror/lib/codemirror.css';
import './snipplet.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/jsx/jsx';

import compilers from './compilers';
import responders from './responders';
import snipplets from './snipplets';
import showError from './showError';
import markdown from './markdown';

document.addEventListener('DOMContentLoaded', () =>
  Promise.all([
    compilers(),
    markdown(),
  ])
  .then(([comps]) =>
    responders(comps)
    .then(resps =>
      snipplets(comps, resps)
    )
  )
  .catch(showError)
);
