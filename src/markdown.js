import marked from 'marked';

import prettify from './prettify';

const { map, forEach } = Array.prototype;

export default function markdown() {
  return Promise.resolve().then(() =>
    document.querySelectorAll('textarea.markdown')::map(el => {
      const md = el.textContent;
      const html = marked(md);
      const div = document.createElement('div');
      div.className = 'container';
      div.innerHTML = html;

      // Prettify
      const codeEls = div.getElementsByTagName('code');
      codeEls::forEach(codeEl => {
        const lang = codeEl.className.split('-')[1];
        // eslint-disable-next-line no-param-reassign
        codeEl.innerHTML = prettify(codeEl.innerHTML, lang);
      });

      // Style tables
      const tableEls = div.getElementsByTagName('table');
      tableEls::forEach(tableEl => {
        // eslint-disable-next-line no-param-reassign
        tableEl.className = 'table table-striped table-bordered';
      });

      el.parentNode.replaceChild(div, el);
    })
  );
}
